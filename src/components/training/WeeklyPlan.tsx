"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Clock, ChevronRight, Sparkles, Loader2, RotateCcw, Play } from 'lucide-react';
import { useTraining } from '@/context/trainingContext';
import { TrainingPlanDay } from '@/types';

const DAY_LABELS: Record<string, string> = {
    mon: 'Segunda', tue: 'Terça', wed: 'Quarta',
    thu: 'Quinta', fri: 'Sexta', sat: 'Sábado', sun: 'Domingo',
};

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const TODAY_DAY_KEY = (() => {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return days[new Date().getDay()];
})();

interface WeeklyPlanProps {
    onStartSession: (day: TrainingPlanDay) => void;
}

export default function WeeklyPlan({ onStartSession }: WeeklyPlanProps) {
    const { weeklyPlan, generateWeeklyPlan, activeSession, recentSessions, isLoading } = useTraining();

    // Check which days have completed sessions this week
    const completedDays = new Set<string>();
    const weekStart = new Date();
    const dayOfWeek = weekStart.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    weekStart.setDate(weekStart.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    for (const session of recentSessions) {
        if (
            session.status === 'completed' &&
            new Date(session.date) >= weekStart &&
            session.day_of_week
        ) {
            completedDays.add(session.day_of_week);
        }
    }

    if (!weeklyPlan) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6">
                    <Dumbbell className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">Plano de Treino Semanal</h3>
                <p className="text-muted text-sm text-center mb-8 max-w-xs">
                    Gere um plano personalizado baseado no seu perfil, objetivos e equipamentos.
                </p>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => generateWeeklyPlan()}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl text-white font-medium disabled:opacity-50"
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Sparkles className="w-5 h-5" />
                    )}
                    Gerar Plano com IA
                </motion.button>
            </div>
        );
    }

    const sortedDays = [...(weeklyPlan.plan_data || [])].sort(
        (a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek)
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-foreground">Plano da Semana</h3>
                    <p className="text-xs text-muted">
                        {weeklyPlan.goal && `Objetivo: ${weeklyPlan.goal}`}
                        {weeklyPlan.level && ` • ${weeklyPlan.level}`}
                        {completedDays.size > 0 && ` • ${completedDays.size}/${sortedDays.filter(d => !d.focus.toLowerCase().includes('descanso') && d.workout?.length > 0).length} sessões`}
                    </p>
                </div>
                <button
                    onClick={() => generateWeeklyPlan()}
                    disabled={isLoading}
                    className="p-2 rounded-lg hover:bg-foreground/10 text-muted hover:text-foreground transition-colors"
                    title="Regenerar plano"
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <RotateCcw className="w-4 h-4" />
                    )}
                </button>
            </div>

            {sortedDays.map((day) => {
                const isToday = day.dayOfWeek === TODAY_DAY_KEY;
                const isRest = !day.workout || day.workout.length === 0 || day.focus.toLowerCase().includes('descanso');
                const isCompleted = completedDays.has(day.dayOfWeek);
                const hasActiveSession = activeSession !== null;

                return (
                    <motion.div
                        key={day.dayOfWeek}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-2xl border transition-all ${isCompleted
                            ? 'bg-green-500/5 border-green-500/20'
                            : isToday
                                ? 'bg-blue-500/10 border-blue-500/30'
                                : 'bg-foreground/5 border-foreground/10'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-semibold ${isCompleted ? 'text-green-600 dark:text-green-400' : isToday ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'
                                    }`}>
                                    {DAY_LABELS[day.dayOfWeek] || day.dayOfWeek}
                                </span>
                                {isToday && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300">
                                        HOJE
                                    </span>
                                )}
                                {isCompleted && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-700 dark:text-green-300">
                                        ✓ FEITO
                                    </span>
                                )}
                            </div>
                            <span className="text-xs text-muted font-medium">{day.focus}</span>
                        </div>

                        {isRest ? (
                            <p className="text-sm text-muted">Dia de descanso 😌</p>
                        ) : (
                            <>
                                <div className="space-y-1.5 mb-3">
                                    {day.workout.slice(0, 4).map((ex, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm">
                                            <Dumbbell className="w-3 h-3 text-muted/30" />
                                            <span className="text-foreground/70 truncate flex-1">{ex.name}</span>
                                            <span className="text-muted text-xs">
                                                {ex.setsTarget}x{ex.repsTarget}
                                            </span>
                                        </div>
                                    ))}
                                    {day.workout.length > 4 && (
                                        <p className="text-xs text-muted">+{day.workout.length - 4} mais</p>
                                    )}
                                </div>

                                {/* Start button: show for any non-completed day (not just today) */}
                                {!isCompleted && !hasActiveSession && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => onStartSession(day)}
                                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${isToday
                                            ? 'bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-300 hover:bg-blue-500/20'
                                            : 'bg-foreground/5 border border-foreground/10 text-muted hover:bg-foreground/10 hover:text-foreground'
                                            }`}
                                    >
                                        <Play className="w-4 h-4" />
                                        {isToday ? 'Iniciar Treino' : 'Treinar'}
                                    </motion.button>
                                )}
                            </>
                        )}
                    </motion.div>
                );
            })}
        </div>
    );
}
