import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getGeminiModel } from '@/lib/ai/gemini';
import { z } from 'zod';
import { AGENDA_PLANNER_SYSTEM_PROMPT, buildPlanDayPrompt } from '@/ai/prompts/agendaPrompts';
import { solveTimeline, dailyBlockToSolverBlock, solverBlockToTimeFields, SolverBlock } from '@/lib/timelineSolver';
import { processDerivedBlocks } from '@/lib/derivedBlocks';
import { validateMealWindow, normalizeForComparison } from '@/lib/mealWindows';
import { persistDailyBlocks, BlockInput } from '@/lib/persistDailyBlocks';
import { splitOvernightBlocks } from '@/lib/overnightSplit';

export const dynamic = 'force-dynamic';

const planWeekInputSchema = z.object({
    user_id: z.string().uuid(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // Sunday of the week
    timezone: z.string().default('America/Sao_Paulo'),
    days_to_plan: z.array(z.number().min(0).max(6)).optional(),
    debug: z.boolean().optional().default(false),
    action: z.string().optional(),
    feedbacks: z.array(z.any()).optional(),
});

const aiBlockSchema = z.object({
    title: z.string(),
    category: z.enum(['work', 'study', 'health', 'leisure', 'admin', 'sleep', 'meal', 'commute', 'fixed']),
    start_time: z.string().regex(/^\d{2}:\d{2}$/),
    end_time: z.string().regex(/^\d{2}:\d{2}$/),
    suggested_reason: z.string().optional(),
    energyLevel: z.enum(['low', 'medium', 'high']).optional(),
});

const aiDaySchema = z.object({
    date: z.string(),
    blocks: z.array(aiBlockSchema),
    summary: z.string(),
});

const aiWeekResponseSchema = z.object({
    days: z.array(aiDaySchema),
    weekSummary: z.string(),
    weekInsight: z.string().optional(),
});

function getDayOfWeek(dateStr: string): number {
    const date = new Date(dateStr + 'T12:00:00');
    return date.getDay();
}

function addDaysToDate(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
}

export async function POST(request: NextRequest) {
    const runId = crypto.randomUUID();
    console.log(`[plan-week] [${runId}] Starting weekly plan request`);
    let lockAcquired = false;
    let userId: string | null = null;

    try {
        const body = await request.json();
        const input = planWeekInputSchema.parse(body);
        userId = input.user_id;

        // STRICT VALIDATION: start_date must be valid YYYY-MM-DD
        if (!input.start_date || !/^\d{4}-\d{2}-\d{2}$/.test(input.start_date)) {
            return NextResponse.json({ error: 'start_date inválida. Formato esperado: YYYY-MM-DD' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ error: 'Configuração do servidor incompleta.' }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const lockKey = `plan-week:${userId}`;

        // 1. Try to acquire lock
        const { data: existingLock } = await supabase
            .from('processing_locks')
            .select('*')
            .eq('lock_key', lockKey)
            .single();

        if (existingLock && new Date(existingLock.expires_at).getTime() > Date.now()) {
            return NextResponse.json({
                error: 'PLANEJAMENTO_EM_CURSO',
                message: 'Já existe um planejamento semanal em andamento para este usuário. Aguarde alguns segundos.'
            }, { status: 429 });
        }

        await supabase.from('processing_locks').upsert({
            lock_key: lockKey,
            user_id: userId,
            locked_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 120000).toISOString()
        });
        lockAcquired = true;

        const model = getGeminiModel();

        // Determine which days to plan (default: all 7)
        const daysOfWeek = input.days_to_plan || [0, 1, 2, 3, 4, 5, 6];
        const datesToPlan = daysOfWeek.map(dow => {
            const startDow = getDayOfWeek(input.start_date);
            const diff = dow - startDow;
            let targetDate = addDaysToDate(input.start_date, diff);
            // If the calculated date is before start_date, it's for next week
            if (new Date(targetDate) < new Date(input.start_date)) {
                targetDate = addDaysToDate(targetDate, 7);
            }
            return targetDate;
        });

        // Load user data
        const [fixedRes, profileRes, healthRes, routineRes] = await Promise.all([
            supabase.from('fixed_blocks').select('*').eq('user_id', userId).eq('is_active', true).in('day_of_week', daysOfWeek),
            supabase.from('profiles').select('*').eq('id', userId).single(),
            supabase.from('health_profile').select('*').eq('user_id', userId).single(),
            supabase.from('routine_profiles').select('*').eq('user_id', userId).single(),
        ]);

        const allFixedBlocks = fixedRes.data || [];
        const profile = profileRes.data;
        const healthProfile = healthRes.data;
        const routineProfile = routineRes.data;

        // Load existing blocks for the week
        const weekStart = datesToPlan[0];
        const weekEnd = datesToPlan[datesToPlan.length - 1];
        const { data: existingBlocks } = await supabase
            .from('daily_blocks')
            .select('*')
            .eq('user_id', userId)
            .gte('start_datetime', `${weekStart}T00:00:00`)
            .lte('start_datetime', `${weekEnd}T23:59:59`);

        // Build context for AI
        const fixedBlocksByDay: Record<number, any[]> = {};
        allFixedBlocks.forEach(fb => {
            if (!fixedBlocksByDay[fb.day_of_week]) fixedBlocksByDay[fb.day_of_week] = [];
            fixedBlocksByDay[fb.day_of_week].push(fb);
        });

        const daysContext = datesToPlan.map(date => {
            const dow = getDayOfWeek(date);
            const dayFixed = fixedBlocksByDay[dow] || [];
            const dayExisting = (existingBlocks || []).filter(b => b.start_datetime?.startsWith(date));

            return {
                date,
                dayOfWeek: dow,
                dayName: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][dow],
                fixedBlocks: dayFixed.map(fb => `${fb.title} (${fb.start_time}-${fb.end_time})`),
                hasExistingPlan: dayExisting.length > 0,
            };
        });

        let feedbackContext = "";
        if (input.action === 'replan_with_feedback' && input.feedbacks && input.feedbacks.length > 0) {
            feedbackContext = "\nATENÇÃO AOS FEEDBACKS DO USUÁRIO:\nO usuário acabou de revisar sua agenda e aplicou as seguintes correções manuais. Você DEVE modificar o planejamento da semana atual para respeitar essas restrições:\n";
            input.feedbacks.forEach((fb: any) => {
                if (fb.type === 'bad_time') feedbackContext += `- Tarefa "${fb.title}" (Originalmente às ${fb.originalTime}): HORÁRIO RUIM. Agende para outro momento totalmente diferente do dia.\n`;
                if (fb.type === 'unrealistic') feedbackContext += `- Tarefa "${fb.title}": TEMPO IRREAL. Aloque muito mais tempo para isso ou quebre em tarefas menores ao longo da semana.\n`;
                if (fb.type === 'dislike') feedbackContext += `- Tarefa "${fb.title}": O usuário NÃO GOSTOU. Remova ou substitua, não repita esse bloco.\n`;
            });
            feedbackContext += "\n";
        }

        const weekPrompt = `
Planeje a semana completa para o usuário.
Perfil: ${profile?.full_name || 'Usuário'}, ${profile?.occupation || routineProfile?.occupation || 'profissional'}
${healthProfile ? `Saúde: Treino ${healthProfile.training_frequency || '3x/semana'}, Objetivo: ${healthProfile.goal || routineProfile?.goal || 'saúde'}` : ''}
${routineProfile ? `Rotina: Objetivos: ${routineProfile.objectives?.join(', ')}, Pico: ${routineProfile.peak_productivity}` : ''}
${feedbackContext}
Regras:
1. NUNCA sobreponha horários com blocos fixos
2. Distribua estudo, trabalho, exercício e lazer ao longo da semana
3. Inclua refeições (café, almoço, jantar) em horários regulares
4. Cada bloco tem category: work|study|health|leisure|admin|sleep|meal|commute|fixed

Dias para planejar:
${daysContext.map(d => `${d.dayName} (${d.date}): Fixos: ${d.fixedBlocks.join(', ') || 'nenhum'} ${d.hasExistingPlan ? '(Complementar)' : '(Completo)'}`).join('\n')}

Responda EXCLUSIVAMENTE em JSON:
{
  "days": [{ "date": "YYYY-MM-DD", "blocks": [{ "title": "...", "category": "...", "start_time": "HH:MM", "end_time": "HH:MM", "suggested_reason": "Breve justificativa se baseado num feedback" }], "summary": "..." }],
  "weekSummary": "...", "weekInsight": "..."
}`;

        const result = await model.generateContent({
            contents: [
                { role: 'user', parts: [{ text: AGENDA_PLANNER_SYSTEM_PROMPT }] },
                { role: 'model', parts: [{ text: 'Entendido! Vou planejar a semana.' }] },
                { role: 'user', parts: [{ text: weekPrompt }] },
            ],
        });

        const responseText = result.response.text().replace(/```json\n?|```/g, '').trim();
        const weekPlan = aiWeekResponseSchema.parse(JSON.parse(responseText));

        let totalBlocksCreated = 0;
        const solverWarnings: string[] = [];
        let nextDayOverflows: BlockInput[] = [];

        for (const day of weekPlan.days) {
            const dayOfWeek = getDayOfWeek(day.date);
            const { data: plan } = await supabase.from('daily_plan').upsert({
                user_id: userId!, plan_date: day.date, timezone: input.timezone, status: 'active', updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, plan_date' }).select().single();

            if (!plan) continue;

            const dayFixed = fixedBlocksByDay[dayOfWeek] || [];
            const fixedSolverBlocks: SolverBlock[] = dayFixed.map(fb => ({
                id: `fixed-${fb.id}`, title: fb.title, category: fb.category || 'fixed',
                startMin: timeToMinutes(fb.start_time), endMin: timeToMinutes(fb.end_time),
                source: 'fixed', priority: 100, locked: true
            }));

            const rawDayInputs: BlockInput[] = [...nextDayOverflows];
            day.blocks.forEach(b => {
                const start = `${day.date}T${b.start_time}:00`;
                const end = `${day.date}T${b.end_time}:00`;
                rawDayInputs.push({
                    title: b.title,
                    category: b.category as any,
                    start_datetime: start,
                    end_datetime: end,
                    source: 'ai',
                    meta: {
                        energyLevel: b.energyLevel,
                        suggestedReason: b.suggested_reason,
                        intent_id: runId,
                        original_start: start,
                        original_end: end
                    }
                });
            });

            const split = splitOvernightBlocks(rawDayInputs, day.date);
            nextDayOverflows = split.nextDay;

            const aiSolverBlocks: SolverBlock[] = split.today.map((b, idx) => {
                let sMin = extractTimeMinutes(b.start_datetime);
                let eMin = extractTimeMinutes(b.end_datetime);
                if (b.category === 'meal') {
                    const check = validateMealWindow(b.title, sMin);
                    if (check.window && !check.valid) {
                        sMin = check.nearestSlot;
                        eMin = sMin + (extractTimeMinutes(b.end_datetime) - extractTimeMinutes(b.start_datetime));
                        solverWarnings.push(`${day.date}: ${b.title} movido para janela.`);
                    }
                }
                return { id: `ai-${idx}`, title: b.title, category: b.category, startMin: sMin, endMin: eMin, source: 'ai', priority: b.category === 'meal' ? 70 : 50, canShorten: true, minDuration: 15, meta: b.meta };
            });

            const solverResult = solveTimeline([...fixedSolverBlocks, ...aiSolverBlocks]);
            const finalInputs: BlockInput[] = solverResult.resolved
                .filter(sb => sb.category === 'sleep' || (sb.startMin < 23 * 60 && sb.endMin > 5 * 60))
                .map((sb, idx) => ({
                    ...solverBlockToTimeFields(sb, day.date, input.timezone),
                    title: sb.title,
                    category: sb.category as any,
                    source: sb.source as any,
                    order_index: idx,
                    is_fixed: sb.source === 'fixed',
                    locked: sb.locked || sb.source === 'fixed',
                    meta: sb.source === 'fixed'
                        ? { ...(sb.meta || {}), fixed_block_id: sb.id.startsWith('fixed-') ? sb.id.replace('fixed-', '') : sb.id }
                        : sb.meta
                }));

            const persistResult = await persistDailyBlocks(supabase, plan.id, userId!, day.date, finalInputs, {
                deleteStale: true,
                staleSources: ['ai', 'fixed']
            });
            totalBlocksCreated += persistResult.inserted + persistResult.updated;
        }

        return NextResponse.json({
            status: 'success',
            weekSummary: weekPlan.weekSummary,
            weekInsight: weekPlan.weekInsight,
            daysPlanned: weekPlan.days.length,
            totalBlocks: totalBlocksCreated,
            warnings: solverWarnings,
        }, { headers: { 'X-Run-Id': runId } });

    } catch (error: any) {
        console.error(`[plan-week] [${runId}] Error:`, error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Dados de entrada inválidos.', details: error.issues }, { status: 400, headers: { 'X-Run-Id': runId } });
        }
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Erro crítico ao planejar semana.',
                stack: error instanceof Error ? error.stack : undefined,
                details: String(error)
            },
            { status: 500, headers: { 'X-Run-Id': runId } }
        );
    } finally {
        if (lockAcquired && userId) {
            const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
            await supabase.from('processing_locks').delete().eq('lock_key', `plan-week:${userId}`);
        }
    }
}

// Helper to extract minutes from ISO datetime or HH:MM
function extractTimeMinutes(dtOrTime: string): number {
    if (dtOrTime.includes('T')) {
        // ISO string
        const match = dtOrTime.match(/T(\d{2}):(\d{2})/);
        if (match) return parseInt(match[1]) * 60 + parseInt(match[2]);
        return 0;
    }
    // HH:MM
    const [h, m] = dtOrTime.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}

function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}

function minutesToTimeStr(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
