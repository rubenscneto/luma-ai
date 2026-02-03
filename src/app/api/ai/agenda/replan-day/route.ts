import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { AGENDA_REPLANNER_SYSTEM_PROMPT, buildReplanPrompt } from '@/ai/prompts/agendaPrompts';

// Force dynamic to avoid static generation issues
export const dynamic = 'force-dynamic';

// Lazy initialization to avoid build-time execution
const getSupabase = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const getGenAI = () => new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const replanInputSchema = z.object({
    date: z.string().optional(),
    now: z.string().optional(),
    signal: z.enum(['late', 'done', 'skip', 'manual_request']),
    user_id: z.string().uuid(),
    user_note: z.string().optional(),
    block_id: z.string().uuid().optional(), // For done/skip signals
});

const aiAdjustmentSchema = z.object({
    block_id: z.string(),
    action: z.enum(['move', 'shorten', 'postpone_tomorrow', 'mark_optional']),
    new_start: z.string().optional(),
    new_end: z.string().optional(),
    reason: z.string(),
});

const aiReplanResponseSchema = z.object({
    adjustments: z.array(aiAdjustmentSchema),
    message_to_user: z.string(),
    could_not_fit: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
    try {
        const supabase = getSupabase();
        const genAI = getGenAI();

        const body = await request.json();
        const input = replanInputSchema.parse(body);

        const now = input.now ? new Date(input.now) : new Date();
        const dateStr = input.date || now.toISOString().split('T')[0];
        const currentTimeStr = now.toTimeString().slice(0, 5);

        // 1. Get the daily plan for today
        const { data: plan } = await supabase
            .from('daily_plan')
            .select('*')
            .eq('user_id', input.user_id)
            .eq('plan_date', dateStr)
            .single();

        if (!plan) {
            return NextResponse.json(
                { error: 'No plan found for this date. Use plan-day first.' },
                { status: 404 }
            );
        }

        // 2. If signal is done or skip, update the specific block
        if ((input.signal === 'done' || input.signal === 'skip') && input.block_id) {
            if (input.signal === 'done') {
                await supabase
                    .from('daily_blocks')
                    .update({
                        is_done: true,
                        done_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', input.block_id);
            } else {
                await supabase
                    .from('daily_blocks')
                    .update({
                        is_skipped: true,
                        skip_reason: input.user_note || 'Pulado pelo usuário',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', input.block_id);
            }
        }

        // 3. Get all blocks for today
        const { data: allBlocks } = await supabase
            .from('daily_blocks')
            .select('*')
            .eq('plan_id', plan.id)
            .order('start_datetime', { ascending: true });

        if (!allBlocks || allBlocks.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'Não há blocos para replanejar.',
                blocks: [],
            });
        }

        // 4. Filter pending blocks (not done, not skipped, starts >= now - 30min tolerance)
        const toleranceMs = 30 * 60 * 1000; // 30 min tolerance
        const pendingBlocks = allBlocks.filter(block => {
            const startTime = new Date(block.start_datetime).getTime();
            return !block.is_done && !block.is_skipped && startTime >= (now.getTime() - toleranceMs);
        });

        // 5. Count statistics
        const completedToday = allBlocks.filter(b => b.is_done).length;
        const skippedToday = allBlocks.filter(b => b.is_skipped).length;

        // 6. If no pending blocks or simple done/skip, just return current state
        if (pendingBlocks.length === 0 || (input.signal === 'done' && pendingBlocks.length <= 1)) {
            const { data: updatedBlocks } = await supabase
                .from('daily_blocks')
                .select('*')
                .eq('plan_id', plan.id)
                .order('start_datetime', { ascending: true });

            return NextResponse.json({
                success: true,
                message: input.signal === 'done'
                    ? 'Ótimo trabalho! Continue assim.'
                    : 'Nenhum ajuste necessário.',
                blocks: updatedBlocks,
                stats: { completed: completedToday, skipped: skippedToday },
            });
        }

        // 7. For late or manual_request, use AI to replan
        if (input.signal === 'late' || input.signal === 'manual_request') {
            const prompt = buildReplanPrompt({
                currentTime: currentTimeStr,
                signal: input.signal,
                pendingBlocks: pendingBlocks.map(b => ({
                    id: b.id,
                    title: b.title,
                    start: new Date(b.start_datetime).toTimeString().slice(0, 5),
                    end: new Date(b.end_datetime).toTimeString().slice(0, 5),
                    locked: b.meta?.locked === true,
                    source: b.source,
                })),
                completedToday,
                skippedToday,
                userNote: input.user_note,
            });

            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
            const result = await model.generateContent({
                contents: [
                    { role: 'user', parts: [{ text: AGENDA_REPLANNER_SYSTEM_PROMPT }] },
                    { role: 'model', parts: [{ text: 'Entendido. Aguardo a situação para replanejar.' }] },
                    { role: 'user', parts: [{ text: prompt }] },
                ],
                generationConfig: {
                    responseMimeType: 'application/json',
                    temperature: 0.5,
                },
            });

            const responseText = result.response.text();
            let aiResponse: z.infer<typeof aiReplanResponseSchema>;

            try {
                aiResponse = aiReplanResponseSchema.parse(JSON.parse(responseText));
            } catch (parseError) {
                console.error('AI replan response parse error:', parseError);
                aiResponse = {
                    adjustments: [],
                    message_to_user: 'Não foi possível gerar ajustes automáticos.',
                };
            }

            // 8. Apply adjustments
            for (const adj of aiResponse.adjustments) {
                if (adj.action === 'move' && adj.new_start && adj.new_end) {
                    await supabase
                        .from('daily_blocks')
                        .update({
                            start_datetime: `${dateStr}T${adj.new_start}:00`,
                            end_datetime: `${dateStr}T${adj.new_end}:00`,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', adj.block_id);
                } else if (adj.action === 'mark_optional') {
                    // Update meta to mark as optional
                    const { data: block } = await supabase
                        .from('daily_blocks')
                        .select('meta')
                        .eq('id', adj.block_id)
                        .single();

                    await supabase
                        .from('daily_blocks')
                        .update({
                            meta: { ...(block?.meta || {}), optional: true, suggested_reason: adj.reason },
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', adj.block_id);
                }
            }

            // 9. Recalculate order_index
            const { data: reorderedBlocks } = await supabase
                .from('daily_blocks')
                .select('*')
                .eq('plan_id', plan.id)
                .order('start_datetime', { ascending: true });

            if (reorderedBlocks) {
                for (let i = 0; i < reorderedBlocks.length; i++) {
                    if (reorderedBlocks[i].order_index !== i) {
                        await supabase
                            .from('daily_blocks')
                            .update({ order_index: i })
                            .eq('id', reorderedBlocks[i].id);
                    }
                }
            }

            // 10. Return final state
            const { data: finalBlocks } = await supabase
                .from('daily_blocks')
                .select('*')
                .eq('plan_id', plan.id)
                .order('start_datetime', { ascending: true });

            return NextResponse.json({
                success: true,
                message: aiResponse.message_to_user,
                adjustments_made: aiResponse.adjustments.length,
                could_not_fit: aiResponse.could_not_fit,
                blocks: finalBlocks,
                stats: { completed: completedToday, skipped: skippedToday },
            });
        }

        // Default: return current state
        const { data: finalBlocks } = await supabase
            .from('daily_blocks')
            .select('*')
            .eq('plan_id', plan.id)
            .order('start_datetime', { ascending: true });

        return NextResponse.json({
            success: true,
            message: 'Agenda atualizada.',
            blocks: finalBlocks,
            stats: { completed: completedToday, skipped: skippedToday },
        });

    } catch (error) {
        console.error('Replan day error:', error);
        return NextResponse.json(
            { error: 'Failed to replan day', details: String(error) },
            { status: 500 }
        );
    }
}
