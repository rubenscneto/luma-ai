"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp, Scale, Flame, Target,
    Loader2, Clock, Dumbbell, ChevronDown, ChevronUp
} from 'lucide-react';
import { useTraining } from '@/context/trainingContext';

function WeightTrendChart({ metrics }: { metrics: { date: string; weight_kg: number | null }[] }) {
    const data = useMemo(() => {
        return [...metrics]
            .filter(m => m.weight_kg !== null)
            .slice(0, 14)
            .reverse();
    }, [metrics]);

    if (data.length < 2) return null;

    const weights = data.map(d => d.weight_kg!);
    const min = Math.min(...weights) - 0.5;
    const max = Math.max(...weights) + 0.5;
    const range = max - min || 1;

    const width = 100;
    const height = 40;

    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((d.weight_kg! - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    const trend = weights[weights.length - 1] - weights[0];

    return (
        <div className="mt-3">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-10" preserveAspectRatio="none">
                <polyline
                    points={points}
                    fill="none"
                    stroke={trend <= 0 ? '#22c55e' : '#f59e0b'}
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                />
                {data.map((d, i) => {
                    const x = (i / (data.length - 1)) * width;
                    const y = height - ((d.weight_kg! - min) / range) * height;
                    return (
                        <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r="2"
                            fill={trend <= 0 ? '#22c55e' : '#f59e0b'}
                        />
                    );
                })}
            </svg>
            <div className="flex justify-between text-[10px] text-white/30 mt-1">
                <span>{data[0].date.split('-').slice(1).join('/')}</span>
                <span className={trend <= 0 ? 'text-green-400' : 'text-amber-400'}>
                    {trend > 0 ? '+' : ''}{trend.toFixed(1)} kg
                </span>
                <span>{data[data.length - 1].date.split('-').slice(1).join('/')}</span>
            </div>
        </div>
    );
}

export default function ProgressDashboard() {
    const { recentSessions, bodyMetrics, progressions, isLoading, loadRecentSessions, loadBodyMetrics, loadProgressions, logBodyWeight } = useTraining();
    const [weightInput, setWeightInput] = useState('');
    const [showWeightForm, setShowWeightForm] = useState(false);
    const [showAllSessions, setShowAllSessions] = useState(false);

    useEffect(() => {
        loadRecentSessions();
        loadBodyMetrics();
    }, [loadRecentSessions, loadBodyMetrics]);

    const handleLogWeight = async () => {
        if (!weightInput) return;
        await logBodyWeight(parseFloat(weightInput));
        setWeightInput('');
        setShowWeightForm(false);
    };

    const completedSessions = recentSessions.filter(s => s.status === 'completed');
    const totalSessions = completedSessions.length;
    const totalMinutes = completedSessions.reduce((sum, s) => sum + (s.duration_min || 0), 0);
    const latestWeight = bodyMetrics.length > 0 ? bodyMetrics[0].weight_kg : null;

    // Calculate average session duration
    const avgDuration = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center">
                    <Dumbbell className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-white">{totalSessions}</p>
                    <p className="text-[10px] text-white/45">Sessões</p>
                </div>
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center">
                    <Clock className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-white">{avgDuration}</p>
                    <p className="text-[10px] text-white/45">min/sessão</p>
                </div>
                <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-center">
                    <Scale className="w-5 h-5 text-green-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-white">
                        {latestWeight ? `${latestWeight}` : '-'}
                    </p>
                    <p className="text-[10px] text-white/45">kg atual</p>
                </div>
            </div>

            {/* Body Weight Tracking */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white">Peso Corporal</h4>
                    <button
                        onClick={() => setShowWeightForm(!showWeightForm)}
                        className="text-xs text-blue-400 hover:text-blue-300"
                    >
                        {showWeightForm ? 'Cancelar' : '+ Registrar'}
                    </button>
                </div>

                {showWeightForm && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="flex gap-2 mb-3"
                    >
                        <input
                            type="number"
                            step="0.1"
                            value={weightInput}
                            onChange={e => setWeightInput(e.target.value)}
                            placeholder="Ex: 75.5"
                            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                        <button
                            onClick={handleLogWeight}
                            disabled={!weightInput}
                            className="px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300 text-sm font-medium disabled:opacity-30"
                        >
                            Salvar
                        </button>
                    </motion.div>
                )}

                {/* Weight trend chart */}
                <WeightTrendChart metrics={bodyMetrics} />

                {bodyMetrics.length > 0 ? (
                    <div className="space-y-2 mt-3">
                        {bodyMetrics.slice(0, 7).map((metric) => (
                            <div key={metric.id} className="flex items-center justify-between text-sm">
                                <span className="text-white/50">
                                    {new Date(metric.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                </span>
                                <span className="text-white font-medium">
                                    {metric.weight_kg} kg
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-white/40">Nenhum registro de peso ainda.</p>
                )}
            </div>

            {/* Progression Suggestions */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-400" />
                        Progressão IA
                    </h4>
                    <button
                        onClick={loadProgressions}
                        disabled={isLoading}
                        className="text-xs text-blue-400 hover:text-blue-300"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analisar'}
                    </button>
                </div>

                {progressions.length > 0 ? (
                    <div className="space-y-3">
                        {progressions.map((p, idx) => {
                            const typeColors: Record<string, string> = {
                                increase_weight: 'text-green-400 bg-green-500/10',
                                increase_reps: 'text-blue-400 bg-blue-500/10',
                                decrease_rest: 'text-orange-400 bg-orange-500/10',
                                maintain: 'text-yellow-400 bg-yellow-500/10',
                                deload: 'text-red-400 bg-red-500/10',
                            };
                            const typeLabels: Record<string, string> = {
                                increase_weight: '↑ Carga',
                                increase_reps: '↑ Reps',
                                decrease_rest: '↓ Descanso',
                                maintain: '= Manter',
                                deload: '↓ Deload',
                            };

                            return (
                                <div key={idx} className="flex items-start gap-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${typeColors[p.type] || 'text-white/50'}`}>
                                        {typeLabels[p.type] || p.type}
                                    </span>
                                    <div className="flex-1">
                                        <p className="text-sm text-white">{p.exerciseName}</p>
                                        <p className="text-xs text-white/50">{p.detail}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-sm text-white/40">
                        Complete mais sessões para receber sugestões de progressão.
                    </p>
                )}
            </div>

            {/* Recent Sessions */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <h4 className="text-sm font-semibold text-white mb-3">Sessões Recentes</h4>
                {recentSessions.length > 0 ? (
                    <div className="space-y-2">
                        {recentSessions.slice(0, showAllSessions ? 10 : 5).map((session) => (
                            <div key={session.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                                <div>
                                    <p className="text-sm text-white font-medium">{session.focus || 'Treino'}</p>
                                    <p className="text-xs text-white/40">
                                        {new Date(session.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-white">{session.duration_min || '?'} min</p>
                                    <p className={`text-xs ${session.status === 'completed' ? 'text-green-400' : 'text-orange-400'}`}>
                                        {session.status === 'completed' ? '✓ Concluído' : 'Em progresso'}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {recentSessions.length > 5 && (
                            <button
                                onClick={() => setShowAllSessions(!showAllSessions)}
                                className="w-full flex items-center justify-center gap-1 py-2 text-xs text-white/40 hover:text-white/60 transition-colors"
                            >
                                {showAllSessions ? (
                                    <>Mostrar menos <ChevronUp className="w-3 h-3" /></>
                                ) : (
                                    <>Mostrar mais <ChevronDown className="w-3 h-3" /></>
                                )}
                            </button>
                        )}
                    </div>
                ) : (
                    <p className="text-sm text-white/40">Nenhuma sessão ainda.</p>
                )}
            </div>
        </div>
    );
}
