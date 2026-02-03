import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

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
    date: z.string(), // YYYY-MM-DD
    title: z.string().min(1),
    category: z.enum(['work', 'study', 'health', 'leisure', 'admin', 'sleep', 'meal', 'commute', 'fixed']),
    start_time: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM
    end_time: z.string().regex(/^\d{2}:\d{2}$/),
    source: z.enum(['fixed', 'ai', 'manual']).default('manual'),
    meta: z.record(z.string(), z.any()).optional(),
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

// POST - Create a new block
export async function POST(request: NextRequest) {
    try {
        const supabase = getSupabase();

        const body = await request.json();
        const input = createBlockSchema.parse(body);

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

        // Get max order_index
        const { data: existingBlocks } = await supabase
            .from('daily_blocks')
            .select('order_index')
            .eq('plan_id', planId)
            .order('order_index', { ascending: false })
            .limit(1);

        const orderIndex = (existingBlocks?.[0]?.order_index ?? -1) + 1;

        // Create block
        const { data: block, error } = await supabase
            .from('daily_blocks')
            .insert({
                plan_id: planId,
                user_id: input.user_id,
                title: input.title,
                category: input.category,
                start_datetime: `${input.date}T${input.start_time}:00`,
                end_datetime: `${input.date}T${input.end_time}:00`,
                source: input.source,
                order_index: orderIndex,
                meta: input.meta || {},
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            block,
        });
    } catch (error) {
        console.error('Create block error:', error);
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
