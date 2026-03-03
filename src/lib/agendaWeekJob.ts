import { SupabaseClient } from '@supabase/supabase-js';
import { getGeminiModel } from '@/lib/ai/gemini';
import { AGENDA_PLANNER_SYSTEM_PROMPT, weekPrompt } from '@/ai/prompts/agendaPrompts';
import { solveTimeline, solverBlockToTimeFields, SolverBlock } from '@/lib/timelineSolver';
import { validateMealWindow } from '@/lib/mealWindows';
import { persistDailyBlocks, BlockInput } from '@/lib/persistDailyBlocks';
import { splitOvernightBlocks } from '@/lib/overnightSplit';

export type AgendaJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export type WeeklyJobPayload = {
  timezone: string;
  days_to_plan?: number[];
  action?: string;
  feedbacks?: Array<Record<string, unknown>>;
  user_feedback?: string;
};

function getDayOfWeek(dateStr: string): number {
  const date = new Date(dateStr + 'T12:00:00');
  return date.getDay();
}

function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function extractTimeMinutes(dtOrTime: string): number {
  if (dtOrTime.includes('T')) {
    const match = dtOrTime.match(/T(\d{2}):(\d{2})/);
    if (match) return parseInt(match[1]) * 60 + parseInt(match[2]);
    return 0;
  }
  const [h, m] = dtOrTime.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export async function updateAgendaJobStatus(
  supabase: SupabaseClient,
  params: {
    runId: string;
    userId: string;
    status: AgendaJobStatus;
    message: string;
    progress: number;
    meta?: Record<string, unknown>;
  }
) {
  const now = new Date().toISOString();
  await supabase.from('agenda_jobs_status').upsert({
    run_id: params.runId,
    user_id: params.userId,
    status: params.status,
    message: params.message,
    progress: params.progress,
    meta: params.meta || {},
    updated_at: now,
  });

  await supabase.from('agenda_weekly_jobs').update({
    status: params.status,
    progress: params.progress,
    last_message: params.message,
    updated_at: now,
    ...(params.status === 'running' ? { started_at: now } : {}),
    ...(params.status === 'completed' ? { completed_at: now, error_message: null } : {}),
  }).eq('run_id', params.runId);
}

export async function processAgendaWeeklyJob(
  supabase: SupabaseClient,
  job: { run_id: string; user_id: string; week_start: string; payload: WeeklyJobPayload }
) {
  const runId = job.run_id;
  const userId = job.user_id;
  const input = job.payload;

  await updateAgendaJobStatus(supabase, {
    runId,
    userId,
    status: 'running',
    progress: 5,
    message: 'Iniciando processamento semanal',
  });

  const model = getGeminiModel({ systemInstruction: AGENDA_PLANNER_SYSTEM_PROMPT });
  const daysOfWeek = input.days_to_plan || [0, 1, 2, 3, 4, 5, 6];
  const datesToPlan = daysOfWeek.map(dow => {
    const startDow = getDayOfWeek(job.week_start);
    const diff = dow - startDow;
    let targetDate = addDaysToDate(job.week_start, diff);
    if (new Date(targetDate) < new Date(job.week_start)) targetDate = addDaysToDate(targetDate, 7);
    return targetDate;
  });

  await updateAgendaJobStatus(supabase, { runId, userId, status: 'running', progress: 15, message: 'Carregando contexto do usuário' });

  const [fixedRes, profileRes, healthRes, routineRes, treinosRes, insightsRes] = await Promise.all([
    supabase.from('fixed_blocks').select('*').eq('user_id', userId).eq('is_active', true).in('day_of_week', daysOfWeek),
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('health_profile').select('*').eq('user_id', userId).single(),
    supabase.from('routine_profiles').select('*').eq('user_id', userId).single(),
    supabase.from('treinos_profile').select('*').eq('user_id', userId).single(),
    supabase.from('study_insights').select('*').eq('user_id', userId).limit(10),
  ]);

  const allFixedBlocks = (fixedRes.data || []) as FixedBlockRow[];
  type FixedBlockRow = { id: string; title: string; category?: string; start_time: string; end_time: string; day_of_week: number };
  const fixedBlocksByDay: Record<number, FixedBlockRow[]> = {};
  allFixedBlocks.forEach(fb => {
    if (!fixedBlocksByDay[fb.day_of_week]) fixedBlocksByDay[fb.day_of_week] = [];
    fixedBlocksByDay[fb.day_of_week].push(fb);
  });

  const weekStart = datesToPlan[0];
  const weekEnd = datesToPlan[datesToPlan.length - 1];
  const { data: existingBlocks } = await supabase
    .from('daily_blocks')
    .select('*')
    .eq('user_id', userId)
    .gte('start_datetime', `${weekStart}T00:00:00`)
    .lte('start_datetime', `${weekEnd}T23:59:59`);

  const daysContext = datesToPlan.map(date => {
    const dow = getDayOfWeek(date);
    const dayExisting = (existingBlocks || []).filter(b => b.start_datetime?.startsWith(date));
    return {
      date,
      dayName: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][dow],
      fixedBlocks: (fixedBlocksByDay[dow] || []).map(fb => `${fb.title} (${fb.start_time}-${fb.end_time})`),
      hasExistingPlan: dayExisting.length > 0,
    };
  });

  let feedbackContext = '';
  if (input.action === 'replan_with_feedback') {
    feedbackContext = '\nATENÇÃO AOS FEEDBACKS DO USUÁRIO:\n';
    (input.feedbacks || []).forEach((fb: Record<string, unknown>) => {
      if (fb.type === 'bad_time') feedbackContext += `- Tarefa "${fb.title}" em horário ruim.\n`;
      if (fb.type === 'unrealistic') feedbackContext += `- Tarefa "${fb.title}" com tempo irreal.\n`;
      if (fb.type === 'dislike') feedbackContext += `- Tarefa "${fb.title}" não repetir.\n`;
    });
    if (input.user_feedback) feedbackContext += `\nMensagem: "${input.user_feedback}"\n`;
  }

  const daysContextStr = daysContext.map(d => `${d.dayName} (${d.date}): Fixos: ${d.fixedBlocks.join(', ') || 'nenhum'} ${d.hasExistingPlan ? '(Complementar)' : '(Completo)'}`).join('\n');
  const finalPrompt = weekPrompt({
    userProfile: profileRes.data,
    routineProfile: routineRes.data,
    healthProfile: healthRes.data,
    treinosProfile: treinosRes.data,
    estudosInsights: insightsRes.data,
  }, allFixedBlocks, '', feedbackContext, daysContextStr);

  await updateAgendaJobStatus(supabase, { runId, userId, status: 'running', progress: 40, message: 'Gerando plano com IA' });

  let weekPlan: { days?: Array<{ date: string; blocks?: Array<Record<string, unknown>> }>; [key: string]: unknown };
  try {
    const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: finalPrompt }] }] });
    const responseText = result.response.text().replace(/```json\n?|```/g, '').trim();
    weekPlan = JSON.parse(responseText);
  } catch {
    weekPlan = {
      days: datesToPlan.map(date => ({ date, summary: 'Fallback automático.', blocks: (fixedBlocksByDay[getDayOfWeek(date)] || []).map((fb) => ({ title: fb.title, category: fb.category || 'fixed', start_time: fb.start_time, end_time: fb.end_time })) })),
      weekSummary: 'Fallback',
      weekInsight: 'Erro de IA',
    };
  }

  await updateAgendaJobStatus(supabase, { runId, userId, status: 'running', progress: 70, message: 'Persistindo blocos no banco' });

  let totalBlocksCreated = 0;
  let nextDayOverflows: BlockInput[] = [];

  for (const day of weekPlan.days || []) {
    const dayOfWeek = getDayOfWeek(day.date);
    const { data: plan } = await supabase.from('daily_plan').upsert({
      user_id: userId, plan_date: day.date, timezone: input.timezone || 'America/Sao_Paulo', status: 'active', updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id, plan_date' }).select().single();

    if (!plan) continue;

    const fixedSolverBlocks: SolverBlock[] = (fixedBlocksByDay[dayOfWeek] || []).map(fb => ({
      id: `fixed-${fb.id}`,
      title: fb.title,
      category: fb.category || 'fixed',
      startMin: timeToMinutes(fb.start_time),
      endMin: timeToMinutes(fb.end_time),
      source: 'fixed',
      priority: 70,
      locked: true
    }));

    const rawDayInputs: BlockInput[] = [...nextDayOverflows];
    (day.blocks || []).forEach((b: Record<string, unknown>) => {
      const start = `${day.date}T${String(b.start_time)}:00`;
      const end = `${day.date}T${String(b.end_time)}:00`;
      rawDayInputs.push({
        title: String(b.title),
        category: String(b.category),
        start_datetime: start,
        end_datetime: end,
        source: 'ai',
        meta: { intent_id: runId, original_start: start, original_end: end, suggestedReason: b.suggested_reason, energyLevel: b.energyLevel }
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
        }
      }
      return { id: `ai-${idx}`, title: String(b.title), category: String(b.category), startMin: sMin, endMin: eMin, source: 'ai', priority: b.category === 'meal' ? 90 : 80, canShorten: true, minDuration: 15, meta: b.meta };
    });

    const solverResult = solveTimeline([...fixedSolverBlocks, ...aiSolverBlocks]);
    const finalInputs: BlockInput[] = solverResult.resolved
      .filter(sb => sb.category === 'sleep' || (sb.startMin < 23 * 60 && sb.endMin > 5 * 60))
      .map((sb, idx) => ({
        ...solverBlockToTimeFields(sb, day.date, input.timezone || 'America/Sao_Paulo'),
        title: sb.title,
        category: sb.category as BlockInput['category'],
        source: sb.source as BlockInput['source'],
        order_index: idx,
        is_fixed: sb.source === 'fixed',
        locked: sb.locked || sb.source === 'fixed',
        meta: sb.source === 'fixed' ? { ...(sb.meta || {}), fixed_block_id: sb.id.startsWith('fixed-') ? sb.id.replace('fixed-', '') : sb.id } : sb.meta
      }));

    const persistResult = await persistDailyBlocks(supabase, plan.id, userId, day.date, finalInputs, { deleteStale: true, staleSources: ['ai', 'fixed'] });
    totalBlocksCreated += persistResult.inserted + persistResult.updated;
  }

  await updateAgendaJobStatus(supabase, { runId, userId, status: 'completed', progress: 100, message: 'Planejamento semanal concluído', meta: { totalBlocksCreated } });
}
