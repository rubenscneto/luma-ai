import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Safe JSON parse + Zod validation
export function parseAIResponse<T>(
    text: string,
    schema: z.ZodType<T>
): { success: true; data: T } | { success: false; error: string } {
    try {
        // Strip markdown code fences if present
        const cleaned = text.replace(/```json\s*|```\s*/g, '').trim();
        let parsed: unknown;

        try {
            parsed = JSON.parse(cleaned);
        } catch {
            // Try to extract JSON from text
            const match = cleaned.match(/\{[\s\S]*\}/);
            if (match) {
                parsed = JSON.parse(match[0]);
            } else {
                return { success: false, error: 'No valid JSON found in AI response' };
            }
        }

        const validated = schema.parse(parsed);
        return { success: true, data: validated };
    } catch (err: any) {
        console.error('AI response parse/validate error:', err);
        return { success: false, error: err.message || 'Validation failed' };
    }
}

// Get Supabase admin client (server-side only)
function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

// Build memory context for a user (recent 7-14 days)
export async function buildMemoryContext(userId: string) {
    const supabase = getSupabaseAdmin();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysStr = sevenDaysAgo.toISOString().split('T')[0];

    // Recent planned meals
    const { data: recentMeals } = await supabase
        .from('planned_meals')
        .select('name, meal_type, date')
        .eq('user_id', userId)
        .gte('date', sevenDaysStr)
        .order('date', { ascending: false })
        .limit(30);

    // Recent agenda blocks
    const { data: recentBlocks } = await supabase
        .from('daily_blocks')
        .select('title, category, start_datetime')
        .eq('user_id', userId)
        .gte('start_datetime', sevenDaysAgo.toISOString())
        .order('start_datetime', { ascending: false })
        .limit(30);

    // Recent workout sessions
    const { data: recentWorkouts } = await supabase
        .from('workout_sessions')
        .select('focus, date, duration_min')
        .eq('user_id', userId)
        .gte('date', sevenDaysStr)
        .order('date', { ascending: false })
        .limit(10);

    // User preferences (dislikes & favorites)
    const { data: preferences } = await supabase
        .from('user_preferences')
        .select('item_name, preference_type, category')
        .eq('user_id', userId);

    const dislikes = (preferences || [])
        .filter(p => p.preference_type === 'dislike' || p.preference_type === 'never')
        .map(p => p.item_name);

    const favorites = (preferences || [])
        .filter(p => p.preference_type === 'like')
        .map(p => p.item_name);

    return {
        recentMeals: (recentMeals || []).map(m => `${m.name} (${m.meal_type})`),
        recentAgendaBlocks: (recentBlocks || []).map(b => `${b.title} (${b.category})`),
        recentWorkouts: (recentWorkouts || []).map(w => `${w.focus} - ${w.duration_min}min`),
        dislikes,
        favorites,
    };
}

// Get already suggested items for a feature (anti-repetition)
export async function getAlreadySuggested(
    userId: string,
    feature: string,
    daysBack: number = 7
): Promise<string[]> {
    const supabase = getSupabaseAdmin();
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    const { data } = await supabase
        .from('ai_suggestion_log')
        .select('suggestion_key')
        .eq('user_id', userId)
        .eq('suggestion_type', feature)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

    return (data || []).map(d => d.suggestion_key).filter(Boolean);
}

// Log an AI suggestion for future anti-repetition
export async function logAISuggestion(
    userId: string,
    feature: string,
    outputSummary: string,
    metadata?: Record<string, any>
): Promise<void> {
    const supabase = getSupabaseAdmin();

    await supabase.from('ai_suggestion_log').insert({
        user_id: userId,
        suggestion_type: feature,
        suggestion_key: outputSummary,
        suggestion_meta: metadata || {},
    });
}

// Load health profile for a user (commonly needed)
export async function loadHealthProfile(userId: string) {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
        .from('health_profile')
        .select('*')
        .eq('user_id', userId)
        .single();

    return data;
}

// Load pantry items for a user
export async function loadPantryItems(userId: string) {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
        .from('pantry_items')
        .select('*')
        .eq('user_id', userId)
        .order('category', { ascending: true });

    return data || [];
}
