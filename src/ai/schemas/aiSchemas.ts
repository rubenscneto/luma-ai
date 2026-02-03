import { z } from 'zod';

// Block Categories
export const BlockCategorySchema = z.enum([
    'work', 'study', 'health', 'leisure', 'admin', 'sleep', 'meal', 'commute', 'fixed'
]);

export type BlockCategory = z.infer<typeof BlockCategorySchema>;

// Block Sources
export const BlockSourceSchema = z.enum(['fixed', 'ai', 'manual']);
export type BlockSource = z.infer<typeof BlockSourceSchema>;

// ========== Assistant Actions Schema ==========

export const AssistantActionSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('ask_user'),
        questions: z.array(z.string()),
    }),
    z.object({
        type: z.literal('create_daily_block'),
        title: z.string(),
        category: BlockCategorySchema,
        start_datetime: z.string(),
        end_datetime: z.string(),
        meta: z.record(z.string(), z.any()).optional(),
    }),
    z.object({
        type: z.literal('update_daily_block'),
        block_id: z.string(),
        updates: z.record(z.string(), z.any()),
    }),
    z.object({
        type: z.literal('delete_daily_block'),
        block_id: z.string(),
    }),
    z.object({
        type: z.literal('mark_done'),
        block_id: z.string(),
    }),
    z.object({
        type: z.literal('mark_skip'),
        block_id: z.string(),
        skip_reason: z.string().optional(),
    }),
    z.object({
        type: z.literal('create_fixed_block'),
        title: z.string(),
        category: BlockCategorySchema,
        day_of_week: z.number().min(0).max(6),
        start_time: z.string(),
        end_time: z.string(),
    }),
    z.object({
        type: z.literal('update_fixed_block'),
        block_id: z.string(),
        updates: z.record(z.string(), z.any()),
    }),
    z.object({
        type: z.literal('delete_fixed_block'),
        block_id: z.string(),
    }),
    z.object({
        type: z.literal('trigger_replan'),
        reason: z.string(),
    }),
    z.object({
        type: z.literal('plan_day'),
        date: z.string().optional(),
        mode: z.enum(['first_time', 'regenerate', 'fill_gaps']).optional(),
    }),
    z.object({
        type: z.literal('create_shopping_list'),
        title: z.string(),
        items: z.array(z.object({
            name: z.string(),
            qty: z.number().optional(),
            unit: z.string().optional(),
        })),
    }),
    z.object({
        type: z.literal('add_shopping_items'),
        list_id: z.string(),
        items: z.array(z.object({
            name: z.string(),
            qty: z.number().optional(),
            unit: z.string().optional(),
        })),
    }),
    z.object({
        type: z.literal('update_health_profile'),
        updates: z.record(z.string(), z.any()),
    }),
    z.object({
        type: z.literal('generate_daily_plan'),
    }),
]);

export type AssistantAction = z.infer<typeof AssistantActionSchema>;

export const AssistantActionsAIResponseSchema = z.object({
    message_to_user: z.string(),
    actions: z.array(AssistantActionSchema),
});

export type AssistantActionsAIResponse = z.infer<typeof AssistantActionsAIResponseSchema>;

// ========== Daily Plan Schema ==========

export const DailyPlanBlockSchema = z.object({
    title: z.string(),
    category: BlockCategorySchema,
    start: z.string(), // ISO datetime
    end: z.string(), // ISO datetime
    notes: z.string().optional(),
    meta: z.record(z.string(), z.any()).optional(),
});

export const DailyPlanAIResponseSchema = z.object({
    blocks: z.array(DailyPlanBlockSchema),
    summary: z.string(),
    insight: z.string().optional(),
});

export type DailyPlanAIResponse = z.infer<typeof DailyPlanAIResponseSchema>;

// ========== Replan Schema ==========

export const ReplanBlockUpdateSchema = z.object({
    id: z.string(),
    start_datetime: z.string(),
    end_datetime: z.string(),
    notes: z.string().optional(),
});

export const ReplanAIResponseSchema = z.object({
    updated_blocks: z.array(ReplanBlockUpdateSchema),
    removed_blocks: z.array(z.string()).optional(),
    message: z.string(),
    warning: z.string().optional(),
});

export type ReplanAIResponse = z.infer<typeof ReplanAIResponseSchema>;

// ========== Health Schemas ==========

export const MealIngredientSchema = z.object({
    name: z.string(),
    quantity: z.string(),
    unit: z.string(),
});

export const MealSuggestionSchema = z.object({
    meal: z.object({
        name: z.string(),
        description: z.string(),
        prep_time: z.number(),
        ingredients: z.array(MealIngredientSchema),
        instructions: z.array(z.string()),
        alternatives: z.array(z.string()).optional(),
    }),
    tip: z.string().optional(),
    disclaimer: z.string(),
});

export type MealSuggestion = z.infer<typeof MealSuggestionSchema>;

export const ShoppingItemSchema = z.object({
    name: z.string(),
    qty: z.number().optional(),
    unit: z.string().optional(),
    category: z.string().optional(),
    checked: z.boolean().optional(),
});

export const ShoppingListAIResponseSchema = z.object({
    title: z.string(),
    items: z.array(ShoppingItemSchema),
    estimated_cost: z.enum(['baixo', 'médio', 'alto']).optional(),
    disclaimer: z.string(),
});

export type ShoppingListAIResponse = z.infer<typeof ShoppingListAIResponseSchema>;

export const HabitSchema = z.object({
    title: z.string(),
    description: z.string(),
    frequency: z.string(),
    best_time: z.string(),
    duration_minutes: z.number(),
});

export const WeeklyHabitsAIResponseSchema = z.object({
    habits: z.array(HabitSchema),
    weekly_focus: z.string(),
    disclaimer: z.string(),
});

export type WeeklyHabitsAIResponse = z.infer<typeof WeeklyHabitsAIResponseSchema>;
