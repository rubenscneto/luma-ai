import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/ai/gemini';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { PROGRESSION_SYSTEM_PROMPT, buildProgressionPrompt } from '@/ai/prompts/trainingPrompts';
import { parseAIResponse, loadHealthProfile } from '@/lib/ai/aiHelpers';

export const dynamic = 'force-dynamic';

const progressionSchema = z.object({
    progressions: z.array(z.object({
        exerciseId: z.string(),
        exerciseName: z.string(),
        suggestion: z.string(),
        type: z.enum(['increase_weight', 'increase_reps', 'decrease_rest', 'maintain', 'deload']),
        detail: z.string(),
    })),
    overallMessage: z.string(),
    estimatedCalories: z.number().optional(),
    shouldAskWeight: z.boolean().optional(),
    disclaimer: z.string().optional(),
});

export async function POST(req: NextRequest) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const model = getGeminiModel({ temperature: 0.5 });

        const body = await req.json();
        const { user_id } = body;

        if (!user_id) {
            return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
        }

        // Load last 4 sessions
        const { data: sessions } = await supabase
            .from('workout_sessions')
            .select('*')
            .eq('user_id', user_id)
            .eq('status', 'completed')
            .order('date', { ascending: false })
            .limit(4);

        if (!sessions || sessions.length === 0) {
            return NextResponse.json({
                success: true,
                status: 'empty',
                message: 'Ainda não há sessões suficientes para analisar progressão. Continue treinando!',
                progressions: [],
            });
        }

        // Load sets for these sessions
        const sessionIds = sessions.map(s => s.id);
        const { data: allSets } = await supabase
            .from('workout_sets')
            .select('*')
            .in('session_id', sessionIds)
            .order('set_number', { ascending: true });

        // Load current plan to get target reps
        const { data: currentPlan } = await supabase
            .from('training_plan_weekly')
            .select('plan_data')
            .eq('user_id', user_id)
            .order('week_start', { ascending: false })
            .limit(1)
            .single();

        // Build exercise history
        const exerciseMap: Record<string, {
            exerciseName: string;
            targetReps: string;
            sessions: { date: string; sets: { weight: number; reps: number; rpe?: number }[] }[];
        }> = {};

        for (const session of sessions) {
            const sessionSets = (allSets || []).filter(s => s.session_id === session.id);
            const exerciseIds = [...new Set(sessionSets.map(s => s.exercise_id))];

            for (const exId of exerciseIds) {
                if (!exerciseMap[exId]) {
                    const exSets = sessionSets.filter(s => s.exercise_id === exId);
                    // Try to find target reps from plan
                    let targetReps = '8-12';
                    if (currentPlan?.plan_data) {
                        for (const day of currentPlan.plan_data) {
                            const planEx = day.workout?.find((w: any) => w.exerciseId === exId);
                            if (planEx) {
                                targetReps = planEx.repsTarget;
                                break;
                            }
                        }
                    }
                    exerciseMap[exId] = {
                        exerciseName: exSets[0]?.exercise_name || exId,
                        targetReps,
                        sessions: [],
                    };
                }

                const exSets = sessionSets.filter(s => s.exercise_id === exId);
                exerciseMap[exId].sessions.push({
                    date: session.date,
                    sets: exSets.map(s => ({
                        weight: s.weight_kg || 0,
                        reps: s.reps || 0,
                        rpe: s.rpe || undefined,
                    })),
                });
            }
        }

        const healthProfile = await loadHealthProfile(user_id);

        // Get latest body weight
        const { data: latestWeight } = await supabase
            .from('body_metrics')
            .select('weight_kg')
            .eq('user_id', user_id)
            .order('date', { ascending: false })
            .limit(1)
            .single();

        const prompt = buildProgressionPrompt({
            exerciseHistory: Object.entries(exerciseMap).map(([id, data]) => ({
                exerciseId: id,
                ...data,
            })),
            bodyWeightKg: latestWeight?.weight_kg || healthProfile?.weight_kg,
            sessionDurationMin: sessions[0]?.duration_min,
        });


        const result = await model.generateContent({
            contents: [
                { role: 'user', parts: [{ text: PROGRESSION_SYSTEM_PROMPT }] },
                { role: 'model', parts: [{ text: 'Entendido. Aguardo o histórico para analisar progressão.' }] },
                { role: 'user', parts: [{ text: prompt }] },
            ],
        });

        const parsed = parseAIResponse(result.response.text(), progressionSchema);

        if (!parsed.success) {
            return NextResponse.json({
                success: false,
                status: 'error',
                errorMessage: 'Não foi possível analisar a progressão.',
                retryHint: 'Tente novamente.',
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            ...parsed.data,
        });

    } catch (error: any) {
        console.error('Progression analysis error:', error);
        return NextResponse.json({
            success: false,
            status: 'error',
            errorMessage: error.message || 'Erro ao analisar progressão.',
            retryHint: 'Tente novamente.',
        }, { status: 500 });
    }
}
