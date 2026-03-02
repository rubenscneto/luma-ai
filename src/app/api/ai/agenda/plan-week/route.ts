import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const planWeekInputSchema = z.object({
  user_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().default('America/Sao_Paulo'),
  days_to_plan: z.array(z.number().min(0).max(6)).optional(),
  debug: z.boolean().optional().default(false),
  action: z.string().optional(),
  feedbacks: z.array(z.any()).optional(),
  user_feedback: z.string().optional(),
});

const MAX_ATTEMPTS = 4;

export async function POST(request: NextRequest) {
  const runId = crypto.randomUUID();

  try {
    const body = await request.json();
    const input = planWeekInputSchema.parse(body);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: 'Configuração do servidor incompleta.' }, { status: 500 });

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: existing } = await supabase.from('agenda_weekly_jobs')
      .select('run_id,status,progress')
      .eq('user_id', input.user_id)
      .eq('week_start', input.start_date)
      .in('status', ['queued', 'running', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        deduplicated: true,
        runId: existing.run_id,
        status: existing.status,
        progress: existing.progress,
      }, { status: existing.status === 'completed' ? 200 : 202 });
    }

    const now = new Date().toISOString();
    await supabase.from('agenda_weekly_jobs').insert({
      run_id: runId,
      user_id: input.user_id,
      week_start: input.start_date,
      status: 'queued',
      progress: 0,
      attempts: 0,
      max_attempts: MAX_ATTEMPTS,
      next_attempt_at: now,
      payload: {
        timezone: input.timezone,
        days_to_plan: input.days_to_plan,
        action: input.action,
        feedbacks: input.feedbacks,
        user_feedback: input.user_feedback,
      }
    });

    await supabase.from('agenda_jobs_status').upsert({
      run_id: runId,
      user_id: input.user_id,
      status: 'queued',
      progress: 0,
      message: 'Job enfileirado',
      updated_at: now,
      meta: {},
    });

    fetch(new URL('/api/workers/agenda-weekly-runner', request.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-worker-key': process.env.INTERNAL_WORKER_KEY || '' },
      body: JSON.stringify({ runId }),
    }).catch(() => null);

    return NextResponse.json({ success: true, status: 'queued', runId }, { status: 202 });
  } catch (e) {
    console.error('[plan-week] queue error', e);
    return NextResponse.json({ error: 'Erro ao enfileirar planejamento semanal.' }, { status: 500 });
  }
}
