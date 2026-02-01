import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { MEAL_SUGGESTION_PROMPT } from '@/ai/prompts/healthCoachPrompt';
import { MealSuggestionSchema } from '@/ai/schemas/aiSchemas';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { user_id, meal_type = 'lunch' } = body;

        if (!user_id) {
            return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Load health profile
        const { data: healthProfile } = await supabase
            .from('health_profile')
            .select('*')
            .eq('user_id', user_id)
            .single();

        // Build context
        const mealTypeLabels: Record<string, string> = {
            breakfast: 'café da manhã',
            lunch: 'almoço',
            dinner: 'jantar',
            snack: 'lanche'
        };
        const mealTypeLabel = mealTypeLabels[meal_type] || 'refeição';

        const contextPrompt = `
TIPO DE REFEIÇÃO: ${mealTypeLabel}

PERFIL DO USUÁRIO:
- Objetivo: ${healthProfile?.goal || 'bem-estar geral'}
- Nível de treino: ${healthProfile?.training_level || 'iniciante'}
- Preferências alimentares: ${(healthProfile?.dietary_preferences || []).join(', ') || 'nenhuma'}
- Alergias/Restrições: ${(healthProfile?.allergies_restrictions || []).join(', ') || 'nenhuma'}
- Equipamentos disponíveis: ${(healthProfile?.equipment || []).join(', ') || 'cozinha básica'}

Gere uma sugestão de ${mealTypeLabel} saudável e prática, considerando o perfil acima.
`;

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: { responseMimeType: 'application/json' }
        });

        const prompt = `${MEAL_SUGGESTION_PROMPT}\n\n${contextPrompt}`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        let parsed;
        try {
            const jsonStr = responseText.replace(/```json|```/g, '').trim();
            parsed = JSON.parse(jsonStr);
        } catch {
            const match = responseText.match(/\{[\s\S]*\}/);
            if (match) {
                parsed = JSON.parse(match[0]);
            } else {
                throw new Error('No JSON found in response');
            }
        }

        // Validate with Zod
        const validated = MealSuggestionSchema.parse(parsed);

        return NextResponse.json({
            success: true,
            meal_type: meal_type,
            suggestion: validated,
        });

    } catch (error: any) {
        console.error('Meal suggestion error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            suggestion: {
                meal: {
                    name: 'Salada Nutritiva',
                    description: 'Uma salada simples e saudável',
                    prep_time: 15,
                    ingredients: [
                        { name: 'Folhas verdes', quantity: '100', unit: 'g' },
                        { name: 'Tomate', quantity: '1', unit: 'unidade' },
                        { name: 'Azeite', quantity: '1', unit: 'colher de sopa' }
                    ],
                    instructions: ['Lave as folhas', 'Corte o tomate', 'Tempere com azeite'],
                },
                disclaimer: 'Sugestão genérica. Consulte um nutricionista para orientação personalizada.'
            }
        }, { status: 500 });
    }
}
