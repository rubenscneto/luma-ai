import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { TRAINING_PLAN_SYSTEM_PROMPT, buildTrainingPlanPrompt } from '@/ai/prompts/trainingPrompts';
import { parseAIResponse, loadHealthProfile, logAISuggestion } from '@/lib/ai/aiHelpers';

export const dynamic = 'force-dynamic';

const exerciseSchema = z.object({
    exerciseId: z.string(),
    name: z.string(),
    machineOrType: z.string(),
    setsTarget: z.number(),
    repsTarget: z.string(),
    restSecTarget: z.number(),
    notes: z.string().optional(),
});

const daySchema = z.object({
    dayOfWeek: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
    focus: z.string(),
    workout: z.array(exerciseSchema),
});

const responseSchema = z.object({
    weekPlan: z.array(daySchema),
    rationale: z.string().optional(),
    disclaimer: z.string().optional(),
});

export async function POST(req: NextRequest) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

        const body = await req.json();
        const { user_id, goal, level, time_per_session_min, equipment, restrictions, days_per_week } = body;

        if (!user_id) {
            return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
        }

        const healthProfile = await loadHealthProfile(user_id);

        const prompt = buildTrainingPlanPrompt({
            goal: goal || healthProfile?.goal || 'general',
            level: level || healthProfile?.training_level || 'beginner',
            timePerSessionMin: time_per_session_min || 60,
            equipment: equipment || healthProfile?.equipment || [],
            restrictions: restrictions || healthProfile?.allergies_restrictions || [],
            daysPerWeek: days_per_week,
            healthProfile: healthProfile ? {
                goal: healthProfile.goal,
                wake_time: healthProfile.wake_time,
                sleep_time: healthProfile.sleep_time,
                weight_kg: healthProfile.weight_kg,
                height_cm: healthProfile.height_cm,
            } : undefined,
        });

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
        });

        const result = await model.generateContent({
            contents: [
                { role: 'user', parts: [{ text: TRAINING_PLAN_SYSTEM_PROMPT }] },
                { role: 'model', parts: [{ text: 'Entendido. Aguardo os dados para gerar o plano de treino semanal.' }] },
                { role: 'user', parts: [{ text: prompt }] },
            ],
        });

        const responseText = result.response.text();
        const parsed = parseAIResponse(responseText, responseSchema);

        if (!parsed.success) {
            return NextResponse.json({
                success: false,
                status: 'error',
                errorMessage: 'Não foi possível gerar o plano de treino.',
                retryHint: 'Tente novamente.',
            }, { status: 500 });
        }

        // Calculate week start (Monday)
        const now = new Date();
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() + mondayOffset);
        const weekStartStr = weekStart.toISOString().split('T')[0];

        // Save to DB
        const { data: savedPlan, error: saveError } = await supabase
            .from('training_plan_weekly')
            .upsert({
                user_id,
                week_start: weekStartStr,
                plan_data: parsed.data.weekPlan,
                goal: goal || healthProfile?.goal,
                level: level || healthProfile?.training_level,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,week_start' })
            .select()
            .single();

        if (saveError) {
            // If upsert fails (no unique constraint), try insert
            const { data: insertedPlan } = await supabase
                .from('training_plan_weekly')
                .insert({
                    user_id,
                    week_start: weekStartStr,
                    plan_data: parsed.data.weekPlan,
                    goal: goal || healthProfile?.goal,
                    level: level || healthProfile?.training_level,
                })
                .select()
                .single();

            await logAISuggestion(user_id, 'training_plan', parsed.data.weekPlan.map(d => d.focus).join(', '));

            return NextResponse.json({
                success: true,
                plan: insertedPlan,
                rationale: parsed.data.rationale,
            });
        }

        await logAISuggestion(user_id, 'training_plan', parsed.data.weekPlan.map(d => d.focus).join(', '));

        return NextResponse.json({
            success: true,
            plan: savedPlan,
            rationale: parsed.data.rationale,
        });

    } catch (error: any) {
        console.error('Training plan generation error:', error);
        return NextResponse.json({
            success: false,
            status: 'error',
            errorMessage: error.message || 'Erro ao gerar plano de treino.',
            retryHint: 'Tente novamente em alguns segundos.',
        }, { status: 500 });
    }
}
