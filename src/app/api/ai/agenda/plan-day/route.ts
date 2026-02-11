import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { AGENDA_PLANNER_SYSTEM_PROMPT, buildPlanDayPrompt, buildABPlanPrompt } from '@/ai/prompts/agendaPrompts';

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
    // Create datetime in the specified timezone
    return `${dateStr}T${timeStr}:00`;
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

    return { fixedBlocks: fixedBlocks || [], fixedForContext, healthProfile, healthForContext, recentAgendaBlocks };
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
async function insertFixedBlocks(supabase: any, planId: string, userId: string, dateStr: string, timezone: string, fixedBlocks: any[], existingBlocks: any[]) {
    const fixedBlockIds = (existingBlocks || [])
        .filter((b: any) => b.source === 'fixed')
        .map((b: any) => b.meta?.fixed_block_id);

    const newFixedBlocks = (fixedBlocks || []).filter(
        fb => !fixedBlockIds.includes(fb.id)
    );

    if (newFixedBlocks.length > 0) {
        const fixedBlocksToInsert = newFixedBlocks.map((fb, idx) => ({
            plan_id: planId,
            user_id: userId,
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

        await supabase.from('daily_blocks').insert(fixedBlocksToInsert);
    }
}

async function generateAIBlocks(genAI: GoogleGenerativeAI, systemPrompt: string, userPrompt: string, temperature: number) {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent({
        contents: [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: 'Entendido. Aguardo o contexto do dia para gerar o plano.' }] },
            { role: 'user', parts: [{ text: userPrompt }] },
        ],
        generationConfig: {
            responseMimeType: 'application/json',
            temperature,
        },
    });

    const responseText = result.response.text();
    try {
        return aiResponseSchema.parse(JSON.parse(responseText));
    } catch (parseError) {
        console.error('AI response parse error:', parseError);
        return { blocks: [], summary: 'Não foi possível gerar sugestões.', insight: undefined };
    }
}

export async function POST(request: NextRequest) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase: any = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

        const body = await request.json();
        const input = planDayInputSchema.parse(body);

        const today = new Date();
        const dateStr = input.date || today.toISOString().split('T')[0];
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

            // Insert fixed blocks if not already there
            await insertFixedBlocks(supabase, planId, input.user_id, dateStr, input.timezone, context.fixedBlocks, existingBlocks || []);

            // Delete any existing AI blocks
            await supabase
                .from('daily_blocks')
                .delete()
                .eq('plan_id', planId)
                .eq('source', 'ai');

            // Get current max order_index
            const { data: currentBlocks } = await supabase
                .from('daily_blocks')
                .select('order_index')
                .eq('plan_id', planId)
                .order('order_index', { ascending: false })
                .limit(1);

            let orderIndex = (currentBlocks?.[0]?.order_index ?? -1) + 1;

            // Insert the selected plan's blocks
            const blocksToInsert = input.plan_blocks.map(block => ({
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
                    created_via: `confirm_plan_${input.selected_plan}`,
                },
            }));

            await supabase.from('daily_blocks').insert(blocksToInsert);

            // Activate plan
            await supabase
                .from('daily_plan')
                .update({ status: 'active', updated_at: new Date().toISOString() })
                .eq('id', planId);

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
                selected_plan: input.selected_plan,
                blocks_count: {
                    total: finalBlocks?.length || 0,
                    fixed: finalBlocks?.filter((b: any) => b.source === 'fixed').length || 0,
                    ai: finalBlocks?.filter((b: any) => b.source === 'ai').length || 0,
                    manual: finalBlocks?.filter((b: any) => b.source === 'manual').length || 0,
                },
            });
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
                recentAgendaBlocks: context.recentAgendaBlocks,
            };

            // Generate both plans in parallel
            console.log('Generating A/B plans with Gemini 2.0 Flash...');
            const [planAResult, planBResult] = await Promise.all([
                generateAIBlocks(
                    genAI,
                    AGENDA_PLANNER_SYSTEM_PROMPT,
                    buildABPlanPrompt({ ...sharedPromptContext, planStyle: 'focused' }),
                    0.5
                ),
                generateAIBlocks(
                    genAI,
                    AGENDA_PLANNER_SYSTEM_PROMPT,
                    buildABPlanPrompt({ ...sharedPromptContext, planStyle: 'balanced' }),
                    0.9
                ),
            ]);

            return NextResponse.json({
                success: true,
                mode: 'generate_ab',
                plan_id: planId,
                date: dateStr,
                planA: {
                    blocks: planAResult.blocks,
                    summary: planAResult.summary,
                    insight: planAResult.insight,
                    style: 'focused' as const,
                },
                planB: {
                    blocks: planBResult.blocks,
                    summary: planBResult.summary,
                    insight: planBResult.insight,
                    style: 'balanced' as const,
                },
            });
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

        // Insert fixed blocks
        await insertFixedBlocks(supabase, planId, input.user_id, dateStr, input.timezone, context.fixedBlocks, existingBlocks || []);

        const allExistingForContext = (existingBlocks || []).map((eb: any) => ({
            title: eb.title,
            start: new Date(eb.start_datetime).toTimeString().slice(0, 5),
            end: new Date(eb.end_datetime).toTimeString().slice(0, 5),
            source: eb.source,
        }));

        // If mode is regenerate, delete AI blocks that are not done
        if (input.mode === 'regenerate') {
            await supabase
                .from('daily_blocks')
                .delete()
                .eq('plan_id', planId)
                .eq('source', 'ai')
                .eq('is_done', false);
        }

        // Generate AI suggestions
        const prompt = buildPlanDayPrompt({
            date: dateStr,
            dayOfWeek,
            fixedBlocks: context.fixedForContext,
            existingBlocks: allExistingForContext,
            healthProfile: context.healthForContext,
            mode: input.mode as 'first_time' | 'regenerate' | 'fill_gaps',
            recentAgendaBlocks: context.recentAgendaBlocks,
        });

        const aiBlocks = await generateAIBlocks(genAI, AGENDA_PLANNER_SYSTEM_PROMPT, prompt, 0.7);

        // Insert AI-generated blocks
        if (aiBlocks.blocks.length > 0) {
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

        // Update plan status to active
        await supabase
            .from('daily_plan')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', planId);

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
            blocks: finalBlocks,
            ai_summary: aiBlocks.summary,
            blocks_count: {
                total: finalBlocks?.length || 0,
                fixed: finalBlocks?.filter((b: any) => b.source === 'fixed').length || 0,
                ai: finalBlocks?.filter((b: any) => b.source === 'ai').length || 0,
                manual: finalBlocks?.filter((b: any) => b.source === 'manual').length || 0,
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
