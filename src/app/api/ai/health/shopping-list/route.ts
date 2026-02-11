import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { createShoppingListPrompt } from '@/ai/prompts/healthCoachPrompt';
import { ShoppingListAIResponseSchema } from '@/ai/schemas/aiSchemas';
import { parseAIResponse, loadHealthProfile, loadPantryItems, logAISuggestion } from '@/lib/ai/aiHelpers';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

        const body = await req.json();
        const { user_id, focus = 'alimentação saudável', days = 7 } = body;

        if (!user_id) {
            return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
        }

        // Load health profile
        const healthProfile = await loadHealthProfile(user_id);

        // Load pantry items
        const pantryItems = await loadPantryItems(user_id);

        // Load planned meals for the period
        const startDate = new Date().toISOString().split('T')[0];
        const endDate = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
        const { data: plannedMealsData } = await supabase
            .from('planned_meals')
            .select('name')
            .eq('user_id', user_id)
            .gte('date', startDate)
            .lte('date', endDate);
        const plannedMeals = (plannedMealsData || []).map(m => m.name);

        // Load user dislikes
        const { data: prefsData } = await supabase
            .from('user_preferences')
            .select('item_name')
            .eq('user_id', user_id)
            .in('preference_type', ['dislike', 'never'])
            .eq('category', 'food');
        const dislikes = (prefsData || []).map(p => p.item_name);

        // Build enhanced prompt
        const prompt = createShoppingListPrompt({
            forWhat: focus,
            days,
            healthProfile,
            pantryItems: pantryItems.map(i => ({
                name: i.name,
                qty_current: i.qty_current,
                qty_min: i.qty_min,
            })),
            plannedMeals,
            dislikes,
        });

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: { responseMimeType: 'application/json', temperature: 0.6 }
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const parsed = parseAIResponse(responseText, ShoppingListAIResponseSchema);

        if (!parsed.success) {
            console.error('Shopping list parse error:', parsed.error);
            return NextResponse.json({
                success: false,
                status: 'error',
                errorMessage: 'Não foi possível gerar a lista de compras.',
                retryHint: 'Tente novamente.',
            }, { status: 500 });
        }

        // Save to database
        const { data: savedList, error: saveError } = await supabase
            .from('shopping_list')
            .insert({
                user_id,
                title: parsed.data.title,
                items: parsed.data.items.map(item => ({
                    ...item,
                    checked: false,
                })),
                source: 'ai',
            })
            .select()
            .single();

        if (saveError) {
            console.error('Error saving shopping list:', saveError);
        }

        // Log for anti-repetition
        await logAISuggestion(user_id, 'shopping_list', parsed.data.title);

        return NextResponse.json({
            success: true,
            list: savedList || {
                title: parsed.data.title,
                items: parsed.data.items,
            },
            estimated_cost: parsed.data.estimated_cost,
            disclaimer: parsed.data.disclaimer,
        });

    } catch (error: any) {
        console.error('Shopping list error:', error);
        return NextResponse.json({
            success: false,
            status: 'error',
            errorMessage: error.message || 'Erro ao gerar lista de compras.',
            retryHint: 'Verifique sua conexão e tente novamente.',
        }, { status: 500 });
    }
}
