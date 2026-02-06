import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { AGENDA_PLANNER_SYSTEM_PROMPT, buildPlanDayPrompt } from '@/ai/prompts/agendaPrompts';

// Force dynamic to avoid static generation issues
export const dynamic = 'force-dynamic';

const planDayInputSchema = z.object({
    date: z.string().optional(), // YYYY-MM-DD, default today
    mode: z.enum(['first_time', 'regenerate', 'fill_gaps']).default('first_time'),
    user_id: z.string().uuid(),
    timezone: z.string().default('America/Sao_Paulo'),
});

const aiBlockSchema = z.object({
    title: z.string(),
    category: z.enum(['work', 'study', 'health', 'leisure', 'admin', 'sleep', 'meal', 'commute', 'fixed']),
    start_time: z.string().regex(/^\d{2}:\d{2}$/),
    end_time: z.string().regex(/^\d{2}:\d{2}$/),
    suggested_reason: z.string().optional(),
});

const aiResponseSchema = z.object({
    blocks: z.array(aiBlockSchema),
    summary: z.string(),
});

function getDayOfWeek(dateStr: string): number {
    const date = new Date(dateStr + 'T12:00:00');
    return date.getDay();
}

function timeToDatetime(dateStr: string, timeStr: string, timezone: string): string {
    // Create datetime in the specified timezone
    return `${dateStr}T${timeStr}:00`;
}

export async function POST(request: NextRequest) {
    try {
        // Create clients inside handler to avoid build-time execution
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

        const body = await request.json();
        const input = planDayInputSchema.parse(body);

        // Default to today if no date provided
        const today = new Date();
        const dateStr = input.date || today.toISOString().split('T')[0];
        const dayOfWeek = getDayOfWeek(dateStr);

        // 1. Get or create daily_plan
        let { data: existingPlan } = await supabase
            .from('daily_plan')
            .select('*')
            .eq('user_id', input.user_id)
            .eq('plan_date', dateStr)
            .single();

        let planId: string;

        if (!existingPlan) {
            const { data: newPlan, error: planError } = await supabase
                .from('daily_plan')
                .insert({
                    user_id: input.user_id,
                    plan_date: dateStr,
                    timezone: input.timezone,
                    status: 'draft',
                })
                .select()
                .single();

            if (planError) throw planError;
            planId = newPlan.id;
        } else {
            planId = existingPlan.id;
        }

        // 2. Get fixed_blocks for this day of week
        const { data: fixedBlocks } = await supabase
            .from('fixed_blocks')
            .select('*')
            .eq('user_id', input.user_id)
            .eq('day_of_week', dayOfWeek)
            .eq('is_active', true);

        // 3. Get existing daily_blocks for this plan
        const { data: existingBlocks } = await supabase
            .from('daily_blocks')
            .select('*')
            .eq('plan_id', planId)
            .order('start_datetime', { ascending: true });

        // 4. Get health profile
        const { data: healthProfile } = await supabase
            .from('health_profile')
            .select('*')
            .eq('user_id', input.user_id)
            .single();

        // 5. Copy fixed blocks to daily_blocks if not already there
        const fixedBlockIds = (existingBlocks || [])
            .filter(b => b.source === 'fixed')
            .map(b => b.meta?.fixed_block_id);

        const newFixedBlocks = (fixedBlocks || []).filter(
            fb => !fixedBlockIds.includes(fb.id)
        );

        if (newFixedBlocks.length > 0) {
            const fixedBlocksToInsert = newFixedBlocks.map((fb, idx) => ({
                plan_id: planId,
                user_id: input.user_id,
                title: fb.title,
                category: fb.category,
                start_datetime: timeToDatetime(dateStr, fb.start_time, input.timezone),
                end_datetime: timeToDatetime(dateStr, fb.end_time, input.timezone),
                source: 'fixed' as const,
                order_index: idx,
                meta: {
                    fixed_block_id: fb.id,
                    location: fb.location,
                    notes: fb.notes,
                },
            }));

            await supabase.from('daily_blocks').insert(fixedBlocksToInsert);
        }

        // 6. Prepare context for AI
        const allFixedForContext = (fixedBlocks || []).map(fb => ({
            title: fb.title,
            start: fb.start_time,
            end: fb.end_time,
            category: fb.category,
        }));

        const allExistingForContext = (existingBlocks || []).map(eb => ({
            title: eb.title,
            start: new Date(eb.start_datetime).toTimeString().slice(0, 5),
            end: new Date(eb.end_datetime).toTimeString().slice(0, 5),
            source: eb.source,
        }));

        // 7. If mode is regenerate, delete AI blocks that are not done
        if (input.mode === 'regenerate') {
            await supabase
                .from('daily_blocks')
                .delete()
                .eq('plan_id', planId)
                .eq('source', 'ai')
                .eq('is_done', false);
        }

        // 8. Generate AI suggestions
        const prompt = buildPlanDayPrompt({
            date: dateStr,
            dayOfWeek,
            fixedBlocks: allFixedForContext,
            existingBlocks: allExistingForContext,
            healthProfile: healthProfile ? {
                goal: healthProfile.goal,
                wake_time: healthProfile.wake_time,
                sleep_time: healthProfile.sleep_time,
                dietary_preferences: healthProfile.dietary_preferences,
            } : undefined,
            mode: input.mode,
        });

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        console.log('Generating plan with Gemini 2.0 Flash...');

        const result = await model.generateContent({
            contents: [
                { role: 'user', parts: [{ text: AGENDA_PLANNER_SYSTEM_PROMPT }] },
                { role: 'model', parts: [{ text: 'Entendido. Aguardo o contexto do dia para gerar o plano.' }] },
                { role: 'user', parts: [{ text: prompt }] },
            ],
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.7,
            },
        });

        const responseText = result.response.text();
        let aiBlocks: z.infer<typeof aiResponseSchema>;

        try {
            aiBlocks = aiResponseSchema.parse(JSON.parse(responseText));
        } catch (parseError) {
            console.error('AI response parse error:', parseError);
            aiBlocks = { blocks: [], summary: 'Não foi possível gerar sugestões.' };
        }

        // 9. Insert AI-generated blocks
        if (aiBlocks.blocks.length > 0) {
            // Get current max order_index
            const { data: currentBlocks } = await supabase
                .from('daily_blocks')
                .select('order_index')
                .eq('plan_id', planId)
                .order('order_index', { ascending: false })
                .limit(1);

            let orderIndex = (currentBlocks?.[0]?.order_index ?? -1) + 1;

            const aiBlocksToInsert = aiBlocks.blocks.map(block => ({
                plan_id: planId,
                user_id: input.user_id,
                title: block.title,
                category: block.category,
                start_datetime: timeToDatetime(dateStr, block.start_time, input.timezone),
                end_datetime: timeToDatetime(dateStr, block.end_time, input.timezone),
                source: 'ai' as const,
                order_index: orderIndex++,
                meta: {
                    suggested_reason: block.suggested_reason,
                    created_via: 'plan_day',
                },
            }));

            await supabase.from('daily_blocks').insert(aiBlocksToInsert);
        }

        // 10. Update plan status to active
        await supabase
            .from('daily_plan')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', planId);

        // 11. Fetch final state
        const { data: finalBlocks } = await supabase
            .from('daily_blocks')
            .select('*')
            .eq('plan_id', planId)
            .order('start_datetime', { ascending: true });

        return NextResponse.json({
            success: true,
            plan_id: planId,
            date: dateStr,
            blocks: finalBlocks,
            ai_summary: aiBlocks.summary,
            blocks_count: {
                total: finalBlocks?.length || 0,
                fixed: finalBlocks?.filter(b => b.source === 'fixed').length || 0,
                ai: finalBlocks?.filter(b => b.source === 'ai').length || 0,
                manual: finalBlocks?.filter(b => b.source === 'manual').length || 0,
            },
        });

    } catch (error) {
        console.error('Plan day error:', error);
        return NextResponse.json(
            { error: 'Failed to generate daily plan', details: String(error) },
            { status: 500 }
        );
    }
}
