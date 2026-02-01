import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { SHOPPING_LIST_PROMPT } from '@/ai/prompts/healthCoachPrompt';
import { ShoppingListAIResponseSchema } from '@/ai/schemas/aiSchemas';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { user_id, focus = 'alimentação saudável', days = 7 } = body;

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

        const contextPrompt = `
FOCO DA LISTA: ${focus}
PERÍODO: ${days} dias

PERFIL DO USUÁRIO:
- Objetivo: ${healthProfile?.goal || 'bem-estar geral'}
- Preferências alimentares: ${(healthProfile?.dietary_preferences || []).join(', ') || 'nenhuma'}
- Alergias/Restrições: ${(healthProfile?.allergies_restrictions || []).join(', ') || 'nenhuma'}

Gere uma lista de compras organizada por categoria para ${days} dias, considerando o perfil acima.
`;

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: { responseMimeType: 'application/json' }
        });

        const prompt = `${SHOPPING_LIST_PROMPT}\n\n${contextPrompt}`;

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
        const validated = ShoppingListAIResponseSchema.parse(parsed);

        // Save to database
        const { data: savedList, error: saveError } = await supabase
            .from('shopping_list')
            .insert({
                user_id,
                title: validated.title,
                items: validated.items.map(item => ({
                    ...item,
                    checked: false
                })),
                source: 'ai',
            })
            .select()
            .single();

        if (saveError) {
            console.error('Error saving shopping list:', saveError);
        }

        return NextResponse.json({
            success: true,
            list: savedList || {
                title: validated.title,
                items: validated.items,
            },
            estimated_cost: validated.estimated_cost,
            disclaimer: validated.disclaimer,
        });

    } catch (error: any) {
        console.error('Shopping list error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            list: {
                title: 'Lista Básica',
                items: [
                    { name: 'Frutas variadas', qty: 1, unit: 'kg', category: 'frutas' },
                    { name: 'Verduras', qty: 1, unit: 'maço', category: 'verduras' },
                    { name: 'Proteína', qty: 500, unit: 'g', category: 'proteinas' },
                ],
            },
            disclaimer: 'Lista genérica. Personalize de acordo com suas necessidades.'
        }, { status: 500 });
    }
}
