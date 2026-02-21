import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { ASSISTANT_SYSTEM_PROMPT } from '@/ai/prompts/assistantSystemPrompt';
import { AssistantActionsAIResponseSchema, AssistantActionsAIResponse } from '@/ai/schemas/aiSchemas';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Fallback response when AI fails
const getFallbackResponse = (errorType?: string): AssistantActionsAIResponse => ({
    message_to_user: errorType === 'parse_error'
        ? "Desculpe, recebi uma resposta inválida. Pode tentar novamente?"
        : errorType === 'api_error'
            ? "Desculpe, estou com problemas de conexão. Tente novamente em alguns segundos."
            : "Desculpe, tive um problema ao processar seu pedido. Pode reformular?",
    actions: [{ type: 'ask_user', questions: ['O que você gostaria de fazer?'] }]
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { user_id, message, conversation_history = [] } = body;

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'Configuração ausente: GEMINI_API_KEY não encontrada.' }, { status: 500 });
        }
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return NextResponse.json({ error: 'Configuração ausente: SUPABASE_SERVICE_ROLE_KEY não encontrada.' }, { status: 500 });
        }

        if (!user_id || !message) {
            return NextResponse.json({ error: 'user_id and message are required' }, { status: 400 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const nowISO = new Date().toISOString();
        const today = nowISO.split('T')[0];
        const dayOfWeek = new Date().getDay();

        // Load user context
        const [profileRes, fixedBlocksRes, todayPlanRes, healthProfileRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user_id).single(),
            supabase.from('fixed_blocks').select('*').eq('user_id', user_id).eq('is_active', true),
            supabase.from('daily_plan').select('id').eq('user_id', user_id).eq('plan_date', today).single(),
            supabase.from('health_profile').select('*').eq('user_id', user_id).single(),
        ]);

        const userName = profileRes.data?.full_name?.split(' ')[0] || '';
        const timezone = 'America/Sao_Paulo';

        // Get today's blocks if plan exists
        let todayBlocks: any[] = [];
        if (todayPlanRes.data?.id) {
            const { data } = await supabase
                .from('daily_blocks')
                .select('*')
                .eq('plan_id', todayPlanRes.data.id)
                .order('start_datetime', { ascending: true });
            todayBlocks = data || [];
        }

        // Build context for AI
        const contextPrompt = `
CONTEXTO ATUAL:
- user_name: "${userName}"
- timezone: "${timezone}"
- now_iso: "${nowISO}"
- today: "${today}"
- day_of_week: ${dayOfWeek}

BLOCOS FIXOS DA SEMANA:
${JSON.stringify(fixedBlocksRes.data || [], null, 2)}

BLOCOS DE HOJE:
${JSON.stringify(todayBlocks.map(b => ({
            id: b.id,
            title: b.title,
            category: b.category,
            start: b.start_datetime,
            end: b.end_datetime,
            source: b.source,
            is_done: b.is_done,
            is_skipped: b.is_skipped,
        })), null, 2)}

${healthProfileRes.data ? `PERFIL DE SAÚDE:
${JSON.stringify(healthProfileRes.data, null, 2)}` : ''}

HISTÓRICO DE CONVERSA:
${conversation_history.slice(-5).map((m: any) => `${m.role}: ${m.content}`).join('\n')}

MENSAGEM DO USUÁRIO:
${message}
`;

        // Generate response with Gemini
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: { responseMimeType: 'application/json' }
        });

        const prompt = `${ASSISTANT_SYSTEM_PROMPT}\n\n${contextPrompt}`;

        let aiResponse: AssistantActionsAIResponse;
        let retryCount = 0;
        const maxRetries = 2;

        while (retryCount <= maxRetries) {
            try {
                const result = await model.generateContent(prompt);
                const responseText = result.response.text();

                // Try to parse JSON
                let parsed;
                try {
                    const jsonStr = responseText.replace(/```json|```/g, '').trim();
                    parsed = JSON.parse(jsonStr);
                } catch {
                    // Try to extract JSON from text
                    const match = responseText.match(/\{[\s\S]*\}/);
                    if (match) {
                        parsed = JSON.parse(match[0]);
                    } else {
                        throw new Error('No JSON found in response');
                    }
                }

                // Validate with Zod
                aiResponse = AssistantActionsAIResponseSchema.parse(parsed);
                break;

            } catch (parseError) {
                retryCount++;
                if (retryCount > maxRetries) {
                    console.error('Max retries reached, using fallback');
                    aiResponse = getFallbackResponse('parse_error');
                    break;
                }
                // Retry with correction prompt
                console.warn(`Retry ${retryCount}: AI returned invalid JSON`);
            }
        }

        // Execute actions
        const executedActions: any[] = [];

        for (const action of aiResponse!.actions) {
            try {
                switch (action.type) {
                    case 'create_daily_block': {
                        // Get or create today's plan
                        let planId = todayPlanRes.data?.id;
                        if (!planId) {
                            const { data: newPlan } = await supabase
                                .from('daily_plan')
                                .insert({ user_id, plan_date: today, timezone, status: 'active' })
                                .select()
                                .single();
                            planId = newPlan?.id;
                        }

                        if (planId) {
                            const { persistSingleBlock } = await import('@/lib/persistDailyBlocks');
                            const result = await persistSingleBlock(
                                supabase, planId, user_id, today,
                                {
                                    title: action.title,
                                    category: action.category,
                                    start_datetime: action.start_datetime,
                                    end_datetime: action.end_datetime,
                                    source: 'manual',
                                    meta: action.meta || {},
                                }
                            );
                            executedActions.push({ type: action.type, success: true, data: result.block });
                        }
                        break;
                    }

                    case 'update_daily_block': {
                        const { error } = await supabase
                            .from('daily_blocks')
                            .update({ ...action.updates, updated_at: nowISO })
                            .eq('id', action.block_id)
                            .eq('user_id', user_id);

                        executedActions.push({ type: action.type, success: !error });
                        break;
                    }

                    case 'delete_daily_block': {
                        const { error } = await supabase
                            .from('daily_blocks')
                            .delete()
                            .eq('id', action.block_id)
                            .eq('user_id', user_id)
                            .neq('source', 'fixed');

                        executedActions.push({ type: action.type, success: !error });
                        break;
                    }

                    case 'create_fixed_block': {
                        const { data, error } = await supabase
                            .from('fixed_blocks')
                            .insert({
                                user_id,
                                title: action.title,
                                category: action.category,
                                day_of_week: action.day_of_week,
                                start_time: action.start_time,
                                end_time: action.end_time,
                                is_active: true,
                            })
                            .select()
                            .single();

                        executedActions.push({ type: action.type, success: !error, data });
                        break;
                    }

                    case 'create_shopping_list': {
                        const { data, error } = await supabase
                            .from('shopping_list')
                            .insert({
                                user_id,
                                title: action.title,
                                items: action.items.map(i => ({ ...i, checked: false })),
                                source: 'ai',
                            })
                            .select()
                            .single();

                        executedActions.push({ type: action.type, success: !error, data });
                        break;
                    }

                    case 'update_health_profile': {
                        const { error } = await supabase
                            .from('health_profile')
                            .upsert({
                                user_id,
                                ...action.updates,
                                updated_at: nowISO,
                            });

                        executedActions.push({ type: action.type, success: !error });
                        break;
                    }

                    case 'mark_done': {
                        const { error } = await supabase
                            .from('daily_blocks')
                            .update({ is_done: true, done_at: nowISO, updated_at: nowISO })
                            .eq('id', action.block_id)
                            .eq('user_id', user_id);

                        executedActions.push({ type: action.type, success: !error, block_id: action.block_id });
                        break;
                    }

                    case 'mark_skip': {
                        const { error } = await supabase
                            .from('daily_blocks')
                            .update({
                                is_skipped: true,
                                skip_reason: action.skip_reason || 'Pulado pelo usuário',
                                updated_at: nowISO
                            })
                            .eq('id', action.block_id)
                            .eq('user_id', user_id);

                        executedActions.push({ type: action.type, success: !error, block_id: action.block_id });
                        break;
                    }

                    case 'trigger_replan': {
                        // Call the replan API
                        try {
                            await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai/agenda/replan-day`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    user_id,
                                    signal: 'manual_request',
                                    user_note: action.reason,
                                }),
                            });
                            executedActions.push({ type: action.type, success: true, reason: action.reason });
                        } catch {
                            executedActions.push({ type: action.type, success: false, error: 'Failed to trigger replan' });
                        }
                        break;
                    }

                    case 'plan_day': {
                        // Call the plan-day API
                        try {
                            await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai/agenda/plan-day`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    user_id,
                                    date: action.date || today,
                                    mode: action.mode || 'first_time',
                                }),
                            });
                            executedActions.push({ type: action.type, success: true });
                        } catch {
                            executedActions.push({ type: action.type, success: false, error: 'Failed to generate plan' });
                        }
                        break;
                    }

                    case 'ask_user':
                    case 'generate_daily_plan':
                        // These are signals for the frontend to handle
                        executedActions.push({ ...action });
                        break;

                    default:
                        executedActions.push({ type: (action as any).type, success: false, error: 'Unknown action type' });
                }
            } catch (actionError: any) {
                executedActions.push({ type: action.type, success: false, error: actionError.message });
            }
        }

        return NextResponse.json({
            message_to_user: aiResponse!.message_to_user,
            actions: aiResponse!.actions,
            executed_actions: executedActions,
        });

    } catch (error: any) {
        console.error('Assistant actions error:', error);
        const fallback = getFallbackResponse('api_error');
        return NextResponse.json({
            message_to_user: fallback.message_to_user,
            actions: fallback.actions,
            error: error.message
        }, { status: 500 });
    }
}
