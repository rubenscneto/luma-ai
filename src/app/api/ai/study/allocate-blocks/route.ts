import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { solveTimeline, SolverBlock, timeToMinutes, minutesToTime } from '@/lib/timelineSolver';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function POST(request: NextRequest) {
    try {
        const { user_id, subject_id, subject_name, topics, preferred_times, date } = await request.json();

        if (!user_id || !subject_name) {
            return NextResponse.json({ error: 'user_id and subject_name required' }, { status: 400 });
        }

        const targetDate = date || new Date().toISOString().split('T')[0];
        const dayOfWeek = new Date(targetDate + 'T12:00:00').getDay();

        // Load existing blocks for the day
        const { data: existingPlan } = await supabaseAdmin
            .from('daily_plan')
            .select('id')
            .eq('user_id', user_id)
            .eq('plan_date', targetDate)
            .single();

        const { data: existingBlocks } = existingPlan
            ? await supabaseAdmin
                .from('daily_blocks')
                .select('*')
                .eq('plan_id', existingPlan.id)
                .order('start_datetime', { ascending: true })
            : { data: [] };

        const { data: fixedBlocks } = await supabaseAdmin
            .from('fixed_blocks')
            .select('*')
            .eq('user_id', user_id)
            .eq('is_active', true)
            .eq('day_of_week', dayOfWeek);

        // Build occupied time slots
        const occupied: SolverBlock[] = [];
        (existingBlocks || []).forEach((b: any) => {
            const startDt = new Date(b.start_datetime);
            const endDt = new Date(b.end_datetime);
            occupied.push({
                id: b.id,
                title: b.title,
                startMin: startDt.getHours() * 60 + startDt.getMinutes(),
                endMin: endDt.getHours() * 60 + endDt.getMinutes(),
                priority: b.ai_suggested ? 60 : 50,
                category: b.category || 'work',
                source: b.ai_suggested ? 'ai' : 'manual',
            });
        });

        (fixedBlocks || []).forEach((fb: any) => {
            occupied.push({
                id: `fixed-${fb.id}`,
                title: fb.title,
                startMin: timeToMinutes(fb.start_time),
                endMin: timeToMinutes(fb.end_time),
                priority: 100,
                category: fb.category || 'work',
                source: 'fixed',
            });
        });

        // Find gaps using the solver
        const pendingTopics = (topics || []).filter((t: any) => t.status !== 'done');
        const topicNames = pendingTopics.map((t: any) => t.title || t.name).slice(0, 5);

        // Create study blocks for available gaps
        const studyBlocks: SolverBlock[] = [];
        const preferredStart = timeToMinutes(preferred_times?.start || '09:00');
        const preferredEnd = timeToMinutes(preferred_times?.end || '21:00');

        // Determine study session duration based on topic count
        const sessionMinutes = topicNames.length <= 2 ? 60 : 45;
        let currentStart = preferredStart;

        for (const topicName of topicNames) {
            // Find next available slot
            const candidateBlock: SolverBlock = {
                id: `study-${topicName}`,
                title: `📚 ${subject_name}: ${topicName}`,
                startMin: currentStart,
                endMin: currentStart + sessionMinutes,
                priority: 55,
                category: 'study',
                source: 'ai',
            };

            // Try to place using solver
            const allBlocks = [...occupied, candidateBlock];
            const result = solveTimeline(allBlocks);

            const placed = result.resolved.find(b => b.id === candidateBlock.id);
            if (placed && placed.endMin <= preferredEnd) {
                studyBlocks.push(placed);
                occupied.push(placed);
                currentStart = placed.endMin + 15; // 15 min gap
            }
        }

        // Convert to datetime blocks
        const resultBlocks = studyBlocks.map(sb => ({
            title: sb.title,
            category: 'study',
            start_time: minutesToTime(sb.startMin),
            end_time: minutesToTime(sb.endMin),
            start_datetime: `${targetDate}T${minutesToTime(sb.startMin)}:00`,
            end_datetime: `${targetDate}T${minutesToTime(sb.endMin)}:00`,
            ai_suggested: true,
        }));

        return NextResponse.json({
            blocks: resultBlocks,
            count: resultBlocks.length,
            date: targetDate,
        });
    } catch (error) {
        console.error('Study allocation error:', error);
        return NextResponse.json({ error: 'Erro ao alocar blocos de estudo.' }, { status: 500 });
    }
}
