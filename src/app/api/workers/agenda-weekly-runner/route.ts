import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { processAgendaWeeklyJob, updateAgendaJobStatus } from '@/lib/agendaWeekJob';

export const dynamic = 'force-dynamic';

function backoffMs(attempt: number): number {
  const base = 15_000;
  return Math.min(base * 2 ** Math.max(0, attempt - 1), 10 * 60_000);
}

export async function POST(request: NextRequest) {
  const workerKey = process.env.INTERNAL_WORKER_KEY;
  if (workerKey && request.headers.get('x-internal-worker-key') !== workerKey) {
    return NextResponse.json({ error: 'Unauthorized worker call' }, { status: 401 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const body = await request.json().catch(() => ({}));
  const runId = body?.runId as string | undefined;

  let query = supabase.from('agenda_weekly_jobs')
    .select('*')
    .lte('next_attempt_at', new Date().toISOString())
    .in('status', ['queued', 'failed'])
    .order('created_at', { ascending: true })
    .limit(runId ? 1 : 3);

  if (runId) query = query.eq('run_id', runId);

  const { data: jobs } = await query;
  if (!jobs || jobs.length === 0) return NextResponse.json({ processed: 0 });

  let processed = 0;
  for (const job of jobs) {
    const { data: claimed } = await supabase.from('agenda_weekly_jobs').update({
      status: 'running',
      attempts: (job.attempts || 0) + 1,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('run_id', job.run_id).in('status', ['queued', 'failed']).select('run_id').maybeSingle();

    if (!claimed) continue;

    try {
      await processAgendaWeeklyJob(supabase, job);
      processed += 1;
    } catch (error: unknown) {
      const attempts = (job.attempts || 0) + 1;
      const exhausted = attempts >= (job.max_attempts || 4);
      const nextAttemptAt = new Date(Date.now() + backoffMs(attempts)).toISOString();

      await supabase.from('agenda_weekly_jobs').update({
        status: exhausted ? 'failed' : 'queued',
        error_message: String((error as { message?: string })?.message || error || 'unknown_error'),
        next_attempt_at: exhausted ? null : nextAttemptAt,
        updated_at: new Date().toISOString(),
      }).eq('run_id', job.run_id);

      await updateAgendaJobStatus(supabase, {
        runId: job.run_id,
        userId: job.user_id,
        status: exhausted ? 'failed' : 'queued',
        progress: exhausted ? 100 : Math.max(job.progress || 0, 5),
        message: exhausted ? 'Job falhou após retries' : `Falha transitória. Retry agendado (#${attempts}).`,
        meta: { attempts, nextAttemptAt, error: String((error as { message?: string })?.message || error || '') },
      });
    }
  }

  return NextResponse.json({ processed });
}
