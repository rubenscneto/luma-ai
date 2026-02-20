"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { DailyPlan, DailyBlock, DailyBlockWithStatus, BlockStatus, FixedBlock, AIGeneratedPlan, RecurrenceSuggestion } from '@/types';
import { useAuth } from './authContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
    solveTimeline,
    dailyBlockToSolverBlock,
    solverBlockToTimeFields,
    minutesToTime,
    SolverBlock,
    SolverConflict,
} from '@/lib/timelineSolver';
import { processDerivedBlocks } from '@/lib/derivedBlocks';
import { normalizeForComparison } from '@/lib/mealWindows';

interface DailyPlanContextType {
    // State
    todayPlan: DailyPlan | null;
    todayBlocks: DailyBlockWithStatus[];
    fixedBlocks: FixedBlock[];
    currentBlock: DailyBlockWithStatus | null;
    nextBlock: DailyBlockWithStatus | null;
    isLoading: boolean;

    // A/B Plan State
    abPlans: { planA: AIGeneratedPlan | null; planB: AIGeneratedPlan | null };
    isABLoading: boolean;

    // Recurrence State
    recurrenceSuggestions: RecurrenceSuggestion[];
    isRecurrenceLoading: boolean;

    // Actions
    loadTodayPlan: () => Promise<void>;
    generatePlan: (date?: string, mode?: 'first_time' | 'regenerate' | 'fill_gaps') => Promise<void>;
    generateABPlan: (date?: string) => Promise<void>;
    selectPlan: (plan: 'A' | 'B') => Promise<void>;
    clearABPlans: () => void;
    generateHealthBlocks: (options?: { includeMeals?: boolean; includeWorkouts?: boolean }) => Promise<void>;
    markBlockDone: (blockId: string) => Promise<void>;
    skipBlock: (blockId: string, reason?: string) => Promise<void>;
    delayBlock: (blockId: string, minutes: number) => Promise<void>;
    addBlock: (block: Partial<DailyBlock>) => Promise<void>;
    replanDay: (userNote?: string) => Promise<void>;
    refreshBlocks: () => void;
    selectedDate: string;
    setSelectedDate: (date: string) => void;
    loadPlanForDate: (date: string) => Promise<void>;
    weekBlocks: Record<string, DailyBlock[]>;
    fetchWeekBlocks: (startDate: string) => Promise<void>;

    // Recurrence Actions
    detectRecurrences: () => Promise<void>;
    addRecurrenceAsFixed: (suggestion: RecurrenceSuggestion) => Promise<void>;
    dismissRecurrence: (id: string) => void;
}

const DailyPlanContext = createContext<DailyPlanContextType | undefined>(undefined);

function getBlockStatus(block: DailyBlock, now: Date): BlockStatus {
    if (block.is_done) return 'done';
    if (block.is_skipped) return 'skipped';

    const start = new Date(block.start_datetime);
    const end = new Date(block.end_datetime);

    if (now >= start && now <= end) return 'current';
    if (now > end) return 'delayed';
    return 'upcoming';
}

function enrichBlockWithStatus(block: DailyBlock, now: Date): DailyBlockWithStatus {
    const status = getBlockStatus(block, now);
    const start = new Date(block.start_datetime);
    const end = new Date(block.end_datetime);

    return {
        ...block,
        status,
        timeUntilStart: Math.round((start.getTime() - now.getTime()) / 60000),
        timeUntilEnd: Math.round((end.getTime() - now.getTime()) / 60000),
    };
}

export function DailyPlanProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [todayPlan, setTodayPlan] = useState<DailyPlan | null>(null);
    const [todayBlocks, setTodayBlocks] = useState<DailyBlockWithStatus[]>([]);
    const [fixedBlocks, setFixedBlocks] = useState<FixedBlock[]>([]);
    const [weekBlocks, setWeekBlocks] = useState<Record<string, DailyBlock[]>>({});
    const [isLoading, setIsLoading] = useState(false);

    // A/B Plan state
    const [abPlans, setABPlans] = useState<{ planA: AIGeneratedPlan | null; planB: AIGeneratedPlan | null }>({ planA: null, planB: null });
    const [isABLoading, setIsABLoading] = useState(false);

    // Recurrence state
    const [recurrenceSuggestions, setRecurrenceSuggestions] = useState<RecurrenceSuggestion[]>([]);
    const [isRecurrenceLoading, setIsRecurrenceLoading] = useState(false);

    // Date selection (for future day support)
    const today = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(today);

    // Undo state ref
    const undoRef = useRef<{ blocks: DailyBlockWithStatus[]; timeout: NodeJS.Timeout } | null>(null);

    const loadPlanForDate = useCallback(async (dateOverride?: string) => {
        if (!user) return;

        setIsLoading(true);
        try {
            const targetDate = dateOverride || selectedDate || today;
            const now = new Date();
            const targetDateObj = new Date(targetDate + 'T12:00:00');
            const dayOfWeek = targetDateObj.getDay();

            // Load fixed blocks for this day of week
            const { data: fixed } = await supabase
                .from('fixed_blocks')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .eq('day_of_week', dayOfWeek);

            setFixedBlocks(fixed || []);

            // Load plan for the target date
            const { data: plan } = await supabase
                .from('daily_plan')
                .select('*')
                .eq('user_id', user.id)
                .eq('plan_date', targetDate)
                .single();

            if (plan) {
                setTodayPlan(plan);

                const { data: blocks } = await supabase
                    .from('daily_blocks')
                    .select('*')
                    .eq('plan_id', plan.id)
                    .order('start_datetime', { ascending: true });

                const fixedAsDailyBlocks: DailyBlockWithStatus[] = (fixed || []).map(fb => {
                    const startDatetime = `${targetDate}T${fb.start_time}`;
                    const endDatetime = `${targetDate}T${fb.end_time}`;

                    return enrichBlockWithStatus({
                        id: `fixed-${fb.id}`,
                        plan_id: plan.id,
                        user_id: user.id,
                        title: fb.title,
                        description: fb.description,
                        category: fb.category,
                        start_datetime: startDatetime,
                        end_datetime: endDatetime,
                        is_done: false,
                        is_skipped: false,
                        ai_suggested: false,
                        created_at: fb.created_at,
                        is_fixed: true,
                    } as any, now);
                });

                const dailyEnriched = (blocks || []).map(b => enrichBlockWithStatus(b, now));
                const allBlocks = [...dailyEnriched, ...fixedAsDailyBlocks].sort((a, b) =>
                    new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
                );



                setTodayBlocks(allBlocks);
            } else {
                setTodayPlan(null);

                const fixedAsDailyBlocks: DailyBlockWithStatus[] = (fixed || []).map(fb => {
                    const startDatetime = `${targetDate}T${fb.start_time}`;
                    const endDatetime = `${targetDate}T${fb.end_time}`;

                    return enrichBlockWithStatus({
                        id: `fixed-${fb.id}`,
                        plan_id: '',
                        user_id: user.id,
                        title: fb.title,
                        description: fb.description,
                        category: fb.category,
                        start_datetime: startDatetime,
                        end_datetime: endDatetime,
                        is_done: false,
                        is_skipped: false,
                        ai_suggested: false,
                        created_at: fb.created_at,
                        is_fixed: true,
                    } as any, now);
                });

                setTodayBlocks(fixedAsDailyBlocks.sort((a, b) =>
                    new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
                ));
            }
        } catch (error) {
            console.error('Load plan error:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user, selectedDate, today]);

    const fetchWeekBlocks = useCallback(async (startDate: string) => {
        if (!user) return;

        // Don't set global isLoading to avoid blocking the whole UI, use local state in component or just let it load
        // But we can set a flag if needed. For now, let's just fetch.
        try {
            // Calculate 7 days range
            const start = new Date(startDate);
            const dates = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                return d.toISOString().split('T')[0];
            });

            // 1. Fetch Plans for these dates
            const { data: plans } = await supabase
                .from('daily_plan')
                .select('id, plan_date')
                .eq('user_id', user.id)
                .in('plan_date', dates);

            const planMap = new Map((plans || []).map(p => [p.plan_date, p.id]));
            const planIds = (plans || []).map(p => p.id);

            // 2. Fetch Blocks for these plans
            let dbBlocks: DailyBlock[] = [];
            if (planIds.length > 0) {
                const { data: blocks } = await supabase
                    .from('daily_blocks')
                    .select('*')
                    .in('plan_id', planIds)
                    .order('start_datetime', { ascending: true });
                dbBlocks = blocks || [];
            }

            // 3. Fetch Fixed Blocks (all active)
            const { data: fixed } = await supabase
                .from('fixed_blocks')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_active', true);

            const activeFixed = fixed || [];
            const newWeekBlocks: Record<string, DailyBlock[]> = {};

            // 4. Assemble Week Data — ALWAYS include fixed blocks
            dates.forEach(dateStr => {
                const planId = planMap.get(dateStr);
                const dayOfWeek = new Date(dateStr + 'T12:00:00').getDay();
                const daysFixed = activeFixed.filter(f => f.day_of_week === dayOfWeek);

                // Convert fixed blocks to DailyBlock format
                const fixedAsDailyBlocks: DailyBlock[] = daysFixed.map(f => ({
                    id: `fixed-${f.id}-${dateStr}`,
                    user_id: user.id,
                    plan_id: planId || 'preview',
                    title: f.title,
                    category: f.category,
                    start_datetime: `${dateStr}T${f.start_time}`,
                    end_datetime: `${dateStr}T${f.end_time}`,
                    source: 'fixed' as const,
                    is_done: false,
                    is_skipped: false,
                    is_fixed: true,
                    order_index: 0,
                    created_at: new Date().toISOString(),
                } as DailyBlock));

                if (planId) {
                    const planBlocks = dbBlocks.filter(b => b.plan_id === planId);
                    // Dedup: skip virtual fixed if DB already has a block with same normalized title+start+end
                    const dbKeys = new Set(planBlocks.map(b => {
                        const s = new Date(b.start_datetime).toTimeString().slice(0, 5);
                        const e = new Date(b.end_datetime).toTimeString().slice(0, 5);
                        return `${normalizeForComparison(b.title)}|${s}|${e}`;
                    }));
                    const missingFixed = fixedAsDailyBlocks.filter(f => {
                        const s = new Date(f.start_datetime).toTimeString().slice(0, 5);
                        const e = new Date(f.end_datetime).toTimeString().slice(0, 5);
                        return !dbKeys.has(`${normalizeForComparison(f.title)}|${s}|${e}`);
                    });
                    newWeekBlocks[dateStr] = [...planBlocks, ...missingFixed]
                        .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
                } else {
                    newWeekBlocks[dateStr] = fixedAsDailyBlocks;
                }
            });

            setWeekBlocks(newWeekBlocks);
        } catch (error) {
            console.error('Error fetching week blocks:', error);
            toast.error('Erro ao carregar visualização semanal.');
        }
    }, [user]);

    // Alias for backwards compatibility
    const loadTodayPlan = useCallback(() => loadPlanForDate(today), [loadPlanForDate, today]);

    const refreshBlocks = useCallback(() => {
        const now = new Date();
        setTodayBlocks(prev => prev.map(b => enrichBlockWithStatus(b, now)));
    }, []);

    // Auto-refresh every 60 seconds
    useEffect(() => {
        const interval = setInterval(refreshBlocks, 60000);
        return () => clearInterval(interval);
    }, [refreshBlocks]);

    // Load on mount and when selectedDate changes
    useEffect(() => {
        loadPlanForDate();
    }, [loadPlanForDate]);

    const generatePlan = async (date?: string, mode: 'first_time' | 'regenerate' | 'fill_gaps' = 'first_time') => {
        // GUARDA: não disparar se data não estiver definida
        const effectiveDate = date || selectedDate || today;
        console.log('generatePlan called', { date, effectiveDate, mode, user: user?.id });

        if (!effectiveDate) {
            console.warn('[generatePlan] Abortado: data não definida');
            return;
        }

        if (!user) {
            console.error('generatePlan aborted: No user');
            toast.error('Erro de autenticação. Tente recarregar a página.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/ai/agenda/plan-day', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    date: effectiveDate,
                    mode,
                    timezone: 'America/Sao_Paulo',
                }),
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(`Agenda gerada: ${data.blocks_count?.total || 0} blocos criados!`);
                await loadTodayPlan();
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('Generate plan error response:', errorData);
                toast.error(errorData.error || 'Erro ao gerar agenda. Tente novamente.');
            }
        } catch (error) {
            console.error('Generate plan error:', error);
            toast.error('Erro de conexão ao gerar agenda.');
        } finally {
            setIsLoading(false);
        }
    };

    const markBlockDone = async (blockId: string) => {
        if (!user) return;

        // Block done/skip on virtual fixed blocks (id starts with 'fixed-')
        if (blockId.startsWith('fixed-')) {
            toast.info('Blocos fixos não podem ser marcados como concluídos.');
            return;
        }

        const { error } = await supabase
            .from('daily_blocks')
            .update({ is_done: true, done_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', blockId)
            .eq('user_id', user.id)
            .select()
            .single();

        if (!error) {
            setTodayBlocks(prev => prev.map(b =>
                b.id === blockId ? { ...b, is_done: true, status: 'done' } : b
            ));
        }
    };

    const skipBlock = async (blockId: string, reason?: string) => {
        if (!user) return;

        // Block done/skip on virtual fixed blocks
        if (blockId.startsWith('fixed-')) {
            toast.info('Blocos fixos não podem ser pulados.');
            return;
        }

        // Wait for DB confirm (.select().single()) before proceeding
        const { error } = await supabase
            .from('daily_blocks')
            .update({ is_skipped: true, skip_reason: reason, updated_at: new Date().toISOString() })
            .eq('id', blockId)
            .eq('user_id', user.id)
            .select()
            .single();

        if (!error) {
            setTodayBlocks(prev => prev.map(b =>
                b.id === blockId ? { ...b, is_skipped: true, status: 'skipped' } : b
            ));

            // Trigger replan — will merge blocks preserving this skip
            await triggerReplan('skip', blockId, reason);
        }
    };

    const delayBlock = async (blockId: string, minutes: number) => {
        if (!user || !todayPlan) return;

        const block = todayBlocks.find(b => b.id === blockId);
        if (!block) return;

        const newStart = new Date(new Date(block.start_datetime).getTime() + minutes * 60000);
        const newEnd = new Date(new Date(block.end_datetime).getTime() + minutes * 60000);

        const { error } = await supabase
            .from('daily_blocks')
            .update({
                start_datetime: newStart.toISOString(),
                end_datetime: newEnd.toISOString(),
            })
            .eq('id', blockId)
            .eq('user_id', user.id);

        if (!error) {
            // Use 'late' signal since delay means user is running late
            await triggerReplan('late', blockId, `Atrasou ${minutes} minutos`);
            await loadTodayPlan();
        }
    };

    const addBlock = async (block: Partial<DailyBlock>) => {
        if (!user) return;

        let planId = todayPlan?.id;

        // Create plan if doesn't exist
        if (!planId) {
            const { data: newPlan } = await supabase
                .from('daily_plan')
                .insert({
                    user_id: user.id,
                    plan_date: today,
                    timezone: 'America/Sao_Paulo',
                    status: 'active',
                })
                .select()
                .single();

            planId = newPlan?.id;
            if (newPlan) setTodayPlan(newPlan);
        }

        if (planId) {
            // === SOLVER INTEGRATION ===
            // Convert existing blocks + new block to solver format
            const existingSolverBlocks = todayBlocks.map(b => dailyBlockToSolverBlock(b as any));

            const newSolverBlock: SolverBlock = {
                id: `new_${Date.now()}`,
                title: block.title || 'Novo bloco',
                category: block.category || 'work',
                startMin: block.start_datetime
                    ? new Date(block.start_datetime).getHours() * 60 + new Date(block.start_datetime).getMinutes()
                    : 480,
                endMin: block.end_datetime
                    ? new Date(block.end_datetime).getHours() * 60 + new Date(block.end_datetime).getMinutes()
                    : 540,
                source: (block.source as 'fixed' | 'ai' | 'manual') || 'manual',
                priority: 80, // manual blocks get high priority
                canShorten: true,
                canSplit: block.category === 'work' || block.category === 'study',
                minDuration: 15,
            };

            // Add derived blocks (meal pauses)
            const allWithDerived = processDerivedBlocks([...existingSolverBlocks, newSolverBlock]);

            // Solve for conflicts
            const result = solveTimeline(allWithDerived);

            // Show conflict toasts
            for (const conflict of result.conflicts) {
                if (conflict.action === 'moved' && conflict.newStart !== undefined) {
                    toast.info(
                        `Ajustei "${conflict.blockTitle}" para ${minutesToTime(conflict.newStart)} para evitar conflito.`,
                        { duration: 5000 }
                    );
                } else if (conflict.action === 'suggest_other_day') {
                    toast.warning(
                        `"${conflict.blockTitle}" não cabe hoje. Considere mover para outro dia.`,
                        { duration: 5000 }
                    );
                }
            }

            // Find the resolved version of our new block
            const resolvedNew = result.resolved.find(b => b.id === newSolverBlock.id);
            if (!resolvedNew) {
                toast.error('Não foi possível encaixar o bloco na agenda de hoje.');
                return;
            }

            // Convert solver result back to datetime
            const timeFields = solverBlockToTimeFields(resolvedNew, today);

            // Save via server API (key generated server-side by persistSingleBlock)
            const startDt = new Date(timeFields.start_datetime);
            const endDt = new Date(timeFields.end_datetime);
            const startTime = `${String(startDt.getHours()).padStart(2, '0')}:${String(startDt.getMinutes()).padStart(2, '0')}`;
            const endTime = `${String(endDt.getHours()).padStart(2, '0')}:${String(endDt.getMinutes()).padStart(2, '0')}`;

            const response = await fetch('/api/agenda/blocks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    date: today,
                    title: block.title,
                    category: block.category,
                    start_time: startTime,
                    end_time: endTime,
                    source: (block.source as string) || 'manual',
                    meta: block.meta || {},
                    timezone: 'America/Sao_Paulo',
                }),
            });

            const apiResult = await response.json();

            if (!response.ok || !apiResult.success) {
                console.error('Insert block error:', apiResult);
                toast.error('Erro ao salvar bloco.');
                return;
            }

            const insertedBlock = apiResult.block;

            // Update any existing blocks that were moved by the solver
            const movedConflicts = result.conflicts.filter(
                c => c.action === 'moved' && c.blockId !== newSolverBlock.id && !c.blockId.startsWith('fixed-')
            );

            for (const conflict of movedConflicts) {
                const resolved = result.resolved.find(b => b.id === conflict.blockId);
                if (resolved && conflict.newStart !== undefined) {
                    const movedTimes = solverBlockToTimeFields(resolved, today);
                    await supabase
                        .from('daily_blocks')
                        .update({
                            start_datetime: movedTimes.start_datetime,
                            end_datetime: movedTimes.end_datetime,
                        })
                        .eq('id', conflict.blockId)
                        .eq('user_id', user.id);
                }
            }

            await loadTodayPlan();
        }
    };

    const triggerReplan = async (signal: 'late' | 'done' | 'skip' | 'manual_request', blockId?: string, note?: string) => {
        if (!user) return;

        setIsLoading(true);
        try {
            const response = await fetch('/api/ai/agenda/replan-day', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    date: today,
                    signal,
                    block_id: blockId,
                    user_note: note,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.blocks && Array.isArray(data.blocks)) {
                    // Merge: preserve local done/skipped state (avoids race condition)
                    setTodayBlocks(prev => {
                        const localOverrides = new Map(
                            prev.filter(b => b.is_done || b.is_skipped)
                                .map(b => [b.id, { is_done: b.is_done, is_skipped: b.is_skipped }])
                        );
                        const now = new Date();
                        return data.blocks.map((b: DailyBlock) => {
                            const override = localOverrides.get(b.id);
                            const merged = override
                                ? { ...b, is_done: override.is_done || b.is_done, is_skipped: override.is_skipped || b.is_skipped }
                                : b;
                            return enrichBlockWithStatus(merged, now);
                        });
                    });
                } else {
                    // Fallback: full reload if response doesn't include blocks
                    await loadTodayPlan();
                }
            }
        } catch (error) {
            console.error('Replan error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const replanDay = async (userNote?: string) => {
        await triggerReplan('manual_request', undefined, userNote);
    };

    const generateHealthBlocks = async (options?: { includeMeals?: boolean; includeWorkouts?: boolean }) => {
        if (!user || !todayPlan) return;

        setIsLoading(true);
        try {
            const response = await fetch('/api/ai/health/generate-blocks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    date: today,
                    plan_id: todayPlan.id,
                    include_meals: options?.includeMeals ?? true,
                    include_workouts: options?.includeWorkouts ?? true,
                }),
            });

            if (response.ok) {
                await loadTodayPlan();
            }
        } catch (error) {
            console.error('Generate health blocks error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // ========== A/B Plan Methods ==========

    const generateABPlan = async (date?: string) => {
        if (!user) return;

        setIsABLoading(true);
        try {
            const response = await fetch('/api/ai/agenda/plan-day', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    date: date || today,
                    mode: 'generate_ab',
                    timezone: 'America/Sao_Paulo',
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setABPlans({
                    planA: data.planA || null,
                    planB: data.planB || null,
                });
                toast.success('Dois planos gerados! Escolha o melhor para você.');
            } else {
                const errorData = await response.json().catch(() => ({}));
                toast.error(errorData.error || 'Erro ao gerar planos A/B.');
            }
        } catch (error) {
            console.error('Generate A/B plan error:', error);
            toast.error('Erro de conexão ao gerar planos.');
        } finally {
            setIsABLoading(false);
        }
    };

    const selectPlan = async (plan: 'A' | 'B') => {
        if (!user) return;

        const selectedPlan = plan === 'A' ? abPlans.planA : abPlans.planB;
        if (!selectedPlan) return;

        setIsLoading(true);
        try {
            const response = await fetch('/api/ai/agenda/plan-day', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    date: today,
                    mode: 'confirm_plan',
                    selected_plan: plan,
                    plan_blocks: selectedPlan.blocks,
                    timezone: 'America/Sao_Paulo',
                }),
            });

            if (response.ok) {
                toast.success(`Plano ${plan} aplicado com sucesso!`);
                setABPlans({ planA: null, planB: null });
                await loadTodayPlan();
            } else {
                const errorData = await response.json().catch(() => ({}));
                toast.error(errorData.error || 'Erro ao confirmar plano.');
            }
        } catch (error) {
            console.error('Select plan error:', error);
            toast.error('Erro de conexão ao confirmar plano.');
        } finally {
            setIsLoading(false);
        }
    };

    const clearABPlans = () => {
        setABPlans({ planA: null, planB: null });
    };

    // ========== Recurrence Detection Methods ==========

    const detectRecurrences = async () => {
        if (!user) return;

        setIsRecurrenceLoading(true);
        try {
            const response = await fetch('/api/ai/agenda/detect-recurrence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id }),
            });

            if (response.ok) {
                const data = await response.json();
                setRecurrenceSuggestions(data.suggestions || []);
                if (data.suggestions?.length > 0) {
                    toast.success(`${data.suggestions.length} padrão(ões) detectado(s)!`);
                } else {
                    toast.info('Nenhum padrão recorrente detectado ainda.');
                }
            } else {
                toast.error('Erro ao detectar recorrências.');
            }
        } catch (error) {
            console.error('Detect recurrences error:', error);
            toast.error('Erro de conexão.');
        } finally {
            setIsRecurrenceLoading(false);
        }
    };

    const addRecurrenceAsFixed = async (suggestion: RecurrenceSuggestion) => {
        if (!user) return;

        try {
            const newBlocks = suggestion.days.map(day => ({
                user_id: user.id,
                title: suggestion.title,
                category: suggestion.category,
                day_of_week: day,
                start_time: suggestion.start_time,
                end_time: suggestion.end_time,
                is_active: true,
            }));

            const { error } = await supabase.from('fixed_blocks').insert(newBlocks);
            if (error) throw error;

            toast.success(`"${suggestion.title}" adicionado como bloco fixo!`);
            setRecurrenceSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
        } catch (error) {
            console.error('Add recurrence as fixed error:', error);
            toast.error('Erro ao criar bloco fixo.');
        }
    };

    const dismissRecurrence = (id: string) => {
        setRecurrenceSuggestions(prev => prev.filter(s => s.id !== id));
    };

    // Computed values
    const currentBlock = todayBlocks.find(b => b.status === 'current') || null;
    const nextBlock = todayBlocks.find(b => b.status === 'upcoming') || null;

    return (
        <DailyPlanContext.Provider value={{
            todayPlan,
            todayBlocks,
            fixedBlocks,
            currentBlock,
            nextBlock,
            isLoading,
            abPlans,
            isABLoading,
            recurrenceSuggestions,
            isRecurrenceLoading,
            loadTodayPlan,
            generatePlan,
            generateABPlan,
            selectPlan,
            clearABPlans,
            generateHealthBlocks,
            markBlockDone,
            skipBlock,
            delayBlock,
            addBlock,
            replanDay,
            refreshBlocks,
            detectRecurrences,
            addRecurrenceAsFixed,
            dismissRecurrence,
            selectedDate,
            setSelectedDate,
            loadPlanForDate,
            weekBlocks,
            fetchWeekBlocks,
        }}>
            {children}
        </DailyPlanContext.Provider>
    );
}

export const useDailyPlan = () => {
    const context = useContext(DailyPlanContext);
    if (!context) throw new Error('useDailyPlan must be used within a DailyPlanProvider');
    return context;
};
