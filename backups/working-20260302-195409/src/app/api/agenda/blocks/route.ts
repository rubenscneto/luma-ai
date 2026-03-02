import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { strictDateSchema, hhmmSchema, normalizeToTimestamptz, assertIntervalOrder, findAgendaCollision, agendaError, normalizeTimezone } from '@/lib/agendaValidation';

// Force dynamic to avoid static generation issues
export const dynamic = 'force-dynamic';

// Lazy initialization to avoid build-time execution
const getSupabase = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Schema for creating a block
const createBlockSchema = z.object({
    user_id: z.string().uuid(),
    date: strictDateSchema,
    title: z.string().min(1),
    category: z.enum(['work', 'study', 'health', 'leisure', 'admin', 'sleep', 'meal', 'commute', 'fixed']),
    start_time: hhmmSchema,
    end_time: hhmmSchema,
    source: z.enum(['fixed', 'ai', 'manual']).default('manual'),
    meta: z.record(z.string(), z.any()).optional(),
    timezone: z.string().optional(),
});

// Schema for updating a block
const updateBlockSchema = z.object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    title: z.string().min(1).optional(),
    category: z.enum(['work', 'study', 'health', 'leisure', 'admin', 'sleep', 'meal', 'commute', 'fixed']).optional(),
    start_datetime: z.string().optional(),
    end_datetime: z.string().optional(),
    is_done: z.boolean().optional(),
    is_skipped: z.boolean().optional(),
    skip_reason: z.string().optional(),
    order_index: z.number().optional(),
    meta: z.record(z.string(), z.any()).optional(),
    timezone: z.string().optional(),
});

// GET - Fetch blocks for a date
export async function GET(request: NextRequest) {
    try {
        const supabase = getSupabase();

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('user_id');
        const date = searchParams.get('date'); // YYYY-MM-DD

        if (!userId) {
            return NextResponse.json({ error: 'user_id required' }, { status: 400 });
        }

        const dateStr = date || new Date().toISOString().split('T')[0];

        // Get the daily plan
        const { data: plan } = await supabase
            .from('daily_plan')
            .select('*')
            .eq('user_id', userId)
            .eq('plan_date', dateStr)
            .single();

        if (!plan) {
            return NextResponse.json({
                plan: null,
                blocks: [],
                message: 'No plan for this date',
            });
        }

        // Get blocks for the plan
        const { data: blocks } = await supabase
            .from('daily_blocks')
            .select('*')
            .eq('plan_id', plan.id)
            .order('start_datetime', { ascending: true });

        // Calculate current and next block
        const now = new Date();
        const currentBlock = blocks?.find(b => {
            const start = new Date(b.start_datetime);
            const end = new Date(b.end_datetime);
            return now >= start && now <= end && !b.is_done && !b.is_skipped;
        });

        const nextBlock = blocks?.find(b => {
            const start = new Date(b.start_datetime);
            return start > now && !b.is_done && !b.is_skipped;
        });

        return NextResponse.json({
            plan,
            blocks: blocks || [],
            current_block: currentBlock || null,
            next_block: nextBlock || null,
            stats: {
                total: blocks?.length || 0,
                completed: blocks?.filter(b => b.is_done).length || 0,
                skipped: blocks?.filter(b => b.is_skipped).length || 0,
                pending: blocks?.filter(b => !b.is_done && !b.is_skipped).length || 0,
            },
        });
    } catch (error) {
        console.error('Get blocks error:', error);
        return NextResponse.json({ error: 'Failed to get blocks' }, { status: 500 });
    }
}

// POST - Create a new block (with idempotency key via centralized helper)
export async function POST(request: NextRequest) {
    try {
        const supabase = getSupabase();

        const body = await request.json();
        const input = createBlockSchema.parse(body);
        const { persistSingleBlock } = await import('@/lib/persistDailyBlocks');

        // Get or create daily plan
        const { data: existingPlan } = await supabase
            .from('daily_plan')
            .select('id')
            .eq('user_id', input.user_id)
            .eq('plan_date', input.date)
            .single();

        let planId: string;

        if (existingPlan) {
            planId = existingPlan.id;
        } else {
            const { data: newPlan, error: planError } = await supabase
                .from('daily_plan')
                .insert({
                    user_id: input.user_id,
                    plan_date: input.date,
                    status: 'active',
                })
                .select('id')
                .single();

            if (planError || !newPlan) {
                throw new Error('Failed to create plan');
            }
            planId = newPlan.id;
        }

        const timezone = normalizeTimezone(input.timezone);
        const startDt = normalizeToTimestamptz(input.date, input.start_time, timezone);
        const endDt = normalizeToTimestamptz(input.date, input.end_time, timezone);

        try {
            assertIntervalOrder(startDt, endDt);
        } catch {
            return NextResponse.json(agendaError(400, 'Intervalo inválido: end deve ser maior que start'), { status: 400 });
        }

        const { data: existingBlocks } = await supabase
            .from('daily_blocks')
            .select('id, start_datetime, end_datetime')
            .eq('plan_id', planId);

        const conflict = findAgendaCollision(
            { start_datetime: startDt, end_datetime: endDt },
            existingBlocks || []
        );

        if (conflict) {
            return NextResponse.json(
                agendaError(409, 'Conflito de agenda detectado', {
                    conflict_block_id: conflict.id,
                    start_datetime: conflict.start_datetime,
                    end_datetime: conflict.end_datetime,
                }),
                { status: 409 }
            );
        }

        const result = await persistSingleBlock(
            supabase, planId, input.user_id, input.date,
            {
                title: input.title,
                category: input.category,
                start_datetime: startDt,
                end_datetime: endDt,
                source: input.source,
                meta: input.meta || {},
            }
        );

        return NextResponse.json({
            success: true,
            block: result.block,
            is_new: result.isNew,
        });
    } catch (error) {
        console.error('Create block error:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json(agendaError(400, 'Dados de entrada inválidos', { issues: error.issues }), { status: 400 });
        }
        if (error instanceof Error && error.message === 'timezone inválido') {
            return NextResponse.json(agendaError(400, 'timezone inválido'), { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to create block' }, { status: 500 });
    }
}

// PATCH - Update a block
export async function PATCH(request: NextRequest) {
    try {
        const supabase = getSupabase();

        const body = await request.json();
        const input = updateBlockSchema.parse(body);

        // Verify ownership
        const { data: existing } = await supabase
            .from('daily_blocks')
            .select('*')
            .eq('id', input.id)
            .eq('user_id', input.user_id)
            .single();

        if (!existing) {
            return NextResponse.json({ error: 'Block not found' }, { status: 404 });
        }

        // Build update object
        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (input.title !== undefined) updates.title = input.title;
        if (input.category !== undefined) updates.category = input.category;
        if (input.start_datetime !== undefined) updates.start_datetime = input.start_datetime;
        if (input.end_datetime !== undefined) updates.end_datetime = input.end_datetime;
        if (input.order_index !== undefined) updates.order_index = input.order_index;

        if (input.is_done !== undefined) {
            updates.is_done = input.is_done;
            if (input.is_done) {
                updates.done_at = new Date().toISOString();
            }
        }

        if (input.is_skipped !== undefined) {
            updates.is_skipped = input.is_skipped;
            if (input.is_skipped && input.skip_reason) {
                updates.skip_reason = input.skip_reason;
            }
        }

        if (input.meta !== undefined) {
            updates.meta = { ...existing.meta, ...input.meta };
        }

        const candidateStart = (updates.start_datetime as string | undefined) || existing.start_datetime;
        const candidateEnd = (updates.end_datetime as string | undefined) || existing.end_datetime;

        try {
            assertIntervalOrder(candidateStart, candidateEnd);
        } catch {
            return NextResponse.json(agendaError(400, 'Intervalo inválido: end deve ser maior que start'), { status: 400 });
        }

        const { data: planBlocks } = await supabase
            .from('daily_blocks')
            .select('id, start_datetime, end_datetime')
            .eq('plan_id', existing.plan_id);

        const conflict = findAgendaCollision(
            { start_datetime: candidateStart, end_datetime: candidateEnd, id: input.id },
            planBlocks || [],
            input.id
        );

        if (conflict) {
            return NextResponse.json(
                agendaError(409, 'Conflito de agenda detectado', {
                    conflict_block_id: conflict.id,
                    start_datetime: conflict.start_datetime,
                    end_datetime: conflict.end_datetime,
                }),
                { status: 409 }
            );
        }

        const { data: block, error } = await supabase
            .from('daily_blocks')
            .update(updates)
            .eq('id', input.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            block,
        });
    } catch (error) {
        console.error('Update block error:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json(agendaError(400, 'Dados de entrada inválidos', { issues: error.issues }), { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to update block' }, { status: 500 });
    }
}

// DELETE - Remove a block
export async function DELETE(request: NextRequest) {
    try {
        const supabase = getSupabase();

        const { searchParams } = new URL(request.url);
        const blockId = searchParams.get('id');
        const userId = searchParams.get('user_id');

        if (!blockId || !userId) {
            return NextResponse.json({ error: 'id and user_id required' }, { status: 400 });
        }

        // Verify ownership and prevent deleting fixed blocks
        const { data: existing } = await supabase
            .from('daily_blocks')
            .select('source')
            .eq('id', blockId)
            .eq('user_id', userId)
            .single();

        if (!existing) {
            return NextResponse.json({ error: 'Block not found' }, { status: 404 });
        }

        if (existing.source === 'fixed') {
            return NextResponse.json(
                { error: 'Cannot delete fixed blocks. Disable them in fixed_blocks instead.' },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from('daily_blocks')
            .delete()
            .eq('id', blockId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete block error:', error);
        return NextResponse.json({ error: 'Failed to delete block' }, { status: 500 });
    }
}
