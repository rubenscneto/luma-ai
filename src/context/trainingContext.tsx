"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { TrainingPlanWeekly, TrainingPlanDay, WorkoutSession, WorkoutSet, BodyMetric, ProgressionSuggestion } from '@/types';
import { useAuth } from './authContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface TrainingContextType {
    weeklyPlan: TrainingPlanWeekly | null;
    activeSession: WorkoutSession | null;
    sessionSets: WorkoutSet[];
    recentSessions: WorkoutSession[];
    bodyMetrics: BodyMetric[];
    progressions: ProgressionSuggestion[];
    isLoading: boolean;

    loadWeeklyPlan: () => Promise<void>;
    generateWeeklyPlan: (options?: { goal?: string; level?: string; timePerSession?: number; equipment?: string[] }) => Promise<void>;
    startSession: (dayPlan: TrainingPlanDay) => Promise<void>;
    logSet: (exerciseId: string, exerciseName: string, setNumber: number, data: { weightKg: number; reps: number; restSec?: number; rpe?: number }) => Promise<void>;
    completeSession: () => Promise<void>;
    cancelSession: () => Promise<void>;
    loadRecentSessions: () => Promise<void>;
    loadProgressions: () => Promise<void>;
    logBodyWeight: (weightKg: number, notes?: string) => Promise<void>;
    loadBodyMetrics: () => Promise<void>;
}

const TrainingContext = createContext<TrainingContextType | undefined>(undefined);

export function TrainingProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [weeklyPlan, setWeeklyPlan] = useState<TrainingPlanWeekly | null>(null);
    const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
    const [sessionSets, setSessionSets] = useState<WorkoutSet[]>([]);
    const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
    const [bodyMetrics, setBodyMetrics] = useState<BodyMetric[]>([]);
    const [progressions, setProgressions] = useState<ProgressionSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const loadWeeklyPlan = useCallback(async () => {
        if (!user) return;
        try {
            const { data } = await supabase
                .from('training_plan_weekly')
                .select('*')
                .eq('user_id', user.id)
                .order('week_start', { ascending: false })
                .limit(1)
                .single();

            if (data) {
                setWeeklyPlan(data as TrainingPlanWeekly);
            }
        } catch {
            // No plan yet
        }
    }, [user]);

    // Resume any in-progress session on mount
    const loadActiveSession = useCallback(async () => {
        if (!user) return;
        try {
            const { data: session } = await supabase
                .from('workout_sessions')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'in_progress')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (session) {
                setActiveSession(session as WorkoutSession);

                // Load existing sets for this session
                const { data: sets } = await supabase
                    .from('workout_sets')
                    .select('*')
                    .eq('session_id', session.id)
                    .order('set_number', { ascending: true });

                setSessionSets((sets || []) as WorkoutSet[]);
            }
        } catch {
            // No active session
        }
    }, [user]);

    const loadRecentSessions = useCallback(async () => {
        if (!user) return;
        try {
            const { data } = await supabase
                .from('workout_sessions')
                .select('*')
                .eq('user_id', user.id)
                .order('date', { ascending: false })
                .limit(10);

            setRecentSessions((data || []) as WorkoutSession[]);
        } catch (error) {
            console.error('Load recent sessions error:', error);
        }
    }, [user]);

    const loadBodyMetrics = useCallback(async () => {
        if (!user) return;
        try {
            const { data } = await supabase
                .from('body_metrics')
                .select('*')
                .eq('user_id', user.id)
                .order('date', { ascending: false })
                .limit(30);

            setBodyMetrics((data || []) as BodyMetric[]);
        } catch (error) {
            console.error('Load body metrics error:', error);
        }
    }, [user]);

    // Auto-load on mount
    useEffect(() => {
        if (user) {
            loadWeeklyPlan();
            loadActiveSession();
            loadRecentSessions();
            loadBodyMetrics();
        }
    }, [user, loadWeeklyPlan, loadActiveSession, loadRecentSessions, loadBodyMetrics]);

    const generateWeeklyPlan = async (options?: { goal?: string; level?: string; timePerSession?: number; equipment?: string[] }) => {
        if (!user) return;
        setIsLoading(true);
        try {
            const response = await fetch('/api/ai/training/generate-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    ...options,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setWeeklyPlan(data.plan);
                toast.success('Plano de treino gerado com sucesso!');
            } else {
                toast.error(data.errorMessage || 'Erro ao gerar plano de treino.');
            }
        } catch (error) {
            console.error('Generate weekly plan error:', error);
            toast.error('Erro de conexão ao gerar plano.');
        } finally {
            setIsLoading(false);
        }
    };

    const startSession = async (dayPlan: TrainingPlanDay) => {
        if (!user) return;
        setIsLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];

            const { data: session, error } = await supabase
                .from('workout_sessions')
                .insert({
                    user_id: user.id,
                    plan_id: weeklyPlan?.id,
                    date: today,
                    day_of_week: dayPlan.dayOfWeek,
                    focus: dayPlan.focus,
                    status: 'in_progress',
                })
                .select()
                .single();

            if (error) throw error;

            setActiveSession(session as WorkoutSession);
            setSessionSets([]);
            toast.success(`Treino iniciado: ${dayPlan.focus}`);
        } catch (error) {
            console.error('Start session error:', error);
            toast.error('Erro ao iniciar sessão.');
        } finally {
            setIsLoading(false);
        }
    };

    const logSet = async (exerciseId: string, exerciseName: string, setNumber: number, data: { weightKg: number; reps: number; restSec?: number; rpe?: number }) => {
        if (!user || !activeSession) return;

        try {
            const { data: savedSet, error } = await supabase
                .from('workout_sets')
                .insert({
                    session_id: activeSession.id,
                    user_id: user.id,
                    exercise_id: exerciseId,
                    exercise_name: exerciseName,
                    set_number: setNumber,
                    weight_kg: data.weightKg,
                    reps: data.reps,
                    rest_sec: data.restSec || null,
                    rpe: data.rpe || null,
                })
                .select()
                .single();

            if (error) throw error;

            setSessionSets(prev => [...prev, savedSet as WorkoutSet]);
        } catch (error) {
            console.error('Log set error:', error);
            toast.error('Erro ao salvar série.');
        }
    };

    const completeSession = async () => {
        if (!user || !activeSession) return;
        setIsLoading(true);
        try {
            const startTime = new Date(activeSession.created_at || Date.now());
            const durationMin = Math.round((Date.now() - startTime.getTime()) / 60000);

            const { error } = await supabase
                .from('workout_sessions')
                .update({
                    status: 'completed',
                    duration_min: durationMin,
                    completed_at: new Date().toISOString(),
                })
                .eq('id', activeSession.id)
                .eq('user_id', user.id);

            if (error) throw error;

            toast.success(`Treino concluído! Duração: ${durationMin} min`);
            setActiveSession(null);
            setSessionSets([]);
            await loadRecentSessions();
        } catch (error) {
            console.error('Complete session error:', error);
            toast.error('Erro ao finalizar sessão.');
        } finally {
            setIsLoading(false);
        }
    };

    const cancelSession = async () => {
        if (!user || !activeSession) return;
        try {
            // Delete the session and its sets
            await supabase.from('workout_sets').delete().eq('session_id', activeSession.id);
            await supabase.from('workout_sessions').delete().eq('id', activeSession.id).eq('user_id', user.id);

            setActiveSession(null);
            setSessionSets([]);
            toast('Sessão cancelada.');
        } catch (error) {
            console.error('Cancel session error:', error);
            toast.error('Erro ao cancelar sessão.');
        }
    };

    const loadProgressions = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const response = await fetch('/api/ai/training/progression', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id }),
            });

            const data = await response.json();

            if (data.success && data.progressions) {
                setProgressions(data.progressions);
            }
        } catch (error) {
            console.error('Load progressions error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const logBodyWeight = async (weightKg: number, notes?: string) => {
        if (!user) return;
        try {
            const today = new Date().toISOString().split('T')[0];
            const { error } = await supabase
                .from('body_metrics')
                .insert({
                    user_id: user.id,
                    date: today,
                    weight_kg: weightKg,
                    notes,
                });

            if (error) throw error;
            toast.success('Peso registrado!');
            await loadBodyMetrics();
        } catch (error) {
            console.error('Log body weight error:', error);
            toast.error('Erro ao registrar peso.');
        }
    };

    return (
        <TrainingContext.Provider value={{
            weeklyPlan,
            activeSession,
            sessionSets,
            recentSessions,
            bodyMetrics,
            progressions,
            isLoading,
            loadWeeklyPlan,
            generateWeeklyPlan,
            startSession,
            logSet,
            completeSession,
            cancelSession,
            loadRecentSessions,
            loadProgressions,
            logBodyWeight,
            loadBodyMetrics,
        }}>
            {children}
        </TrainingContext.Provider>
    );
}

export const useTraining = () => {
    const context = useContext(TrainingContext);
    if (!context) throw new Error('useTraining must be used within a TrainingProvider');
    return context;
};
