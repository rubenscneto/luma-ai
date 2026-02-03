import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

// Force dynamic to avoid static generation issues
export const dynamic = 'force-dynamic';

// Lazy initialization to avoid build-time execution
const getSupabase = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const getGenAI = () => new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const inputSchema = z.object({
    user_id: z.string().uuid(),
    date: z.string().optional(), // YYYY-MM-DD, defaults to today
    include_meals: z.boolean().default(true),
    include_workouts: z.boolean().default(true),
    plan_id: z.string().uuid().optional(), // If provided, blocks will be linked to this plan
});

const healthBlockSchema = z.object({
    title: z.string(),
    category: z.enum(['meal', 'health']),
    start_time: z.string().regex(/^\d{2}:\d{2}$/),
    end_time: z.string().regex(/^\d{2}:\d{2}$/),
    meta: z.object({
        meal_type: z.string().optional(),
        calories: z.number().optional(),
        exercises: z.array(z.string()).optional(),
        duration_minutes: z.number().optional(),
        intensity: z.string().optional(),
    }).optional(),
});

const aiResponseSchema = z.object({
    health_blocks: z.array(healthBlockSchema),
    summary: z.string(),
});

const HEALTH_BLOCKS_PROMPT = `
Você é um coach de saúde e nutrição especializado.

TAREFA: Gerar blocos de atividades de saúde para o plano diário do usuário.

REGRAS:
1. Gere blocos de refeições equilibradas ao longo do dia (café, almoço, lanche, jantar)
2. Inclua blocos de exercícios adequados ao nível do usuário
3. Use horários realistas (refeições entre 7h-21h, exercícios de manhã ou fim de tarde)
4. Considere o objetivo do usuário (perda de peso, ganho muscular, bem-estar, etc)
5. Evite sobreposição de horários
6. Blocos de refeição: 30-45 minutos
7. Blocos de exercício: 30-60 minutos dependendo do nível

FORMATO DE RESPOSTA JSON:
{
  "health_blocks": [
    {
      "title": "Nome do bloco",
      "category": "meal" | "health",
      "start_time": "HH:MM",
      "end_time": "HH:MM",
      "meta": {
        "meal_type": "breakfast" | "lunch" | "snack" | "dinner", // para meals
        "calories": 500, // estimativa para meals
        "exercises": ["nome do exercício"], // para health
        "duration_minutes": 30,
        "intensity": "low" | "medium" | "high"
      }
    }
  ],
  "summary": "Breve resumo do plano de saúde gerado"
}

Responda APENAS com o JSON, sem texto adicional.
`;

export async function POST(request: NextRequest) {
    try {
        const supabase = getSupabase();
        const genAI = getGenAI();

        const body = await request.json();
        const input = inputSchema.parse(body);

        const today = new Date();
        const dateStr = input.date || today.toISOString().split('T')[0];

        // Get user's health profile
        const { data: healthProfile } = await supabase
            .from('health_profile')
            .select('*')
            .eq('user_id', input.user_id)
            .single();

        if (!healthProfile) {
            return NextResponse.json({
                success: false,
                error: 'Health profile not found. Please set up your health profile first.',
            }, { status: 404 });
        }

        // Get existing blocks to avoid conflicts
        const { data: existingBlocks } = await supabase
            .from('daily_blocks')
            .select('start_datetime, end_datetime')
            .eq('user_id', input.user_id)
            .gte('start_datetime', `${dateStr}T00:00:00`)
            .lt('start_datetime', `${dateStr}T23:59:59`);

        const occupiedSlots = (existingBlocks || []).map(b => ({
            start: new Date(b.start_datetime).toTimeString().slice(0, 5),
            end: new Date(b.end_datetime).toTimeString().slice(0, 5),
        }));

        // Build context for AI
        const contextPrompt = `
DATA: ${dateStr}

PERFIL DE SAÚDE DO USUÁRIO:
- Objetivo: ${healthProfile.goal || 'bem-estar geral'}
- Nível de treino: ${healthProfile.training_level || 'iniciante'}
- Dias de treino por semana: ${healthProfile.workout_days_per_week || 3}
- Preferências alimentares: ${(healthProfile.dietary_preferences || []).join(', ') || 'nenhuma'}
- Alergias/Restrições: ${(healthProfile.allergies_restrictions || []).join(', ') || 'nenhuma'}
- Equipamentos disponíveis: ${(healthProfile.equipment || []).join(', ') || 'peso corporal'}

HORÁRIOS JÁ OCUPADOS (NÃO AGENDE NESSES HORÁRIOS):
${occupiedSlots.map(s => `- ${s.start} até ${s.end}`).join('\n') || 'Nenhum'}

GERAR:
${input.include_meals ? '- Blocos de refeições (café, almoço, lanche, jantar)' : ''}
${input.include_workouts ? '- Bloco de exercício adequado ao nível' : ''}

Considere que hoje é ${new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}.
`;

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: { responseMimeType: 'application/json' }
        });

        const prompt = `${HEALTH_BLOCKS_PROMPT}\n\n${contextPrompt}`;
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Parse response
        let parsed;
        try {
            const jsonStr = responseText.replace(/```json|```/g, '').trim();
            parsed = JSON.parse(jsonStr);
        } catch {
            const match = responseText.match(/\{[\s\S]*\}/);
            if (match) {
                parsed = JSON.parse(match[0]);
            } else {
                throw new Error('No JSON found in AI response');
            }
        }

        const validated = aiResponseSchema.parse(parsed);

        // If plan_id provided, insert blocks into database
        if (input.plan_id) {
            const blocksToInsert = validated.health_blocks.map((block, index) => ({
                plan_id: input.plan_id,
                user_id: input.user_id,
                title: block.title,
                category: block.category,
                start_datetime: `${dateStr}T${block.start_time}:00`,
                end_datetime: `${dateStr}T${block.end_time}:00`,
                source: 'ai_health',
                order_index: 100 + index, // Higher order to place after other blocks
                is_done: false,
                is_skipped: false,
                meta: block.meta || {},
            }));

            const { error: insertError } = await supabase
                .from('daily_blocks')
                .insert(blocksToInsert);

            if (insertError) {
                console.error('Insert health blocks error:', insertError);
                // Continue anyway, just report we couldn't save
            }
        }

        return NextResponse.json({
            success: true,
            blocks: validated.health_blocks,
            summary: validated.summary,
            plan_id: input.plan_id,
        });

    } catch (error: any) {
        console.error('Generate health blocks error:', error);

        // Return fallback blocks
        return NextResponse.json({
            success: false,
            error: error.message,
            blocks: [
                {
                    title: 'Café da manhã nutritivo',
                    category: 'meal',
                    start_time: '07:30',
                    end_time: '08:00',
                    meta: { meal_type: 'breakfast', calories: 400 }
                },
                {
                    title: 'Almoço saudável',
                    category: 'meal',
                    start_time: '12:30',
                    end_time: '13:15',
                    meta: { meal_type: 'lunch', calories: 600 }
                },
                {
                    title: 'Lanche da tarde',
                    category: 'meal',
                    start_time: '16:00',
                    end_time: '16:30',
                    meta: { meal_type: 'snack', calories: 200 }
                },
                {
                    title: 'Jantar leve',
                    category: 'meal',
                    start_time: '19:30',
                    end_time: '20:15',
                    meta: { meal_type: 'dinner', calories: 500 }
                },
            ],
            summary: 'Plano de refeições básico (fallback)',
        }, { status: 500 });
    }
}
