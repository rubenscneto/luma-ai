import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // Monday of the week
    timezone: z.string().default('America/Sao_Paulo'),
    days_to_plan: z.array(z.number().min(0).max(6)).optional(),
    debug: z.boolean().optional().default(false),
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

        // STRICT VALIDATION: start_date must be valid YYYY-MM-DD
        if (!input.start_date || !/^\d{4}-\d{2}-\d{2}$/.test(input.start_date)) {
            return NextResponse.json({ error: 'start_date inválida. Formato esperado: YYYY-MM-DD' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const geminiKey = process.env.GEMINI_API_KEY;

        if (!supabaseUrl || !supabaseKey || !geminiKey) {
            const missing = [
                !supabaseUrl && 'SUPABASE_URL',
                !supabaseKey && 'SUPABASE_SERVICE_ROLE_KEY',
                !geminiKey && 'GEMINI_API_KEY',
            ].filter(Boolean).join(', ');
            return NextResponse.json(
                { error: `Configuração do servidor incompleta. Faltando: ${missing}`, rlsHint: !supabaseKey ? 'SUPABASE_SERVICE_ROLE_KEY is required for writes — anon key is blocked by RLS' : undefined },
                { status: 500 }
            );
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
        const { data: allFixedBlocks, error: fixedError } = await supabase
            .from('fixed_blocks')
            .select('*')
            .eq('user_id', input.user_id)
            .eq('is_active', true)
            .in('day_of_week', daysOfWeek);

        if (input.debug) {
            console.log(`[plan-week] DEBUG: Fetched ${allFixedBlocks?.length || 0} fixed blocks. Error: ${fixedError?.message}`);
        }

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

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: { responseMimeType: 'application/json' }
        });
        const result = await model.generateContent({
            contents: [
                { role: 'user', parts: [{ text: AGENDA_PLANNER_SYSTEM_PROMPT }] },
                { role: 'model', parts: [{ text: 'Entendido! Vou planejar a semana otimizando produtividade e bem-estar.' }] },
                { role: 'user', parts: [{ text: weekPrompt }] },
            ],
        });

        const responseText = result.response.text();

        // Enhanced Error Handling for JSON Parsing
        let parsed: any;
        try {
            // Remove markdown code blocks if present (Gemini sometimes adds ```json ... ```)
            const cleanJson = responseText.replace(/```json\n?|```/g, '').trim();
            parsed = JSON.parse(cleanJson);
        } catch (e) {
            const aiTextSnippet = responseText.slice(0, 500); // Capture start of response for debug
            console.error('AI JSON Parse Error:', e);
            console.error('AI Raw Text:', responseText);
            return NextResponse.json(
                {
                    error: 'AI_JSON_PARSE_FAILED',
                    details: 'A IA não retornou um JSON válido.',
                    parseError: String(e),
                    aiTextSnippet,
                    requestId: request.headers.get('x-request-id') || 'unknown'
                },
                { status: 500 }
            );
        }

        const validated = aiWeekResponseSchema.safeParse(parsed);

        if (!validated.success) {
            console.error('Week plan validation failed:', validated.error.issues);
            return NextResponse.json({ error: 'Formato da resposta inválido.' }, { status: 400 });
        }

        const weekPlan = validated.data;
        let totalBlocksCreated = 0;
        const solverWarnings: string[] = [];
        const debugInfo: any[] = [];

        // Initialize overflow blocks from previous day (for overnight processing)
        // We use BlockInput[] to carry over full block data including priority/meta if we want,
        // but here we primarily need basic info.
        let nextDayOverflows: BlockInput[] = [];

        // Process each day
        for (const [dayIdx, day] of weekPlan.days.entries()) {
            const dayOfWeek = getDayOfWeek(day.date);
            const dayFixed = fixedBlocksByDay[dayOfWeek] || [];

            // Get or create plan for this date using UPSERT to handle race conditions
            const { data: plan, error: planError } = await supabase
                .from('daily_plan')
                .upsert({
                    user_id: input.user_id,
                    plan_date: day.date,
                    timezone: input.timezone,
                    status: 'active',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id, plan_date' })
                .select()
                .single();

            if (planError || !plan) {
                console.error(`Failed to upsert plan for ${day.date}:`, planError);
                solverWarnings.push(`${day.date}: Falha ao criar/atualizar plano diário.`);
                continue;
            }

            // -- DEBUG COUNTERS --
            let debugAiRaw = day.blocks.length;
            let debugAfterFilter = 0;
            let debugMealWindowRejects = 0;

            // Convert Fixed blocks to solver format
            const fixedSolverBlocks: SolverBlock[] = dayFixed.map(fb => ({
                id: `fixed-${fb.id}`,
                title: fb.title,
                category: fb.category || 'fixed',
                startMin: timeToMinutes(fb.start_time),
                endMin: timeToMinutes(fb.end_time),
                source: 'fixed' as const,
                priority: 100,
                locked: true, // Fixed blocks are immutable in time
            }));

            // 1. Prepare AI blocks + Overflows as BlockInputs
            // We convert everything to BlockInput first to use the overnight utility
            const rawDayInputs: BlockInput[] = [];

            // Add overflows from previous day
            rawDayInputs.push(...nextDayOverflows);

            // Add new AI blocks
            day.blocks.forEach((b, idx) => {
                rawDayInputs.push({
                    title: b.title,
                    category: b.category as any,
                    start_datetime: `${day.date}T${b.start_time}:00`,
                    end_datetime: `${day.date}T${b.end_time}:00`,
                    source: 'ai',
                    meta: {
                        energyLevel: b.energyLevel,
                        suggestedReason: b.suggested_reason,
                        originalTime: `${b.start_time}-${b.end_time}`
                    }
                });
            });

            // 2. Split Overnight Blocks
            const { today: todayInputs, nextDay: newNextDayOverflows } = splitOvernightBlocks(rawDayInputs, day.date);
            nextDayOverflows = newNextDayOverflows; // Update for next iteration

            // 3. Convert to SolverBlocks and Apply Logic (Meal Windows, Conflicts)
            const aiSolverBlocks: SolverBlock[] = [];

            for (const [idx, b] of todayInputs.entries()) {
                let startMin = extractTimeMinutes(b.start_datetime);
                let endMin = extractTimeMinutes(b.end_datetime);

                // Re-calculate endMin if it wrapped to next day (should be 23:59 from split utility)
                // The utility ensures end_datetime is set correctly for today.
                // But we need to handle the case where 23:59:00 IS the end.
                // extractTimeMinutes handles standard HH:MM.

                // 1. Meal window enforcement (Only for meals)
                if (b.category === 'meal') {
                    const mealCheck = validateMealWindow(b.title, startMin);
                    if (mealCheck.window && !mealCheck.valid) {
                        solverWarnings.push(`${day.date}: Refeição "${b.title}" movida de ${minutesToTimeStr(startMin)} para ${minutesToTimeStr(mealCheck.nearestSlot)} (janela: ${mealCheck.window.label}).`);
                        startMin = mealCheck.nearestSlot;
                        // Duration needs to be preserved?
                        const duration = endMin - extractTimeMinutes(b.start_datetime);
                        endMin = startMin + duration;
                        debugMealWindowRejects++;
                    }
                }

                // 2. Check for overlapping Fixed Block
                // Note: endMin could be < startMin if raw data was weird, but overnight splitter fixed that?
                // Actually overnight splitter fixes crossing midnight.
                // We trust startMin < endMin for "today" blocks now.

                const overlapsFixed = fixedSolverBlocks.some(fb =>
                    !(endMin <= fb.startMin || startMin >= fb.endMin)
                );

                if (overlapsFixed) {
                    // Optional: Decide to drop or keep. Currently keeping for solver to fix.
                }

                aiSolverBlocks.push({
                    id: `ai-${dayIdx}-${idx}`,
                    title: b.title,
                    category: b.category,
                    startMin: startMin,
                    endMin: endMin,
                    source: 'ai' as const,
                    priority: b.category === 'meal' ? 70 : 50,
                    canShorten: true,
                    minDuration: b.category === 'meal' ? 15 : 15,
                    meta: b.meta
                });
                debugAfterFilter++;
            }

            // SOLVE TIMELINE (Fix conflicts)
            const allSolverBlocks = [...fixedSolverBlocks, ...aiSolverBlocks];
            const solverResult = solveTimeline(allSolverBlocks);

            if (solverResult.conflicts.length > 0) {
                solverWarnings.push(...solverResult.conflicts.map(c => `${day.date}: ${c.reason}`));
            }

            // Remover blocos que o solver empurrou para fora da janela útil
            // (antes das 05:00 ou depois das 23:00 para blocos não-sono e não-fixos)
            const USEFUL_START = 5 * 60;   // 05:00
            const USEFUL_END = 23 * 60;  // 23:00

            const filteredResolved = solverResult.resolved.filter(sb => {
                if (sb.source === 'fixed') return true;
                if (sb.category === 'sleep') return true;

                // Blocos fora da janela útil são descartados (não persistidos)
                if (sb.endMin <= USEFUL_START || sb.startMin >= USEFUL_END) {
                    solverWarnings.push(
                        `${day.date}: '${sb.title}' descartado — fora da janela útil (${minutesToTimeStr(sb.startMin)}-${minutesToTimeStr(sb.endMin)})`
                    );
                    return false;
                }
                return true;
            });

            // Convert back to BlockInput for persistence
            const finalBlocksInput: BlockInput[] = filteredResolved
                .filter(sb => sb.source !== 'fixed')
                .map((sb, idx) => {
                    const timeFields = solverBlockToTimeFields(sb, day.date, input.timezone);
                    return {
                        title: sb.title,
                        category: sb.category as any,
                        start_datetime: timeFields.start_datetime,
                        end_datetime: timeFields.end_datetime,
                        source: sb.source,
                        order_index: idx,
                        is_fixed: sb.source === 'fixed',
                        meta: sb.meta
                    };
                });

            // PERSIST TO DB
            const persistResult = await persistDailyBlocks(
                supabase,
                plan.id,
                input.user_id,
                day.date,
                finalBlocksInput,
                {
                    deleteStale: true,
                    deleteNullKeys: true,
                    staleSources: ['ai']
                }
            );

            debugInfo.push({
                date: day.date,
                aiRawCount: debugAiRaw,
                afterSolverCount: finalBlocksInput.length,
                inserted: persistResult.inserted,
                updated: persistResult.updated,
                deleted: persistResult.deleted,
                persistErrors: persistResult.errors,
                solverConflicts: solverResult.conflicts.length
            });

            totalBlocksCreated += persistResult.inserted + persistResult.updated;
        }

        // Server-side debug log (visible in Vercel logs)
        if (input.debug && debugInfo.length > 0) {
            console.log('[plan-week] DEBUG:', JSON.stringify(debugInfo, null, 2));
        }

        return NextResponse.json({
            status: 'success',
            weekSummary: weekPlan.weekSummary,
            weekInsight: weekPlan.weekInsight,
            daysPlanned: weekPlan.days.length,
            totalBlocks: totalBlocksCreated,
            warnings: solverWarnings,
            ...(input.debug ? { debug: debugInfo } : {}),
        });

    } catch (error) {
        console.error('Plan week error FULL details:', error);

        // Return 400 for validation errors (Zod)
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Dados de entrada inválidos.',
                    details: error.issues
                },
                { status: 400 }
            );
        }

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
