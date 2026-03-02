import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const runId = request.nextUrl.searchParams.get('runId');
  const userId = request.nextUrl.searchParams.get('userId');

  if (!runId || !userId) {
    return NextResponse.json({ error: 'runId e userId são obrigatórios' }, { status: 400 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: statusRow } = await supabase
    .from('agenda_jobs_status')
    .select('*')
    .eq('run_id', runId)
    .eq('user_id', userId)
    .maybeSingle();

  const { data: jobRow } = await supabase
    .from('agenda_weekly_jobs')
    .select('status,progress,attempts,max_attempts,week_start,updated_at,error_message,completed_at')
    .eq('run_id', runId)
    .eq('user_id', userId)
    .maybeSingle();

  return NextResponse.json({ runId, status: statusRow || jobRow || null });
}
