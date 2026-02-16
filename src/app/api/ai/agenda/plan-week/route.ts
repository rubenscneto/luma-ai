import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { AGENDA_PLANNER_SYSTEM_PROMPT, buildPlanDayPrompt } from '@/ai/prompts/agendaPrompts';
import { solveTimeline, dailyBlockToSolverBlock, solverBlockToTimeFields, SolverBlock } from '@/lib/timelineSolver';
import { processDerivedBlocks } from '@/lib/derivedBlocks';

export const dynamic = 'force-dynamic';

const planWeekInputSchema = z.object({
    user_id: z.string().uuid(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // Monday of the week
    timezone: z.string().default('America/Sao_Paulo'),
    days_to_plan: z.array(z.number().min(0).max(6)).optional(), // specific days to plan (0=Sun..6=Sat)
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
    try {
        const body = await request.json();
        const input = planWeekInputSchema.parse(body);

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const geminiKey = process.env.GEMINI_API_KEY;

        if (!supabaseUrl || !supabaseKey || !geminiKey) {
            return NextResponse.json({ error: 'Configuração do servidor incompleta.' }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const genAI = new GoogleGenerativeAI(geminiKey);

        // Determine which days to plan (default: all 7)
        const daysOfWeek = input.days_to_plan || [0, 1, 2, 3, 4, 5, 6];
        const datesToPlan = daysOfWeek.map(dow => {
            // startDate is the Monday (or Sunday), calculate each day
            const startDow = getDayOfWeek(input.start_date);
            const diff = dow - startDow;
            return addDaysToDate(input.start_date, diff >= 0 ? diff : diff + 7);
        });

        // Load user's fixed blocks for all relevant days
        const { data: allFixedBlocks } = await supabase
            .from('fixed_blocks')
            .select('*')
            .eq('user_id', input.user_id)
            .eq('is_active', true)
            .in('day_of_week', daysOfWeek);

        // Load user profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', input.user_id)
            .single();

        // Load health profile
        const { data: healthProfile } = await supabase
            .from('health_profile')
            .select('*')
            .eq('user_id', input.user_id)
            .single();

        // Load existing blocks for the week to avoid duplicates
        const weekStart = datesToPlan[0];
        const weekEnd = datesToPlan[datesToPlan.length - 1];
        const { data: existingBlocks, error: blocksError } = await supabase
            .from('daily_blocks')
            .select('*')
            .eq('user_id', input.user_id)
            .gte('start_datetime', `${weekStart}T00:00:00`)
            .lte('start_datetime', `${weekEnd}T23:59:59`);

        if (blocksError) {
            console.error('Error fetching existing blocks:', blocksError);
            throw new Error(`Database error (fetching blocks): ${blocksError.message}`);
        }

        // Build context for AI
        const fixedBlocksByDay: Record<number, any[]> = {};
        (allFixedBlocks || []).forEach(fb => {
            if (!fixedBlocksByDay[fb.day_of_week]) fixedBlocksByDay[fb.day_of_week] = [];
            fixedBlocksByDay[fb.day_of_week].push(fb);
        });

        const daysContext = datesToPlan.map(date => {
            const dow = getDayOfWeek(date);
            const dayFixed = fixedBlocksByDay[dow] || [];
            const dayExisting = (existingBlocks || []).filter(b =>
                b.start_datetime?.startsWith(date)
            );

            return {
                date,
                dayOfWeek: dow,
                dayName: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][dow],
                fixedBlocks: dayFixed.map(fb => `${fb.title} (${fb.start_time}-${fb.end_time})`),
                existingBlocks: dayExisting.length,
                hasExistingPlan: dayExisting.length > 0,
            };
        });

        // AI prompt for week planning
        const weekPrompt = `
Planeje a semana completa para o usuário.

Perfil: ${profile?.full_name || 'Usuário'}, ${profile?.occupation || 'profissional'}
${healthProfile ? `Saúde: Treino ${healthProfile.training_frequency || '3x/semana'}, Objetivo: ${healthProfile.goal || 'saúde'}` : ''}

Para cada dia abaixo, gere blocos otimizados respeitando compromissos fixos.
Regras:
1. NUNCA sobreponha horários com blocos fixos
2. Distribua estudo, trabalho, exercício e lazer ao longo da semana
3. Considere fadiga acumulada (quarta é meio de semana)
4. Fins de semana devem ser mais leves
5. Inclua refeições (café, almoço, jantar) em horários regulares
6. Reserve blocos de foco (deep work) para manhã
7. Cada bloco tem category: work|study|health|leisure|admin|sleep|meal|commute|fixed

Dias para planejar:
${daysContext.map(d => `
${d.dayName} (${d.date}):
  Fixos: ${d.fixedBlocks.length > 0 ? d.fixedBlocks.join(', ') : 'nenhum'}
  ${d.hasExistingPlan ? `⚠️ Já tem ${d.existingBlocks} blocos - preencher lacunas apenas` : 'Dia vazio - planejar completo'}
`).join('\n')}

Responda EXCLUSIVAMENTE em JSON válido:
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "blocks": [
        { "title": "...", "category": "...", "start_time": "HH:MM", "end_time": "HH:MM", "suggested_reason": "...", "energyLevel": "low|medium|high" }
      ],
      "summary": "Resumo do dia"
    }
  ],
  "weekSummary": "Resumo geral da semana",
  "weekInsight": "Dica/insight motivacional"
}`;

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent({
            contents: [
                { role: 'user', parts: [{ text: AGENDA_PLANNER_SYSTEM_PROMPT }] },
                { role: 'model', parts: [{ text: 'Entendido! Vou planejar a semana otimizando produtividade e bem-estar.' }] },
                { role: 'user', parts: [{ text: weekPrompt }] },
            ],
        });

        const responseText = result.response.text();

        // Extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return NextResponse.json({ error: 'Resposta da IA não contém JSON válido.' }, { status: 400 });
        }

        const parsed = JSON.parse(jsonMatch[0]);
        const validated = aiWeekResponseSchema.safeParse(parsed);

        if (!validated.success) {
            console.error('Week plan validation failed:', validated.error.issues);
            return NextResponse.json({ error: 'Formato da resposta inválido.' }, { status: 400 });
        }

        const weekPlan = validated.data;
        let totalBlocksCreated = 0;
        const solverWarnings: string[] = [];

        // Process each day
        for (const day of weekPlan.days) {
            const dayOfWeek = getDayOfWeek(day.date);
            const dayFixed = fixedBlocksByDay[dayOfWeek] || [];

            // Get or create plan for this date
            let { data: plan } = await supabase
                .from('daily_plan')
                .select('*')
                .eq('user_id', input.user_id)
                .eq('plan_date', day.date)
                .single();

            if (!plan) {
                const { data: newPlan } = await supabase
                    .from('daily_plan')
                    .insert({
                        user_id: input.user_id,
                        plan_date: day.date,
                        timezone: input.timezone,
                        status: 'active',
                    })
                    .select()
                    .single();
                plan = newPlan;
            }

            if (!plan) continue;

            // Delete existing AI/manual blocks for this day to prevent duplication/explosion
            // We keep 'fixed' blocks which are managed separately
            await supabase
                .from('daily_blocks')
                .delete()
                .eq('plan_id', plan.id)
                .neq('category', 'fixed');

            // Convert AI blocks + fixed blocks to solver format
            const fixedSolverBlocks: SolverBlock[] = dayFixed.map(fb => ({
                id: `fixed-${fb.id}`,
                title: fb.title,
                category: fb.category || 'fixed',
                startMin: timeToMinutes(fb.start_time),
                endMin: timeToMinutes(fb.end_time),
                source: 'fixed' as const,
                priority: 100,
            }));

            const aiSolverBlocks: SolverBlock[] = day.blocks.map((b, idx) => ({
                id: `ai-${day.date}-${idx}`,
                title: b.title,
                category: b.category,
                startMin: timeToMinutes(b.start_time),
                endMin: timeToMinutes(b.end_time),
                source: 'ai' as const,
                priority: b.category === 'meal' ? 70 : 60,
                canShorten: true,
                minDuration: b.category === 'meal' ? 15 : 20,
            }));

            // Add derived blocks (meal pauses)
            const allBlocks = processDerivedBlocks([...fixedSolverBlocks, ...aiSolverBlocks]);

            // Solve timeline
            const solverResult = solveTimeline(allBlocks);

            if (solverResult.warnings.length > 0) {
                solverWarnings.push(`${day.date}: ${solverResult.warnings.join('; ')}`);
            }

            // Save resolved AI blocks (skip fixed blocks, they're already saved)
            const aiResolved = solverResult.resolved.filter(b => b.source !== 'fixed');

            // --- FINAL GUARDRAIL ---
            const MAX_BLOCKS_PER_DAY = 24;
            if (aiResolved.length > MAX_BLOCKS_PER_DAY) {
                solverWarnings.push(`${day.date}: Truncated excess blocks (${aiResolved.length} > ${MAX_BLOCKS_PER_DAY})`);
                aiResolved.length = MAX_BLOCKS_PER_DAY;
            }

            for (const block of aiResolved) {
                const timeFields = solverBlockToTimeFields(block, day.date, input.timezone);

                await supabase.from('daily_blocks').insert({
                    plan_id: plan.id,
                    user_id: input.user_id,
                    title: block.title,
                    category: block.category,
                    start_datetime: timeFields.start_datetime,
                    end_datetime: timeFields.end_datetime,
                    source: block.parentEventId ? 'ai' : 'ai',
                    is_done: false,
                    is_skipped: false,
                    order_index: totalBlocksCreated * 10,
                    meta: block.meta || {},
                });

                totalBlocksCreated++;
            }
        }

        return NextResponse.json({
            status: 'success',
            weekSummary: weekPlan.weekSummary,
            weekInsight: weekPlan.weekInsight,
            daysPlanned: weekPlan.days.length,
            totalBlocks: totalBlocksCreated,
            warnings: solverWarnings,
        });

    } catch (error) {
        console.error('Plan week error FULL details:', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Erro crítico ao planejar semana.',
                stack: error instanceof Error ? error.stack : undefined,
                details: String(error)
            },
            { status: 500 }
        );
    }
}

function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}
