import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { createMealSuggestionPrompt } from '@/ai/prompts/healthCoachPrompt';
import { MealSuggestionSchema } from '@/ai/schemas/aiSchemas';
import { parseAIResponse, getAlreadySuggested, logAISuggestion, loadHealthProfile } from '@/lib/ai/aiHelpers';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

        const body = await req.json();
        const { user_id, meal_type = 'lunch', cooking_time_available } = body;

        if (!user_id) {
            return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
        }

        // Load health profile
        const healthProfile = await loadHealthProfile(user_id);

        // Load recent meals (last 7 days) for anti-repetition
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { data: recentMealsData } = await supabase
            .from('planned_meals')
            .select('name, meal_type')
            .eq('user_id', user_id)
            .gte('date', sevenDaysAgo.toISOString().split('T')[0])
            .order('date', { ascending: false })
            .limit(20);

        const recentMeals = (recentMealsData || []).map(m => m.name);

        // Load user preferences (dislikes)
        const { data: prefsData } = await supabase
            .from('user_preferences')
            .select('item_name')
            .eq('user_id', user_id)
            .in('preference_type', ['dislike', 'never'])
            .eq('category', 'food');

        const dislikes = (prefsData || []).map(p => p.item_name);

        // Also get AI suggestion history
        const alreadySuggested = await getAlreadySuggested(user_id, `meal_${meal_type}`, 7);

        // Build enhanced prompt
        const prompt = createMealSuggestionPrompt({
            mealType: meal_type,
            healthProfile,
            preferences: healthProfile?.dietary_preferences || [],
            restrictions: healthProfile?.allergies_restrictions || [],
            recentMeals: [...recentMeals, ...alreadySuggested],
            dislikes,
            cookingTimeAvailable: cooking_time_available,
        });

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: { responseMimeType: 'application/json', temperature: 0.8 }
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const parsed = parseAIResponse(responseText, MealSuggestionSchema);

        if (!parsed.success) {
            console.error('Meal suggestion parse error:', parsed.error);
            return NextResponse.json({
                success: false,
                status: 'error',
                errorMessage: 'Não foi possível gerar a sugestão de refeição.',
                retryHint: 'Tente novamente.',
            }, { status: 500 });
        }

        // Log for anti-repetition
        await logAISuggestion(
            user_id,
            `meal_${meal_type}`,
            parsed.data.meal.name,
            { ingredients: parsed.data.meal.ingredients.map((i: any) => i.name) }
        );

        // Save to planned_meals (persist)
        const today = new Date().toISOString().split('T')[0];
        const mealData = {
            user_id,
            date: today,
            meal_type,
            name: parsed.data.meal.name,
            description: parsed.data.meal.description,
            prep_time_min: parsed.data.meal.prep_time,
            ingredients: parsed.data.meal.ingredients,
            instructions: parsed.data.meal.instructions,
            nutrition: parsed.data.meal.nutritionEstimate || {},
            why_fits_user: parsed.data.meal.whyFitsUser || '',
            alternatives: parsed.data.meal.alternatives || [],
        };

        const { error: upsertError } = await supabase.from('planned_meals')
            .upsert(mealData, { onConflict: 'user_id,date,meal_type' });

        if (upsertError) {
            // Fallback: try insert if upsert fails
            await supabase.from('planned_meals').insert(mealData);
        }

        return NextResponse.json({
            success: true,
            meal_type,
            suggestion: parsed.data,
        });

    } catch (error: any) {
        console.error('Meal suggestion error:', error);
        return NextResponse.json({
            success: false,
            status: 'error',
            errorMessage: error.message || 'Erro ao gerar sugestão de refeição.',
            retryHint: 'Verifique sua conexão e tente novamente.',
        }, { status: 500 });
    }
}
