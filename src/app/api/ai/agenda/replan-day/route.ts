import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getGeminiModel } from '@/lib/ai/gemini';
import { z } from 'zod';
import { AGENDA_REPLANNER_SYSTEM_PROMPT, buildReplanPrompt } from '@/ai/prompts/agendaPrompts';
import { solveTimeline, dailyBlockToSolverBlock, solverBlockToTimeFields, SolverBlock } from '@/lib/timelineSolver';
import { validateMealWindow, normalizeForComparison } from '@/lib/mealWindows';

// Force dynamic to avoid static generation issues
export const dynamic = 'force-dynamic';

// Lazy initialization to avoid build-time execution
const getSupabase = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);


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

const PRIORITY_WEIGHTS: Record<string, number> = {
    health: 1.5,
    work: 1.2,
    study: 1.1,
    leisure: 1.0,
    admin: 0.9,
    commute: 0.8,
    sleep: 0.8,
    meal: 1.3,
    fixed: 1.0,
};

function calculateWeightedScore(blocks: any[]): number {
    let totalWeight = 0;
    let earnedWeight = 0;

    blocks.forEach(b => {
        const weight = PRIORITY_WEIGHTS[b.category] || 1.0;
        totalWeight += weight;
        if (b.is_done) {
            earnedWeight += weight;
        }
    });

    if (totalWeight === 0) return 0;
    return Math.min(100, Math.round((earnedWeight / totalWeight) * 100));
}

function calculateAdherence(blocks: any[]): number {
    const aiBlocks = blocks.filter(b => b.source === 'ai' && b.meta?.original_start);
    if (aiBlocks.length === 0) return 100;

    let totalDriftMins = 0;
    aiBlocks.forEach(b => {
        const original = new Date(b.meta.original_start).getTime();
        const current = new Date(b.start_datetime).getTime();
        const drift = Math.abs(current - original) / (1000 * 60);
        totalDriftMins += drift;
    });

    const avgDrift = totalDriftMins / aiBlocks.length;
    // Penalty: 100 - (avgDrift / 2) -> 60 min avg drift = 70 score
    return Math.max(0, Math.round(100 - (avgDrift / 0.6)));
}

export async function POST(request: NextRequest) {
    const runId = crypto.randomUUID();
    console.log(`[replan-day] [${runId}] Starting replan-day request`);
    try {
        const supabase = getSupabase();
        const model = getGeminiModel();

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

        // Fetch User Context
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, occupation')
            .eq('id', input.user_id)
            .single();

        const { data: routineProfile } = await supabase
            .from('routine_profiles')
            .select('*')
            .eq('user_id', input.user_id)
            .single();

        const userContextBlock = routineProfile ? `
USER PROFILE:
${JSON.stringify({
            name: profile?.full_name,
            occupation: profile?.occupation,
            peak_productivity: routineProfile.peak_productivity,
            energy_level: routineProfile.energy_level,
            objectives: routineProfile.objectives
        }, null, 2)}
` : '';

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
            }, { headers: { 'X-Run-Id': runId } });
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

            const weightedScore = calculateWeightedScore(updatedBlocks || []);
            const adherenceScore = calculateAdherence(updatedBlocks || []);
            const finalConsistency = (weightedScore * 0.7) + (adherenceScore * 0.3);

            await supabase
                .from('daily_scores')
                .upsert({
                    user_id: input.user_id,
                    plan_date: dateStr,
                    consistency_score: weightedScore,
                    adherence_score: adherenceScore,
                    weighted_final_score: finalConsistency,
                    meta: {
                        last_run_id: runId,
                        stats: { completed: completedToday, skipped: skippedToday }
                    }
                }, { onConflict: 'user_id, plan_date' });

            return NextResponse.json({
                success: true,
                message: input.signal === 'done'
                    ? 'Ótimo trabalho! Continue assim.'
                    : 'Nenhum ajuste necessário.',
                blocks: updatedBlocks,
                stats: {
                    completed: completedToday,
                    skipped: skippedToday,
                    weighted_score: weightedScore,
                    adherence_score: adherenceScore,
                    final_consistency: finalConsistency
                },
            }, { headers: { 'X-Run-Id': runId } });
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

            const result = await model.generateContent({
                contents: [
                    { role: 'user', parts: [{ text: AGENDA_REPLANNER_SYSTEM_PROMPT + (userContextBlock ? '\n\n' + userContextBlock : '') }] },
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

            // 8. Apply AI adjustments to in-memory blocks
            const adjustedBlockMap = new Map(allBlocks!.map(b => [b.id, { ...b }]));
            for (const adj of aiResponse.adjustments) {
                const block = adjustedBlockMap.get(adj.block_id);
                if (!block) continue;

                if (adj.action === 'move' && adj.new_start && adj.new_end) {
                    block.start_datetime = `${dateStr}T${adj.new_start}:00`;
                    block.end_datetime = `${dateStr}T${adj.new_end}:00`;
                } else if (adj.action === 'mark_optional') {
                    block.meta = { ...(block.meta || {}), optional: true, suggested_reason: adj.reason };
                }
            }

            // 9. Load fixed blocks for this day
            const dayOfWeek = new Date(dateStr + 'T12:00:00').getDay();
            const { data: fixedBlocks } = await supabase
                .from('fixed_blocks')
                .select('*')
                .eq('user_id', input.user_id)
                .eq('is_active', true)
                .eq('day_of_week', dayOfWeek);

            // 10. Convert to solver format and run solver
            const pendingAdjusted = [...adjustedBlockMap.values()].filter(
                b => !b.is_done && !b.is_skipped
            );

            // 10. Convert to solver format
            const fixedSolverBlocks: SolverBlock[] = (fixedBlocks || []).map(fb => ({
                id: `fixed-${fb.id}`,
                title: fb.title,
                category: fb.category || 'fixed',
                startMin: timeToMinutes(fb.start_time),
                endMin: timeToMinutes(fb.end_time),
                source: 'fixed' as const,
                priority: 100,
                locked: true,
                meta: { fixed_block_id: fb.id }
            }));

            // Filter out existing blocks that were already generated from estas mesmas fixed_blocks
            // to avoid duplicates if they are already in 'pendingAdjusted'
            const activeFixedIds = new Set((fixedBlocks || []).map(fb => String(fb.id)));
            const filteredPending = pendingAdjusted.filter(b => {
                if (b.source === 'fixed' && b.meta?.fixed_block_id) {
                    return !activeFixedIds.has(String(b.meta.fixed_block_id));
                }
                return true;
            });

            const pendingSolverBlocks: SolverBlock[] = filteredPending.map(b => {
                const sb = dailyBlockToSolverBlock(b as any);
                // Ensure the start time is current (especially for the late signal)
                // but keep original duration
                const start = new Date(b.start_datetime);
                const end = new Date(b.end_datetime);
                const dur = (end.getHours() * 60 + end.getMinutes()) - (start.getHours() * 60 + start.getMinutes());

                let startMin = sb.startMin;
                if (b.category === 'meal') {
                    const mealCheck = validateMealWindow(b.title, startMin, b.meta);
                    if (mealCheck.window && !mealCheck.valid) {
                        startMin = mealCheck.nearestSlot;
                    }
                }

                return {
                    ...sb,
                    startMin,
                    endMin: startMin + dur
                };
            });

            const solverResult = solveTimeline([...fixedSolverBlocks, ...pendingSolverBlocks]);

            // 11. Save solver-resolved times back to DB
            // SAFETY: replan ONLY updates times on existing blocks. NEVER delete/insert.
            //         Only non-fixed blocks are updated (see filter below).
            //         See SKILL.md §0.4 — replan keeps .update() only.
            const resolvedNonFixed = solverResult.resolved.filter(b => b.source !== 'fixed');
            for (const block of resolvedNonFixed) {
                const timeFields = solverBlockToTimeFields(block, dateStr, 'America/Sao_Paulo');
                await supabase
                    .from('daily_blocks')
                    .update({
                        start_datetime: timeFields.start_datetime,
                        end_datetime: timeFields.end_datetime,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', block.id);
            }

            // 12. Re-read final state and return full block list
            const { data: finalBlocks } = await supabase
                .from('daily_blocks')
                .select('*')
                .eq('plan_id', plan.id)
                .order('start_datetime', { ascending: true });

            // 13. Calculate and Persist Scores (Engine V2)
            const weightedScore = calculateWeightedScore(finalBlocks || []);
            const adherenceScore = calculateAdherence(finalBlocks || []);
            const finalConsistency = (weightedScore * 0.7) + (adherenceScore * 0.3);

            await supabase
                .from('daily_scores')
                .upsert({
                    user_id: input.user_id,
                    plan_date: dateStr,
                    consistency_score: weightedScore,
                    adherence_score: adherenceScore,
                    weighted_final_score: finalConsistency,
                    meta: {
                        last_run_id: runId,
                        stats: { completed: completedToday, skipped: skippedToday }
                    }
                }, { onConflict: 'user_id, plan_date' });

            return NextResponse.json({
                success: true,
                message: aiResponse.message_to_user,
                adjustments_made: aiResponse.adjustments.length,
                solver_warnings: solverResult.warnings,
                could_not_fit: aiResponse.could_not_fit,
                blocks: finalBlocks,
                stats: {
                    completed: completedToday,
                    skipped: skippedToday,
                    weighted_score: weightedScore,
                    adherence_score: adherenceScore,
                    final_consistency: finalConsistency
                },
            }, { headers: { 'X-Run-Id': runId } });
        }

        // Default: return current state
        const { data: finalState } = await supabase
            .from('daily_blocks')
            .select('*')
            .eq('plan_id', plan.id)
            .order('start_datetime', { ascending: true });

        const weightedScore = calculateWeightedScore(finalState || []);
        const adherenceScore = calculateAdherence(finalState || []);

        return NextResponse.json({
            success: true,
            message: 'Agenda atualizada.',
            blocks: finalState,
            stats: {
                completed: completedToday,
                skipped: skippedToday,
                weighted_score: weightedScore,
                adherence_score: adherenceScore
            },
        }, { headers: { 'X-Run-Id': runId } });

    } catch (error) {
        console.error('Replan day error:', error);
        return NextResponse.json(
            { error: 'Failed to replan day', details: String(error) },
            { status: 500 }
        );
    }
}

function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}
