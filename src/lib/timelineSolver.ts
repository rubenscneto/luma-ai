/**
 * Timeline Solver — Zero-overlap constraint engine
 *
 * Guarantees that no two blocks occupy the same time slot.
 * Resolves conflicts by priority, moving lower-priority blocks
 * to the nearest free slot.
 */

// ===== Types =====

export interface SolverBlock {
    id: string;
    title: string;
    category: string;
    startMin: number;   // minutes from midnight (0–1440)
    endMin: number;     // minutes from midnight
    source: 'fixed' | 'ai' | 'manual';
    priority: number;   // higher = harder to move
    parentEventId?: string; // for derived blocks (meal pauses)
    canSplit?: boolean;
    canShorten?: boolean;
    minDuration?: number; // minimum duration in minutes (for shortening)
    locked?: boolean;
    meta?: Record<string, unknown>;
}

export interface SolverConflict {
    blockId: string;
    blockTitle: string;
    action: 'moved' | 'shortened' | 'split' | 'removed' | 'suggest_other_day';
    originalStart: number;
    originalEnd: number;
    newStart?: number;
    newEnd?: number;
    reason: string;
}

export interface SolverResult {
    resolved: SolverBlock[];
    conflicts: SolverConflict[];
    warnings: string[];
    hasErrors: boolean;
}

// ===== Priority Map =====

const PRIORITY_MAP: Record<string, number> = {
    sleep: 100,
    fixed: 100,
    meal: 70,
    health: 65,
    work: 60,
    study: 60,
    commute: 55,
    admin: 50,
    leisure: 40,
};

export function getPriorityForBlock(category: string, source: string, isParentDerived?: boolean): number {
    if (isParentDerived) return 40; // derived blocks always low priority
    if (source === 'fixed') return 100;
    if (source === 'manual') return Math.max((PRIORITY_MAP[category] || 50), 80);
    return PRIORITY_MAP[category] || 50;
}

// ===== Utility Functions =====

/** Round minutes to nearest grid (default 5 min) */
export function roundToGrid(minutes: number, grid: number = 5): number {
    return Math.round(minutes / grid) * grid;
}

/** Parse "HH:mm" → minutes from midnight */
export function timeToMinutes(time: string): number {
    const parts = time.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return 0;
    return h * 60 + m;
}

/** Minutes from midnight → "HH:mm" */
export function minutesToTime(minutes: number): string {
    const clamped = Math.max(0, Math.min(1439, minutes));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/** Check if two intervals overlap */
function overlaps(a: SolverBlock, b: SolverBlock): boolean {
    return a.startMin < b.endMin && a.endMin > b.startMin;
}

/** Duration of a block in minutes */
function duration(block: SolverBlock): number {
    return block.endMin - block.startMin;
}

// ===== Core Solver =====

/**
 * Solve timeline conflicts.
 *
 * Algorithm:
 * 1. Normalize & validate all blocks
 * 2. Sort by priority DESC
 * 3. Place blocks one-by-one: fixed first, then by priority
 * 4. If collision: find nearest free slot (same day boundary 0–1440)
 * 5. Policies: move → shorten → remove (with warning)
 * 6. Final check: assert 0 overlaps
 */
export function solveTimeline(
    blocks: SolverBlock[],
    dayStartMin: number = 0,
    dayEndMin: number = 1440
): SolverResult {
    const conflicts: SolverConflict[] = [];
    const warnings: string[] = [];

    // 1. Normalize
    const normalized = blocks.map(b => ({
        ...b,
        startMin: roundToGrid(Math.max(dayStartMin, b.startMin)),
        endMin: roundToGrid(Math.min(dayEndMin, b.endMin)),
    })).filter(b => {
        if (b.startMin >= b.endMin) {
            warnings.push(`Bloco "${b.title}" removido: horário inválido (início >= fim).`);
            return false;
        }
        return true;
    });

    // 2. Sort by priority DESC, then by startMin ASC
    const sorted = [...normalized].sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return a.startMin - b.startMin;
    });

    // 3. Place blocks
    const placed: SolverBlock[] = [];
    let hasErrors = false;

    for (const block of sorted) {
        const conflict = findConflict(placed, block);

        if (!conflict) {
            // No conflict, place directly
            placed.push({ ...block });
            continue;
        }

        // 3.1. If the current block is LOCKED, it MUST stay here.
        if (block.locked) {
            placed.push({ ...block });
            hasErrors = true;
            warnings.push(`CRÍTICO: Bloco trancado "${block.title}" em conflito com "${conflict.title}".`);
            continue;
        }

        // 4. Try to resolve: find nearest free slot
        const originalStart = block.startMin;
        const originalEnd = block.endMin;
        const dur = duration(block);

        const freeSlot = findNearestFreeSlot(placed, block.startMin, dur, dayStartMin, dayEndMin);

        if (freeSlot !== null) {
            // Move to free slot
            const movedBlock = {
                ...block,
                startMin: freeSlot,
                endMin: freeSlot + dur,
            };
            placed.push(movedBlock);
            conflicts.push({
                blockId: block.id,
                blockTitle: block.title,
                action: 'moved',
                originalStart,
                originalEnd,
                newStart: freeSlot,
                newEnd: freeSlot + dur,
                reason: `Conflito com "${conflict.title}". Movido para ${minutesToTime(freeSlot)}.`,
            });
            continue;
        }

        // 5. Try shortening if allowed
        if (block.canShorten && block.minDuration) {
            const shortenedSlot = findNearestFreeSlot(placed, block.startMin, block.minDuration, dayStartMin, dayEndMin);
            if (shortenedSlot !== null) {
                const shortened = {
                    ...block,
                    startMin: shortenedSlot,
                    endMin: shortenedSlot + block.minDuration,
                };
                placed.push(shortened);
                conflicts.push({
                    blockId: block.id,
                    blockTitle: block.title,
                    action: 'shortened',
                    originalStart,
                    originalEnd,
                    newStart: shortenedSlot,
                    newEnd: shortenedSlot + block.minDuration,
                    reason: `Sem espaço para duração completa. Encurtado para ${block.minDuration}min.`,
                });
                continue;
            }
        }

        // 6. Cannot place — suggest other day
        conflicts.push({
            blockId: block.id,
            blockTitle: block.title,
            action: 'suggest_other_day',
            originalStart,
            originalEnd,
            reason: `"${block.title}" não cabe hoje. Considere mover para outro dia.`,
        });
        warnings.push(`"${block.title}" não pôde ser alocado hoje.`);
    }

    // 7. Final assertion: sort by time and verify no overlaps
    placed.sort((a, b) => a.startMin - b.startMin);

    hasErrors = false;
    for (let i = 1; i < placed.length; i++) {
        if (placed[i].startMin < placed[i - 1].endMin) {
            hasErrors = true;
            warnings.push(
                `ERRO: Overlap detectado entre "${placed[i - 1].title}" e "${placed[i].title}". Isso não deveria acontecer.`
            );
        }
    }

    return { resolved: placed, conflicts, warnings, hasErrors };
}

// ===== Helpers =====

function findConflict(placed: SolverBlock[], candidate: SolverBlock): SolverBlock | null {
    for (const p of placed) {
        if (overlaps(p, candidate)) return p;
    }
    return null;
}

/**
 * Find nearest free slot of `duration` minutes, searching outward from `preferred`.
 * Returns start minute of the free slot, or null if none found within day bounds.
 */
function findNearestFreeSlot(
    placed: SolverBlock[],
    preferred: number,
    dur: number,
    dayStart: number,
    dayEnd: number
): number | null {
    // Build occupied intervals sorted by start
    const occupied = placed.map(b => ({ start: b.startMin, end: b.endMin })).sort((a, b) => a.start - b.start);

    // Try the preferred time first
    if (isSlotFree(occupied, preferred, preferred + dur, dayStart, dayEnd)) {
        return preferred;
    }

    // Search outward: alternate forward/backward in 5-minute steps
    const maxSearch = dayEnd - dayStart;
    for (let offset = 5; offset < maxSearch; offset += 5) {
        // Try forward
        const fwd = preferred + offset;
        if (fwd + dur <= dayEnd && isSlotFree(occupied, fwd, fwd + dur, dayStart, dayEnd)) {
            return fwd;
        }
        // Try backward
        const bwd = preferred - offset;
        if (bwd >= dayStart && bwd + dur <= dayEnd && isSlotFree(occupied, bwd, bwd + dur, dayStart, dayEnd)) {
            return bwd;
        }
    }

    return null;
}

function isSlotFree(
    occupied: { start: number; end: number }[],
    slotStart: number,
    slotEnd: number,
    dayStart: number,
    dayEnd: number
): boolean {
    if (slotStart < dayStart || slotEnd > dayEnd) return false;
    for (const o of occupied) {
        if (slotStart < o.end && slotEnd > o.start) return false;
    }
    return true;
}

// ===== Converter Helpers =====

/**
 * Convert DailyBlock (from DB) to SolverBlock for the solver.
 */
export function dailyBlockToSolverBlock(block: {
    id: string;
    title: string;
    category: string;
    start_datetime: string;
    end_datetime: string;
    source: string;
    locked?: boolean;
    meta?: Record<string, unknown>;
}): SolverBlock {
    const startDate = new Date(block.start_datetime);
    const endDate = new Date(block.end_datetime);
    const startMin = startDate.getHours() * 60 + startDate.getMinutes();
    const endMin = endDate.getHours() * 60 + endDate.getMinutes();
    const isDerived = !!(block.meta && block.meta['parentEventId']);

    return {
        id: block.id,
        title: block.title,
        category: block.category,
        startMin: roundToGrid(startMin),
        endMin: roundToGrid(endMin),
        source: block.source as 'fixed' | 'ai' | 'manual',
        priority: getPriorityForBlock(block.category, block.source, isDerived),
        parentEventId: block.meta?.parentEventId as string | undefined,
        canSplit: block.category === 'work' || block.category === 'study',
        minDuration: block.category === 'meal' ? 15 : 20,
        locked: block.locked || (block.meta?.locked === true) || block.source === 'fixed',
        meta: block.meta,
    };
}

/**
 * Convert SolverBlock back to partial DailyBlock fields (start/end datetime).
 */
export function solverBlockToTimeFields(
    solverBlock: SolverBlock,
    dateStr: string,
    timezone: string = 'America/Sao_Paulo'
): { start_datetime: string; end_datetime: string } {
    const startTime = minutesToTime(solverBlock.startMin);
    const endTime = minutesToTime(solverBlock.endMin);
    return {
        start_datetime: `${dateStr}T${startTime}:00`,
        end_datetime: `${dateStr}T${endTime}:00`,
    };
}
