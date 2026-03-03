import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getGeminiModel } from '@/lib/ai/gemini';
import { z } from 'zod';
import { AGENDA_PLANNER_SYSTEM_PROMPT, buildPlanDayPrompt, buildABPlanPrompt } from '@/ai/prompts/agendaPrompts';
import { persistDailyBlocks, BlockInput } from '@/lib/persistDailyBlocks';
import { solveTimeline, dailyBlockToSolverBlock, solverBlockToTimeFields, SolverBlock } from '@/lib/timelineSolver';
import { splitOvernightBlocks } from '@/lib/overnightSplit';
import { validateMealWindow } from '@/lib/mealWindows';
import { normalizeToTimestamptz, assertIntervalOrder, findAgendaCollision } from '@/lib/agendaValidation';

// Force dynamic to avoid static generation issues
export const dynamic = 'force-dynamic';

const planDayInputSchema = z.object({
    date: z.string().optional(), // YYYY-MM-DD, default today
    mode: z.enum(['first_time', 'regenerate', 'fill_gaps', 'generate_ab', 'confirm_plan']).default('first_time'),
    user_id: z.string().uuid(),
    timezone: z.string().default('America/Sao_Paulo'),
    // For confirm_plan mode
    selected_plan: z.enum(['A', 'B']).optional(),
    plan_blocks: z.array(z.object({
        title: z.string(),
        category: z.string(),
        start_time: z.string(),
        end_time: z.string(),
        suggested_reason: z.string().optional(),
        energyLevel: z.string().optional(),
    })).optional(),
});

const aiBlockSchema = z.object({
    title: z.string(),
    category: z.enum(['work', 'study', 'health', 'leisure', 'admin', 'sleep', 'meal', 'commute', 'fixed']),
    start_time: z.string().regex(/^\d{2}:\d{2}$/),
    end_time: z.string().regex(/^\d{2}:\d{2}$/),
    suggested_reason: z.string().optional(),
    energyLevel: z.enum(['low', 'medium', 'high']).optional(),
});

const aiResponseSchema = z.object({
    blocks: z.array(aiBlockSchema),
    summary: z.string(),
    insight: z.string().optional(),
});

function getDayOfWeek(dateStr: string): number {
    const date = new Date(dateStr + 'T12:00:00');
    return date.getDay();
}

function timeToDatetime(dateStr: string, timeStr: string, timezone: string): string {
    return normalizeToTimestamptz(dateStr, timeStr, timezone);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSharedContext(supabase: any, userId: string, dateStr: string, dayOfWeek: number) {
    // Get fixed_blocks for this day of week
    const { data: fixedBlocks } = await supabase
        .from('fixed_blocks')
        .select('*')
        .eq('user_id', userId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true);

    // Get health profile
    const { data: healthProfile } = await supabase
        .from('health_profile')
        .select('*')
        .eq('user_id', userId)
        .single();

    // Get routine profile
    const { data: routineProfile } = await supabase
        .from('routine_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

    // Get recent agenda blocks (last 7 days) for anti-repetition
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: recentBlocksData } = await supabase
        .from('daily_blocks')
        .select('title, category')
        .eq('user_id', userId)
        .eq('source', 'ai')
        .gte('start_datetime', sevenDaysAgo.toISOString())
        .order('start_datetime', { ascending: false })
        .limit(20);

    const recentAgendaBlocks = ((recentBlocksData || []) as any[]).map((b: any) => `${b.title} (${b.category})`);

    const fixedForContext = ((fixedBlocks || []) as any[]).map((fb: any) => ({
        title: fb.title,
        start: fb.start_time,
        end: fb.end_time,
        category: fb.category,
    }));

    const hp = healthProfile as any;
    const healthForContext = hp ? {
        goal: hp.goal,
        wake_time: hp.wake_time,
        sleep_time: hp.sleep_time,
        dietary_preferences: hp.dietary_preferences,
        training_level: hp.training_level,
        equipment: hp.equipment,
    } : undefined;

    const rp = routineProfile as any;
    const routineForContext = rp ? {
        peak_productivity: rp.peak_productivity,
        energy_level: rp.energy_level,
        objectives: rp.objectives,
    } : undefined;

    return {
        fixedBlocks: fixedBlocks || [], // Keep raw fixedBlocks for buildFixedBlockInputs
        fixedForContext,
        healthProfile: healthProfile, // Keep raw healthProfile if needed elsewhere
        healthForContext,
        routineProfile: routineProfile, // Keep raw routineProfile if needed elsewhere
        routineForContext,
        recentAgendaBlocks,
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getOrCreatePlan(supabase: any, userId: string, dateStr: string, timezone: string) {
    let { data: existingPlan } = await supabase
        .from('daily_plan')
        .select('*')
        .eq('user_id', userId)
        .eq('plan_date', dateStr)
        .single();

    let planId: string;

    if (!existingPlan) {
        const { data: newPlan, error: planError } = await supabase
            .from('daily_plan')
            .insert({
                user_id: userId,
                plan_date: dateStr,
                timezone,
                status: 'draft',
            })
            .select()
            .single();

        if (planError) throw planError;
        planId = newPlan.id;
    } else {
        planId = existingPlan.id;
    }

    return planId;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildFixedBlockInputs(dateStr: string, timezone: string, fixedBlocks: any[], existingBlocks: any[]): BlockInput[] {
    const fixedBlockIds = (existingBlocks || [])
        .filter((b: any) => b.source === 'fixed')
        .map((b: any) => b.meta?.fixed_block_id);

    const newFixedBlocks = (fixedBlocks || []).filter(
        fb => !fixedBlockIds.includes(fb.id)
    );

    return newFixedBlocks.map((fb, idx) => ({
        title: fb.title,
        category: fb.category,
        start_datetime: timeToDatetime(dateStr, fb.start_time, timezone),
        end_datetime: timeToDatetime(dateStr, fb.end_time, timezone),
        source: 'fixed' as const,
        order_index: idx,
        meta: {
            fixed_block_id: fb.id,
            location: fb.location,
            notes: fb.notes,
        },
    }));
}

async function generateAIBlocks(systemPrompt: string, userPrompt: string, temperature: number) {
    const model = getGeminiModel({
        temperature,
        systemInstruction: systemPrompt,
        routePolicy: 'agenda_fast_ops'
    });

    const result = await model.generateContent({
        contents: [
            { role: 'user', parts: [{ text: userPrompt }] },
        ],
        generationConfig: {
            responseMimeType: 'application/json',
            temperature,
        },
    });

    const responseText = result.response.text();
    try {
        const cleanJson = responseText.replace(/```json\n?|```/g, '').trim();
        return aiResponseSchema.parse(JSON.parse(cleanJson));
    } catch (parseError) {
        console.error('AI response parse error:', parseError);
        return { blocks: [], summary: 'Não foi possível gerar sugestões.', insight: undefined };
    }
}

// Helper: Process AI blocks -> Split Overnight -> Solve Conflicts -> Return BlockInput[]
function processAndSolveBlocks(
    aiBlocks: z.infer<typeof aiBlockSchema>[],
    dateStr: string,
    timezone: string,
    fixedInputs: BlockInput[],
    runId: string
): { blocks: BlockInput[], warnings: string[] } {
    const preWarnings: string[] = [];

    // 1. Convert to BlockInput (raw)
    const rawInputs: BlockInput[] = [];
    aiBlocks.forEach((b) => {
        const start = timeToDatetime(dateStr, b.start_time, timezone);
        const end = timeToDatetime(dateStr, b.end_time, timezone);

        try {
            assertIntervalOrder(start, end);
        } catch {
            preWarnings.push(`Bloco ignorado por intervalo inválido: ${b.title}`);
            return;
        }

        rawInputs.push({
            title: b.title,
            category: b.category,
            start_datetime: start,
            end_datetime: end,
            source: 'ai',
            meta: {
                suggested_reason: b.suggested_reason,
                energyLevel: b.energyLevel,
                intent_id: runId,
                original_start: start,
                original_end: end
            }
        });
    });

    // 2. Split Overnight (keep only today's portion for plan-day)
    const { today: todayInputs } = splitOvernightBlocks(rawInputs, dateStr);

    const collisionDetected = todayInputs.find((block, idx) => !!findAgendaCollision(block, todayInputs.slice(0, idx)));
    if (collisionDetected) {
        preWarnings.push(`Conflitos detectados e enviados para resolução automática: ${collisionDetected.title}`);
    }

    // 3. Prepare Solver
    const fixedSolverBlocks: SolverBlock[] = fixedInputs.map(fb => ({
        id: `fixed-${fb.order_index}`,
        title: fb.title,
        category: fb.category || 'fixed',
        startMin: extractTimeMinutes(fb.start_datetime),
        endMin: extractTimeMinutes(fb.end_datetime),
        source: 'fixed',
        priority: 100,
        locked: true
    }));

    const aiSolverBlocks: SolverBlock[] = todayInputs.map((b, idx) => {
        let startMin = extractTimeMinutes(b.start_datetime);
        let endMin = extractTimeMinutes(b.end_datetime);

        // Validate meal window
        if (b.category === 'meal') {
            const mealCheck = validateMealWindow(b.title, startMin);
            if (mealCheck.window && !mealCheck.valid) {
                startMin = mealCheck.nearestSlot;
                const duration = endMin - extractTimeMinutes(b.start_datetime);
                endMin = startMin + duration;
            }
        }

        return {
            id: `ai-${idx}`,
            title: b.title,
            category: b.category,
            startMin,
            endMin,
            source: 'ai',
            priority: b.category === 'meal' ? 70 : 50,
            canShorten: true,
            minDuration: 15,
            meta: b.meta
        };
    });

    // 4. Solve
    const result = solveTimeline([...fixedSolverBlocks, ...aiSolverBlocks]);

    // 5. Convert back to BlockInput (excluding fixed and out-of-bounds)
    const USEFUL_START = 5 * 60;   // 05:00
    const USEFUL_END = 23 * 60;  // 23:00

    const finalBlocks = result.resolved
        .filter(sb => {
            if (sb.source === 'fixed') return false;
            if (sb.category === 'sleep') return true;

            // Blocos fora da janela útil são descartados
            if (sb.endMin <= USEFUL_START || sb.startMin >= USEFUL_END) {
                return false;
            }
            return true;
        })
        .map((sb, idx) => {
            const timeFields = solverBlockToTimeFields(sb, dateStr, timezone);
            return {
                title: sb.title,
                category: sb.category as any,
                start_datetime: timeFields.start_datetime,
                end_datetime: timeFields.end_datetime,
                source: 'ai' as any,
                order_index: fixedInputs.length + idx, // Append after fixed
                meta: sb.meta
            };
        });

    return { blocks: finalBlocks, warnings: [...preWarnings, ...result.warnings] };
}

function extractTimeMinutes(dt: string): number {
    const match = dt.match(/T(\d{2}):(\d{2})/);
    if (match) return parseInt(match[1]) * 60 + parseInt(match[2]);
    return 0;
}

export async function POST(request: NextRequest) {
    const runId = crypto.randomUUID();
    console.log(`[plan-day] [${runId}] Starting plan-day request`);
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase: any = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const body = await request.json();
        const input = planDayInputSchema.parse(body);

        const now = new Date();
        const dateStr = input.date || now.toISOString().split('T')[0];

        if (!input.date) {
            console.warn(`[plan-day] [${runId}] date não fornecida — usando hoje como fallback: ${dateStr}`);
        }
        const dayOfWeek = getDayOfWeek(dateStr);

        // ========================================
        // MODE: confirm_plan — persist chosen A/B plan
        // ========================================
        if (input.mode === 'confirm_plan') {
            if (!input.plan_blocks || input.plan_blocks.length === 0) {
                return NextResponse.json({ error: 'No plan blocks provided' }, { status: 400 });
            }

            const planId = await getOrCreatePlan(supabase, input.user_id, dateStr, input.timezone);
            const context = await getSharedContext(supabase, input.user_id, dateStr, dayOfWeek);

            // Get existing blocks
            const { data: existingBlocks } = await supabase
                .from('daily_blocks')
                .select('*')
                .eq('plan_id', planId);

            // Build fixed + confirmed blocks
            const fixedInputs = buildFixedBlockInputs(dateStr, input.timezone, context.fixedBlocks, existingBlocks || []);

            // Process and Solve (Split overnight, resolve conflicts)
            let orderIndex = fixedInputs.length;
            // Map input blocks to schema format for helper
            const rawPlanBlocks = input.plan_blocks.map(b => ({
                ...b,
                category: b.category as any, // Cast string to enum
                start_time: b.start_time,
                end_time: b.end_time,
                energyLevel: b.energyLevel as 'low' | 'medium' | 'high' | undefined
            }));

            const { blocks: confirmedInputs, warnings: confirmWarnings } = processAndSolveBlocks(rawPlanBlocks, dateStr, input.timezone, fixedInputs, runId);

            // Add confirming meta
            confirmedInputs.forEach(b => {
                b.meta = { ...b.meta, created_via: `confirm_plan_${input.selected_plan}` };
            });

            // Persist all blocks with stale cleanup (replaces old AI blocks)
            const persistResult = await persistDailyBlocks(
                supabase, planId, input.user_id, dateStr,
                [...fixedInputs, ...confirmedInputs],
                { deleteStale: true, deleteNullKeys: true, staleSources: ['ai'] }
            );

            // Activate plan
            await supabase
                .from('daily_plan')
                .update({ status: 'active', updated_at: new Date().toISOString() })
                .eq('id', planId);

            const finalBlocks = persistResult.blocks;

            return NextResponse.json({
                success: true,
                plan_id: planId,
                date: dateStr,
                blocks: finalBlocks,
                selected_plan: input.selected_plan,
                blocks_count: {
                    total: finalBlocks.length,
                    fixed: finalBlocks.filter((b: any) => b.source === 'fixed').length,
                    ai: finalBlocks.filter((b: any) => b.source === 'ai').length,
                    manual: finalBlocks.filter((b: any) => b.source === 'manual').length,
                },
            }, { headers: { 'X-Run-Id': runId } });
        }

        // ========================================
        // MODE: generate_ab — create two alternative plans
        // ========================================
        if (input.mode === 'generate_ab') {
            const context = await getSharedContext(supabase, input.user_id, dateStr, dayOfWeek);

            // Get existing blocks for context
            const planId = await getOrCreatePlan(supabase, input.user_id, dateStr, input.timezone);
            const { data: existingBlocks } = await supabase
                .from('daily_blocks')
                .select('*')
                .eq('plan_id', planId)
                .order('start_datetime', { ascending: true });

            const existingForContext = (existingBlocks || [])
                .filter((b: any) => b.source !== 'ai')
                .map((eb: any) => ({
                    title: eb.title,
                    start: new Date(eb.start_datetime).toTimeString().slice(0, 5),
                    end: new Date(eb.end_datetime).toTimeString().slice(0, 5),
                    source: eb.source,
                }));

            const sharedPromptContext = {
                date: dateStr,
                dayOfWeek,
                fixedBlocks: context.fixedForContext,
                existingBlocks: existingForContext,
                healthProfile: context.healthForContext,
                routineProfile: context.routineForContext, // Added routine profile
                recentAgendaBlocks: context.recentAgendaBlocks,
            };

            // Generate both plans in parallel
            console.log('Generating A/B plans with Gemini 2.0 Flash...');
            const [planAResult, planBResult] = await Promise.all([
                generateAIBlocks(
                    AGENDA_PLANNER_SYSTEM_PROMPT,
                    buildABPlanPrompt({ ...sharedPromptContext, planStyle: 'focused' }),
                    0.5
                ),
                generateAIBlocks(
                    AGENDA_PLANNER_SYSTEM_PROMPT,
                    buildABPlanPrompt({ ...sharedPromptContext, planStyle: 'balanced' }),
                    0.9
                ),
            ]);

            // Build temp fixed inputs for solver
            const fixedInputs = buildFixedBlockInputs(dateStr, input.timezone, context.fixedBlocks, existingBlocks || []);

            // Solve both plans
            const { blocks: solvedA, warnings: warningsA } = processAndSolveBlocks(planAResult.blocks, dateStr, input.timezone, fixedInputs, runId);
            const { blocks: solvedB, warnings: warningsB } = processAndSolveBlocks(planBResult.blocks, dateStr, input.timezone, fixedInputs, runId);

            // Convert back to simple response format
            const toResponseFormat = (inputs: BlockInput[]) => inputs.map(b => ({
                title: b.title,
                category: b.category,
                start_time: b.start_datetime.split('T')[1].slice(0, 5),
                end_time: b.end_datetime.split('T')[1].slice(0, 5),
                suggested_reason: b.meta?.suggested_reason,
                energyLevel: b.meta?.energyLevel
            }));

            return NextResponse.json({
                success: true,
                mode: 'generate_ab',
                plan_id: planId,
                date: dateStr,
                planA: {
                    blocks: toResponseFormat(solvedA),
                    summary: planAResult.summary,
                    insight: planAResult.insight,
                    style: 'focused' as const,
                    warnings: warningsA,
                },
                planB: {
                    blocks: toResponseFormat(solvedB),
                    summary: planBResult.summary,
                    insight: planBResult.insight,
                    style: 'balanced' as const,
                    warnings: warningsB,
                },
            }, { headers: { 'X-Run-Id': runId } });
        }

        // ========================================
        // STANDARD MODES: first_time, regenerate, fill_gaps
        // ========================================
        const planId = await getOrCreatePlan(supabase, input.user_id, dateStr, input.timezone);
        const context = await getSharedContext(supabase, input.user_id, dateStr, dayOfWeek);

        // Get existing daily_blocks for this plan
        const { data: existingBlocks } = await supabase
            .from('daily_blocks')
            .select('*')
            .eq('plan_id', planId)
            .order('start_datetime', { ascending: true });

        // Build fixed block inputs
        const fixedInputs = buildFixedBlockInputs(dateStr, input.timezone, context.fixedBlocks, existingBlocks || []);

        const allExistingForContext = (existingBlocks || []).map((eb: any) => ({
            title: eb.title,
            start: new Date(eb.start_datetime).toTimeString().slice(0, 5),
            end: new Date(eb.end_datetime).toTimeString().slice(0, 5),
            source: eb.source,
        }));

        // Generate AI suggestions
        const prompt = buildPlanDayPrompt({
            date: dateStr,
            dayOfWeek,
            fixedBlocks: context.fixedForContext,
            existingBlocks: allExistingForContext,
            healthProfile: context.healthForContext ? { ...context.healthForContext } : undefined,
            routineProfile: context.routineForContext ? { ...context.routineForContext } : undefined,
            mode: input.mode as 'first_time' | 'regenerate' | 'fill_gaps',
            recentAgendaBlocks: context.recentAgendaBlocks,
        });

        const aiBlocks = await generateAIBlocks(AGENDA_PLANNER_SYSTEM_PROMPT, prompt, 0.7);

        // Build AI block inputs
        if (aiBlocks.blocks.length > 0) {
            // 5. Solve Conflicts & Refine
            const { blocks: resolvedBlocks, warnings: solverWarnings } = processAndSolveBlocks(
                aiBlocks.blocks,
                dateStr,
                input.timezone,
                fixedInputs,
                runId
            );

            // 6. Pre-process sequence for meals
            const aiInputs = resolvedBlocks;
            // Add meta
            aiInputs.forEach(b => {
                b.meta = { ...b.meta, created_via: 'plan_day' };
            });

            // Persist all (fixed + AI) with stale cleanup for AI blocks only
            const persistResult = await persistDailyBlocks(
                supabase, planId, input.user_id, dateStr,
                [...fixedInputs, ...aiInputs],
                {
                    deleteStale: true, // Always clean up old AI blocks when replanning
                    deleteNullKeys: true,
                    staleSources: ['ai', 'fixed'],
                }
            );

            // Update plan status to active
            await supabase
                .from('daily_plan')
                .update({ status: 'active', updated_at: new Date().toISOString() })
                .eq('id', planId);

            return NextResponse.json({
                success: true,
                plan_id: planId,
                date: dateStr,
                blocks: persistResult.blocks,
                ai_summary: aiBlocks.summary,
                blocks_count: {
                    manual: persistResult.blocks.filter((b: any) => b.source === 'manual').length,
                },
                warnings: solverWarnings,
            }, { headers: { 'X-Run-Id': runId } });
        }

        // No AI blocks generated — just persist fixed blocks
        if (fixedInputs.length > 0) {
            await persistDailyBlocks(
                supabase, planId, input.user_id, dateStr, fixedInputs,
                { deleteStale: false, deleteNullKeys: true }
            );
        }

        // Fetch final state
        const { data: finalBlocks } = await supabase
            .from('daily_blocks')
            .select('*')
            .eq('plan_id', planId)
            .order('start_datetime', { ascending: true });

        return NextResponse.json({
            success: true,
            plan_id: planId,
            date: dateStr,
            blocks: finalBlocks || [],
            ai_summary: aiBlocks.summary,
            blocks_count: {
                total: finalBlocks?.length || 0,
                fixed: finalBlocks?.filter((b: any) => b.source === 'fixed').length || 0,
                ai: finalBlocks?.filter((b: any) => b.source === 'ai').length || 0,
                manual: finalBlocks?.filter((b: any) => b.source === 'manual').length || 0,
            },
        }, { headers: { 'X-Run-Id': runId } });

    } catch (error) {
        console.error(`[plan-day] [${runId}] Plan day error:`, error);
        return NextResponse.json(
            { error: 'Failed to generate daily plan', details: String(error) },
            { status: 500, headers: { 'X-Run-Id': runId } }
        );
    }
}
