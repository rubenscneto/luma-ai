import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { WEEKLY_HABITS_PROMPT } from '@/ai/prompts/healthCoachPrompt';
import { WeeklyHabitsAIResponseSchema } from '@/ai/schemas/aiSchemas';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { user_id } = body;

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
PERFIL DO USUÁRIO:
- Objetivo principal: ${healthProfile?.goal || 'bem-estar geral'}
- Nível de atividade: ${healthProfile?.training_level || 'iniciante'}
- Horário de acordar: ${healthProfile?.wake_time || '07:00'}
- Horário de dormir: ${healthProfile?.sleep_time || '22:00'}
- Equipamentos disponíveis: ${(healthProfile?.equipment || []).join(', ') || 'nenhum específico'}

Gere sugestões de hábitos semanais alinhados com o objetivo do usuário.
`;

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: { responseMimeType: 'application/json' }
        });

        const prompt = `${WEEKLY_HABITS_PROMPT}\n\n${contextPrompt}`;

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
        const validated = WeeklyHabitsAIResponseSchema.parse(parsed);

        return NextResponse.json({
            success: true,
            habits: validated.habits,
            weekly_focus: validated.weekly_focus,
            disclaimer: validated.disclaimer,
        });

    } catch (error: any) {
        console.error('Weekly habits error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            habits: [
                {
                    title: 'Caminhada matinal',
                    description: 'Uma caminhada leve para começar o dia',
                    frequency: 'diário',
                    best_time: '07:00',
                    duration_minutes: 20,
                },
                {
                    title: 'Hidratação',
                    description: 'Beber água regularmente',
                    frequency: 'a cada 2 horas',
                    best_time: 'ao longo do dia',
                    duration_minutes: 1,
                }
            ],
            weekly_focus: 'Começar devagar e construir consistência',
            disclaimer: 'Sugestões gerais. Consulte um profissional de saúde.'
        }, { status: 500 });
    }
}
