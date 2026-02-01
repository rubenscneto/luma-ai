"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { DailyPlan, DailyBlock, DailyBlockWithStatus, BlockStatus, FixedBlock } from '@/types';
import { useAuth } from './authContext';
import { supabase } from '@/lib/supabase';

interface DailyPlanContextType {
    // State
    todayPlan: DailyPlan | null;
    todayBlocks: DailyBlockWithStatus[];
    fixedBlocks: FixedBlock[];
    currentBlock: DailyBlockWithStatus | null;
    nextBlock: DailyBlockWithStatus | null;
    isLoading: boolean;

    // Actions
    loadTodayPlan: () => Promise<void>;
    generatePlan: (date?: string) => Promise<void>;
    markBlockDone: (blockId: string) => Promise<void>;
    skipBlock: (blockId: string, reason?: string) => Promise<void>;
    delayBlock: (blockId: string, minutes: number) => Promise<void>;
    addBlock: (block: Partial<DailyBlock>) => Promise<void>;
    triggerReplan: (event: string, details: string) => Promise<void>;
    refreshBlocks: () => void;
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
    const [isLoading, setIsLoading] = useState(false);

    const today = new Date().toISOString().split('T')[0];

    const loadTodayPlan = useCallback(async () => {
        if (!user) return;

        setIsLoading(true);
        try {
            const now = new Date();

            // Load fixed blocks
            const { data: fixed } = await supabase
                .from('fixed_blocks')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_active', true);

            setFixedBlocks(fixed || []);

            // Load today's plan
            const { data: plan } = await supabase
                .from('daily_plan')
                .select('*')
                .eq('user_id', user.id)
                .eq('plan_date', today)
                .single();

            if (plan) {
                setTodayPlan(plan);

                // Load blocks
                const { data: blocks } = await supabase
                    .from('daily_blocks')
                    .select('*')
                    .eq('plan_id', plan.id)
                    .order('start_datetime', { ascending: true });

                const enriched = (blocks || []).map(b => enrichBlockWithStatus(b, now));
                setTodayBlocks(enriched);
            } else {
                setTodayPlan(null);
                setTodayBlocks([]);
            }
        } catch (error) {
            console.error('Load today plan error:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user, today]);

    const refreshBlocks = useCallback(() => {
        const now = new Date();
        setTodayBlocks(prev => prev.map(b => enrichBlockWithStatus(b, now)));
    }, []);

    // Auto-refresh every 60 seconds
    useEffect(() => {
        const interval = setInterval(refreshBlocks, 60000);
        return () => clearInterval(interval);
    }, [refreshBlocks]);

    // Load on mount
    useEffect(() => {
        loadTodayPlan();
    }, [loadTodayPlan]);

    const generatePlan = async (date?: string) => {
        if (!user) return;

        setIsLoading(true);
        try {
            const response = await fetch('/api/ai/generate-daily-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    date: date || today,
                    timezone: 'America/Sao_Paulo',
                }),
            });

            if (response.ok) {
                await loadTodayPlan();
            }
        } catch (error) {
            console.error('Generate plan error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const markBlockDone = async (blockId: string) => {
        if (!user) return;

        const { error } = await supabase
            .from('daily_blocks')
            .update({ is_done: true, done_at: new Date().toISOString() })
            .eq('id', blockId)
            .eq('user_id', user.id);

        if (!error) {
            setTodayBlocks(prev => prev.map(b =>
                b.id === blockId ? { ...b, is_done: true, status: 'done' } : b
            ));
        }
    };

    const skipBlock = async (blockId: string, reason?: string) => {
        if (!user) return;

        const { error } = await supabase
            .from('daily_blocks')
            .update({ is_skipped: true, skip_reason: reason })
            .eq('id', blockId)
            .eq('user_id', user.id);

        if (!error) {
            setTodayBlocks(prev => prev.map(b =>
                b.id === blockId ? { ...b, is_skipped: true, status: 'skipped' } : b
            ));

            // Trigger replan
            await triggerReplan('skip', `Pulou: ${reason || 'sem motivo'}`);
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
            await triggerReplan('delay', `Atrasou ${minutes} minutos`);
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
            await supabase
                .from('daily_blocks')
                .insert({
                    plan_id: planId,
                    user_id: user.id,
                    source: 'manual',
                    is_done: false,
                    is_skipped: false,
                    order_index: todayBlocks.length * 10,
                    ...block,
                });

            await loadTodayPlan();
        }
    };

    const triggerReplan = async (event: string, details: string) => {
        if (!user || !todayPlan) return;

        try {
            await fetch('/api/ai/replan-day', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    plan_id: todayPlan.id,
                    event,
                    event_details: details,
                }),
            });

            await loadTodayPlan();
        } catch (error) {
            console.error('Replan error:', error);
        }
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
            loadTodayPlan,
            generatePlan,
            markBlockDone,
            skipBlock,
            delayBlock,
            addBlock,
            triggerReplan,
            refreshBlocks,
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
