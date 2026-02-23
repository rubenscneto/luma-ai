"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useWeeklyScores } from '@/hooks/useWeeklyScores';
import { cn } from '@/lib/utils';

export function PerformanceDashboard() {
    const { scores, loading, weeklyAverage } = useWeeklyScores();

    if (loading) {
        return (
            <div className="bg-card border border-card-border rounded-3xl p-6 animate-pulse">
                <div className="h-6 w-48 bg-foreground/10 rounded-md mb-8" />
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="h-24 bg-foreground/5 rounded-2xl" />
                    <div className="h-24 bg-foreground/5 rounded-2xl" />
                </div>
                <div className="h-32 bg-foreground/5 rounded-2xl" />
            </div>
        );
    }

    // Prepare chart data
    const maxScore = 100;
    const padding = 20;
    const width = 300;
    const height = 100;
    const points = scores.map((s, i) => {
        const x = i * (width / (scores.length - 1 || 1));
        const y = height - (s.weighted_final_score / maxScore) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <section className="bg-card border border-card-border rounded-3xl p-6 shadow-sm overflow-hidden relative">
            {/* Background Accent */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent/5 blur-3xl rounded-full pointer-events-none" />

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-lg font-bold text-foreground">Performance Semanal</h2>
                    <p className="text-xs text-muted">Baseado em consistência e adesão</p>
                </div>
                <div className="p-2 bg-accent/10 rounded-xl text-accent">
                    <TrendingUp className="w-5 h-5" />
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-surface border border-card-border/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-muted mb-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-500" /> Consistência
                    </span>
                    <span className="text-2xl font-bold text-foreground">
                        {Math.round(weeklyAverage.consistency)}%
                    </span>
                </div>
                <div className="bg-surface border border-card-border/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-muted mb-1 flex items-center gap-1">
                        <Target className="w-3 h-3 text-accent" /> Adesão
                    </span>
                    <span className="text-2xl font-bold text-foreground">
                        {Math.round(weeklyAverage.adherence)}%
                    </span>
                </div>
            </div>

            {/* Performance Chart */}
            <div className="mb-6">
                <div className="flex items-center justify-between text-[10px] text-muted mb-2 px-1">
                    <span>Evolução da semana (Score Final)</span>
                    <span className="font-medium text-accent">Média: {Math.round(weeklyAverage.final)}%</span>
                </div>

                <div className="relative h-24 w-full bg-foreground/5 rounded-xl overflow-hidden px-2 pt-4">
                    {scores.length > 1 ? (
                        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full preserve-3d">
                            {/* Area gradient */}
                            <defs>
                                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
                                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                                </linearGradient>
                            </defs>

                            <motion.path
                                d={`M 0 ${height} L ${points} L ${width} ${height} Z`}
                                fill="url(#chartGradient)"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 1 }}
                            />

                            <motion.polyline
                                fill="none"
                                stroke="var(--accent)"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                points={points}
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 1 }}
                                transition={{ duration: 1.5, ease: "easeInOut" }}
                            />
                        </svg>
                    ) : (
                        <div className="flex items-center justify-center h-full text-[10px] text-muted italic">
                            Dados insuficientes para gerar gráfico
                        </div>
                    )}
                </div>
            </div>

            {/* Daily History (Mini) */}
            <div className="space-y-2">
                <div className="flex items-center justify-between px-1 mb-3">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Histórico Diário</span>
                    <Info className="w-3 h-3 text-muted" />
                </div>

                <div className="flex items-center justify-between gap-1">
                    {scores.slice(-7).map((s, i) => {
                        const date = new Date(s.plan_date + 'T12:00:00');
                        const dayLabel = date.toLocaleDateString('pt-BR', { weekday: 'short' }).split('.')[0];
                        const isToday = s.plan_date === new Date().toISOString().split('T')[0];

                        return (
                            <div key={s.id} className="flex flex-col items-center gap-1.5 flex-1">
                                <div className="text-[10px] text-muted font-medium capitalize">
                                    {dayLabel}
                                </div>
                                <div
                                    className={cn(
                                        "w-full h-1.5 rounded-full overflow-hidden bg-foreground/5",
                                        isToday && "ring-1 ring-accent/30"
                                    )}
                                    title={`Score: ${s.weighted_final_score}%`}
                                >
                                    <motion.div
                                        className={cn(
                                            "h-full rounded-full",
                                            s.weighted_final_score > 80 ? "bg-green-500" :
                                                s.weighted_final_score > 50 ? "bg-accent" :
                                                    "bg-accent2"
                                        )}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${s.weighted_final_score}%` }}
                                        transition={{ duration: 1, delay: i * 0.1 }}
                                    />
                                </div>
                            </div>
                        );
                    })}

                    {/* Empty states for remaining days if less than 7 */}
                    {Array.from({ length: Math.max(0, 7 - scores.length) }).map((_, i) => (
                        <div key={`empty-${i}`} className="flex flex-col items-center gap-1.5 flex-1 opacity-20">
                            <div className="text-[10px] text-muted font-medium">-</div>
                            <div className="w-full h-1.5 rounded-full bg-foreground/10" />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
