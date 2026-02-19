/**
 * persistDailyBlocks.ts — Centralized write layer for daily_blocks.
 *
 * ALL writes to daily_blocks MUST go through this helper.
 * Direct .insert()/.upsert() on daily_blocks is PROHIBITED outside this file.
 *
 * @see .agent/skills/agenda-mvp-invencivel/SKILL.md §0.3
 */

import { normalizeForComparison, getMealType } from './mealWindows';

// ─── Types ───────────────────────────────────────────────────────

export interface BlockInput {
    title: string;
    category: string;
    start_datetime: string; // ISO timestamptz
    end_datetime: string;   // ISO timestamptz
    source: 'fixed' | 'ai' | 'manual' | 'ai_health';
    order_index?: number;
    is_done?: boolean;
    is_skipped?: boolean;
    skip_reason?: string;
    done_at?: string;
    meta?: Record<string, unknown>;
    description?: string;
}

export interface PersistError {
    operation: 'select' | 'insert' | 'update' | 'delete';
    key?: string;
    code?: string;
    message: string;
    hint?: string;
}

export interface PersistResult {
    inserted: number;
    updated: number;
    deleted: number;
    preserved_done_skipped: number;
    blocks: any[]; // final blocks in DB
    errors: PersistError[];
}

export interface PersistOptions {
    /** If true, delete blocks whose key is NOT in the new set (stale cleanup). Default: true */
    deleteStale?: boolean;
    /** If true, also delete blocks with NULL idempotency_key (legacy cleanup). Default: true */
    deleteNullKeys?: boolean;
    /** If true, preserve is_done/is_skipped from existing blocks. Default: true */
    preserveStatus?: boolean;
    /** If provided, only delete stale blocks with these sources (e.g. ['ai'] to not touch manual blocks) */
    staleSources?: string[];
}

// ─── Canonical Key Generation ────────────────────────────────────

/**
 * Generate a deterministic, stable idempotency key.
 *
 * Formula:
 * - fixed blocks:  fixed::{fixed_block_id}::{date}
 * - meals:         meal::{canonical_type}::{date}
 * - others:        {source}::{category}::{normalized_title}::{HH:MM}
 *
 * NO counter. NO array-order dependency.
 */
export function generateCanonicalKey(block: BlockInput, dateStr: string): string {
    const meta = block.meta || {};

    // 1. Fixed blocks — use the fixed_block_id as anchor
    if (block.source === 'fixed' && meta.fixed_block_id) {
        return `fixed::${meta.fixed_block_id}::${dateStr}`;
    }

    // 2. Meals — use canonical meal_type (breakfast|lunch|snack|dinner), NEVER label/PT-BR
    if (block.category === 'meal') {
        const startMin = extractMinutesFromDatetime(block.start_datetime);
        const mealWindow = getMealType(block.title, startMin, meta as Record<string, unknown>);
        // Priority: explicit meta.meal_type > mealWindow.canonicalType > fallback
        const canonicalFromMeta = (meta.meal_type as string);
        const canonicalFromWindow = mealWindow?.canonicalType;
        const mealType = isCanonicalMealType(canonicalFromMeta)
            ? canonicalFromMeta
            : (canonicalFromWindow || 'unknown_meal');
        // Always write back canonical type to meta for consistency
        if (block.meta) block.meta.meal_type = mealType;
        return `meal::${mealType}::${dateStr}`;
    }

    // 3. Everything else — source::category::normalized_title::start_time
    const normalized = normalizeForComparison(block.title)
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .substring(0, 60); // cap length

    const startTime = extractTimeFromDatetime(block.start_datetime);

    return `${block.source}::${block.category}::${normalized}::${startTime}`;
}

// ─── Main Persist Function ───────────────────────────────────────

/**
 * Persist blocks to daily_blocks with full idempotency.
 *
 * 1. Generates canonical key for each block
 * 2. Loads existing blocks for the plan
 * 3. UPSERT: if key exists → update (preserving done/skipped), else → insert
 * 4. Delete stale blocks (key not in new set)
 * 5. Delete legacy NULL-key blocks
 * 6. Returns stats + final block list
 */
export async function persistDailyBlocks(
    supabase: any,
    planId: string,
    userId: string,
    dateStr: string,
    blocks: BlockInput[],
    options: PersistOptions = {}
): Promise<PersistResult> {
    const {
        deleteStale = true,
        deleteNullKeys = true,
        preserveStatus = true,
        staleSources,
    } = options;

    let inserted = 0;
    let updated = 0;
    let deleted = 0;
    let preserved_done_skipped = 0;
    const errors: PersistError[] = [];

    // 1. Generate keys for all incoming blocks
    const blocksWithKeys = blocks.map((block, idx) => ({
        ...block,
        idempotency_key: generateCanonicalKey(block, dateStr),
        order_index: block.order_index ?? idx * 10,
    }));

    // Deduplicate: if two blocks have the same key, keep the last one (latest wins)
    const keyMap = new Map<string, typeof blocksWithKeys[0]>();
    for (const b of blocksWithKeys) {
        keyMap.set(b.idempotency_key, b);
    }
    const dedupedBlocks = Array.from(keyMap.values());

    // 2. Load existing blocks for this plan
    const { data: existingBlocks, error: selectError } = await supabase
        .from('daily_blocks')
        .select('*')
        .eq('plan_id', planId);

    if (selectError) {
        errors.push({ operation: 'select', code: selectError.code, message: selectError.message, hint: selectError.hint || 'RLS may be blocking SELECT — check service role key' });
        console.error('[persistDailyBlocks] SELECT error:', selectError.message, selectError.code, selectError.hint);
    }

    const existingByKey = new Map<string, any>();
    const existingNullKey: any[] = [];
    for (const eb of (existingBlocks || [])) {
        if (eb.idempotency_key) {
            existingByKey.set(eb.idempotency_key, eb);
        } else {
            existingNullKey.push(eb);
        }
    }

    // 3. UPSERT: update existing or insert new
    const newKeys = new Set<string>();

    for (const block of dedupedBlocks) {
        newKeys.add(block.idempotency_key);
        const existing = existingByKey.get(block.idempotency_key);

        if (existing) {
            // UPDATE — preserve done/skipped status
            const updateFields: Record<string, unknown> = {
                title: block.title,
                category: block.category,
                start_datetime: block.start_datetime,
                end_datetime: block.end_datetime,
                source: block.source,
                order_index: block.order_index,
                meta: { ...(existing.meta || {}), ...(block.meta || {}) },
                updated_at: new Date().toISOString(),
            };

            if (preserveStatus) {
                // Per-block preservation: done/skipped are mutually exclusive, count max 1
                const isPreserved = existing.is_done || existing.is_skipped;
                if (isPreserved) {
                    preserved_done_skipped++;
                    // Don't overwrite done/skipped — only update times
                } else {
                    if (block.is_done !== undefined) updateFields.is_done = block.is_done;
                    if (block.is_skipped !== undefined) updateFields.is_skipped = block.is_skipped;
                }
            } else {
                if (block.is_done !== undefined) updateFields.is_done = block.is_done;
                if (block.is_skipped !== undefined) updateFields.is_skipped = block.is_skipped;
            }

            const { error: updateError } = await supabase
                .from('daily_blocks')
                .update(updateFields)
                .eq('id', existing.id);

            if (updateError) {
                errors.push({ operation: 'update', key: block.idempotency_key, code: updateError.code, message: updateError.message, hint: updateError.hint });
                console.error('[persistDailyBlocks] UPDATE error:', updateError.message, block.idempotency_key);
            } else {
                updated++;
            }
        } else {
            // INSERT
            const { error } = await supabase
                .from('daily_blocks')
                .insert({
                    plan_id: planId,
                    user_id: userId,
                    title: block.title,
                    description: block.description || null,
                    category: block.category,
                    start_datetime: block.start_datetime,
                    end_datetime: block.end_datetime,
                    source: block.source,
                    order_index: block.order_index,
                    is_done: block.is_done ?? false,
                    is_skipped: block.is_skipped ?? false,
                    skip_reason: block.skip_reason || null,
                    done_at: block.done_at || null,
                    meta: block.meta || {},
                    idempotency_key: block.idempotency_key,
                });

            if (error) {
                errors.push({ operation: 'insert', key: block.idempotency_key, code: error.code, message: error.message, hint: error.hint || (error.code === '42501' ? 'RLS policy denied INSERT — use service role key' : undefined) });
                console.error('[persistDailyBlocks] INSERT error:', error.code, error.message, block.idempotency_key);
            } else {
                inserted++;
            }
        }
    }

    // 4. Delete stale blocks (key exists but not in new set)
    if (deleteStale) {
        for (const [key, existing] of existingByKey) {
            if (!newKeys.has(key)) {
                // Don't delete done/skipped blocks (user intent)
                if (preserveStatus && (existing.is_done || existing.is_skipped)) {
                    preserved_done_skipped++;
                    continue;
                }
                // Only delete if source matches filter (if provided)
                if (staleSources && !staleSources.includes(existing.source)) {
                    continue;
                }
                await supabase
                    .from('daily_blocks')
                    .delete()
                    .eq('id', existing.id);
                deleted++;
            }
        }
    }

    // 5. Delete legacy NULL-key blocks
    if (deleteNullKeys && existingNullKey.length > 0) {
        for (const orphan of existingNullKey) {
            // Preserve done/skipped even for orphans
            if (preserveStatus && (orphan.is_done || orphan.is_skipped)) {
                preserved_done_skipped++;
                continue;
            }
            await supabase
                .from('daily_blocks')
                .delete()
                .eq('id', orphan.id);
            deleted++;
        }
    }

    // 6. Fetch final state
    const { data: finalBlocks } = await supabase
        .from('daily_blocks')
        .select('*')
        .eq('plan_id', planId)
        .order('start_datetime', { ascending: true });

    return {
        inserted,
        updated,
        deleted,
        preserved_done_skipped,
        blocks: finalBlocks || [],
        errors,
    };
}

// ─── Single-block convenience wrapper ────────────────────────────

/**
 * Persist a single block (for manual add, assistant actions, etc.)
 * Uses the same canonical key logic but doesn't delete stale blocks.
 */
export async function persistSingleBlock(
    supabase: any,
    planId: string,
    userId: string,
    dateStr: string,
    block: BlockInput
): Promise<{ block: any; isNew: boolean }> {
    const result = await persistDailyBlocks(
        supabase, planId, userId, dateStr, [block],
        { deleteStale: false, deleteNullKeys: false, preserveStatus: true }
    );

    const savedBlock = result.blocks.find(
        b => b.idempotency_key === generateCanonicalKey(block, dateStr)
    );

    return {
        block: savedBlock || result.blocks[result.blocks.length - 1],
        isNew: result.inserted > 0,
    };
}

// ─── Helpers ─────────────────────────────────────────────────────

/** Valid canonical meal types — NEVER use PT-BR labels for keys */
const CANONICAL_MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner'] as const;

function isCanonicalMealType(value: unknown): value is typeof CANONICAL_MEAL_TYPES[number] {
    return typeof value === 'string' && CANONICAL_MEAL_TYPES.includes(value as any);
}

function extractMinutesFromDatetime(datetime: string): number {
    try {
        const d = new Date(datetime);
        return d.getHours() * 60 + d.getMinutes();
    } catch {
        // Fallback: parse from string
        const match = datetime.match(/T(\d{2}):(\d{2})/);
        if (match) return parseInt(match[1]) * 60 + parseInt(match[2]);
        return 0;
    }
}

function extractTimeFromDatetime(datetime: string): string {
    try {
        const match = datetime.match(/T(\d{2}:\d{2})/);
        if (match) return match[1];
        const d = new Date(datetime);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
        return '00:00';
    }
}
