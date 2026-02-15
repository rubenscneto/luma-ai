/**
 * Derived Blocks — Anchored meal-pause generator
 *
 * Creates "Pausa pós-refeição" blocks anchored to parent meal blocks.
 * Only creates if parent meal exists on the same day.
 */

import { SolverBlock, roundToGrid } from './timelineSolver';

export interface DerivedBlockConfig {
    defaultDuration: number;    // minutes, default 30
    maxOffsetFromMeal: number;  // minutes, default 120
    mealCategories: string[];   // categories that trigger pauses
}

const DEFAULT_CONFIG: DerivedBlockConfig = {
    defaultDuration: 30,
    maxOffsetFromMeal: 120,
    mealCategories: ['meal'],
};

/**
 * Identify meal blocks and generate derived pause blocks.
 * Returns only the NEW derived blocks (not the originals).
 */
export function generateDerivedBlocks(
    blocks: SolverBlock[],
    config: Partial<DerivedBlockConfig> = {}
): SolverBlock[] {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const derived: SolverBlock[] = [];

    // Find meal blocks
    const mealBlocks = blocks.filter(b => cfg.mealCategories.includes(b.category));

    for (const meal of mealBlocks) {
        // Check if a derived block already exists for this meal
        const existingDerived = blocks.find(b => b.parentEventId === meal.id);
        if (existingDerived) continue;

        // Create pause block immediately after meal
        const pauseStart = meal.endMin;
        const pauseEnd = roundToGrid(pauseStart + cfg.defaultDuration);

        // Validate: pause must be within maxOffsetFromMeal
        if (pauseStart - meal.endMin > cfg.maxOffsetFromMeal) continue;

        // Label based on meal title
        const mealTitle = meal.title.toLowerCase();
        let pauseTitle = 'Pausa pós-refeição';
        if (mealTitle.includes('almoço') || mealTitle.includes('almoco')) {
            pauseTitle = 'Pausa pós-almoço';
        } else if (mealTitle.includes('jantar')) {
            pauseTitle = 'Pausa pós-jantar';
        } else if (mealTitle.includes('café') || mealTitle.includes('cafe')) {
            pauseTitle = 'Pausa pós-café';
        }

        const derivedBlock: SolverBlock = {
            id: `derived_${meal.id}`,
            title: pauseTitle,
            category: 'leisure',
            startMin: pauseStart,
            endMin: pauseEnd,
            source: 'ai',
            priority: 40, // low priority, solver can move it
            parentEventId: meal.id,
            canShorten: true,
            canSplit: false,
            minDuration: 15,
            meta: {
                parentEventId: meal.id,
                isDerived: true,
                derivedType: 'meal_pause',
            },
        };

        derived.push(derivedBlock);
    }

    return derived;
}

/**
 * Remove any orphaned derived blocks (parent meal no longer exists).
 */
export function pruneOrphanedDerived(blocks: SolverBlock[]): SolverBlock[] {
    const mealIds = new Set(blocks.filter(b => b.category === 'meal').map(b => b.id));

    return blocks.filter(b => {
        if (!b.parentEventId) return true; // not derived
        return mealIds.has(b.parentEventId); // keep only if parent exists
    });
}

/**
 * Full pipeline: generate derived + prune orphans.
 * Returns the complete block list with valid derived blocks.
 */
export function processDerivedBlocks(
    blocks: SolverBlock[],
    config: Partial<DerivedBlockConfig> = {}
): SolverBlock[] {
    // 1. Prune orphaned derived blocks
    const pruned = pruneOrphanedDerived(blocks);

    // 2. Generate new derived blocks
    const newDerived = generateDerivedBlocks(pruned, config);

    // 3. Combine
    return [...pruned, ...newDerived];
}
