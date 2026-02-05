"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/authContext";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
    BarChart3, Clock, Zap, Target, BrainCircuit, TrendingUp,
    CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw
} from "lucide-react";

interface DailyBlock {
    id: string;
    title: string;
    category: string;
    start_datetime: string;
    end_datetime: string;
    is_done: boolean;
    is_skipped: boolean;
    source: string;
}

interface Stats {
    totalBlocks: number;
    completedBlocks: number;
    skippedBlocks: number;
    completionRate: number;
    totalHoursPlanned: number;
    focusDistribution: Record<string, number>;
    mostProductiveTime: string;
    streakDays: number;
    insights: string[];
}

const defaultStats: Stats = {
    totalBlocks: 0,
    completedBlocks: 0,
    skippedBlocks: 0,
    completionRate: 0,
    totalHoursPlanned: 0,
    focusDistribution: {},
    mostProductiveTime: "-",
    streakDays: 0,
    insights: [],
};

export default function AnalyticsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<Stats>(defaultStats);
    const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week');

    const fetchStats = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        try {
            // Calculate date range
            const now = new Date();
            let startDate: string;
            if (period === 'week') {
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            } else if (period === 'month') {
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
            } else {
                startDate = new Date(0).toISOString();
            }

            // Fetch daily blocks
            const { data: blocks, error } = await supabase
                .from("daily_blocks")
                .select("*")
                .eq("user_id", user.id)
                .gte("start_datetime", startDate)
                .order("start_datetime", { ascending: true });

            if (error) throw error;

            if (!blocks || blocks.length === 0) {
                setStats(defaultStats);
                setLoading(false);
                return;
            }

            // Calculate stats
            const completed = blocks.filter(b => b.is_done);
            const skipped = blocks.filter(b => b.is_skipped);

            // Focus distribution
            const dist: Record<string, number> = {};
            let totalMinutes = 0;

            blocks.forEach(b => {
                const start = new Date(b.start_datetime);
                const end = new Date(b.end_datetime);
                const mins = (end.getTime() - start.getTime()) / (1000 * 60);
                totalMinutes += mins;

                const cat = b.category || 'outro';
                dist[cat] = (dist[cat] || 0) + mins;
            });

            // Calculate most productive time based on completed blocks
            const hourCounts: Record<number, number> = {};
            completed.forEach(b => {
                const hour = new Date(b.start_datetime).getHours();
                hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            });

            let mostProductiveHour = 9; // default
            let maxCount = 0;
            for (const [hour, count] of Object.entries(hourCounts)) {
                if (count > maxCount) {
                    maxCount = count;
                    mostProductiveHour = parseInt(hour);
                }
            }

            const getTimePeriod = (hour: number) => {
                if (hour >= 5 && hour < 12) return "Manhã";
                if (hour >= 12 && hour < 18) return "Tarde";
                return "Noite";
            };

            // Calculate streak (simplified - days with at least one completed block)
            const datesWithCompletions = new Set(
                completed.map(b => new Date(b.start_datetime).toDateString())
            );

            // Generate insights
            const insights: string[] = [];
            const completionRate = blocks.length > 0 ? (completed.length / blocks.length) * 100 : 0;

            if (completionRate >= 80) {
                insights.push("🎯 Excelente taxa de conclusão! Você está no caminho certo.");
            } else if (completionRate >= 50) {
                insights.push("💪 Boa taxa de conclusão. Continue focando nas prioridades.");
            } else if (completionRate > 0) {
                insights.push("⚠️ Sua taxa de conclusão está baixa. Tente planejar menos blocos ou blocos mais curtos.");
            }

            if (skipped.length > completed.length) {
                insights.push("📊 Você está pulando mais tarefas do que completando. Revise seu planejamento.");
            }

            const topCategory = Object.entries(dist).sort(([, a], [, b]) => b - a)[0];
            if (topCategory) {
                insights.push(`🔍 Você investe mais tempo em ${translateType(topCategory[0])}.`);
            }

            if (mostProductiveHour && maxCount > 2) {
                insights.push(`⚡ Seu pico de produtividade é às ${mostProductiveHour}h. Agende tarefas importantes nesse horário.`);
            }

            setStats({
                totalBlocks: blocks.length,
                completedBlocks: completed.length,
                skippedBlocks: skipped.length,
                completionRate: Math.round(completionRate),
                totalHoursPlanned: Math.round(totalMinutes / 60),
                focusDistribution: dist,
                mostProductiveTime: completed.length > 0 ? getTimePeriod(mostProductiveHour) : "-",
                streakDays: datesWithCompletions.size,
                insights,
            });
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    }, [user, period]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const maxVal = Math.max(...Object.values(stats.focusDistribution), 1);

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-violet-500/10 rounded-xl">
                        <BarChart3 className="w-8 h-8 text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Analytics</h1>
                        <p className="text-white/60 text-sm">Seus dados de produtividade</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-white/5 rounded-lg p-1">
                        {(['week', 'month', 'all'] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${period === p
                                        ? 'bg-brand-primary text-white'
                                        : 'text-white/60 hover:text-white'
                                    }`}
                            >
                                {p === 'week' ? '7 dias' : p === 'month' ? '30 dias' : 'Tudo'}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={fetchStats}
                        disabled={loading}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-5 h-5 text-white/60 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
                </div>
            ) : stats.totalBlocks === 0 ? (
                <Card className="p-8 text-center bg-white/5 border-white/10">
                    <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Nenhum dado encontrado</h3>
                    <p className="text-white/60">
                        Comece a usar a Agenda para ver seus analytics aqui.
                    </p>
                </Card>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                        <KpiCard
                            icon={Target}
                            label="Blocos Criados"
                            value={stats.totalBlocks}
                            color="text-blue-400"
                        />
                        <KpiCard
                            icon={CheckCircle2}
                            label="Completados"
                            value={stats.completedBlocks}
                            subtitle={`${stats.completionRate}%`}
                            color="text-emerald-400"
                        />
                        <KpiCard
                            icon={Clock}
                            label="Horas Planejadas"
                            value={`${stats.totalHoursPlanned}h`}
                            color="text-violet-400"
                        />
                        <KpiCard
                            icon={Zap}
                            label="Pico de Energia"
                            value={stats.mostProductiveTime}
                            color="text-amber-400"
                        />
                    </div>

                    {/* Insights Section */}
                    {stats.insights.length > 0 && (
                        <Card className="p-5 bg-gradient-to-br from-violet-500/10 to-blue-500/10 border-violet-500/20">
                            <div className="flex items-center gap-2 mb-3">
                                <BrainCircuit className="w-5 h-5 text-violet-400" />
                                <h3 className="font-semibold text-white">Insights da IA</h3>
                            </div>
                            <ul className="space-y-2">
                                {stats.insights.map((insight, idx) => (
                                    <li key={idx} className="text-white/80 text-sm">
                                        {insight}
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}

                    {/* Distribution Chart */}
                    <Card className="p-6 bg-white/5 border-white/10">
                        <h2 className="text-lg font-bold text-white mb-6">Distribuição por Categoria</h2>
                        <div className="flex items-end gap-3 h-48 md:h-64 justify-between max-w-2xl mx-auto">
                            {Object.entries(stats.focusDistribution).map(([key, value]) => {
                                const heightPercent = maxVal > 0 ? (value / maxVal) * 100 : 0;
                                return (
                                    <div key={key} className="flex-1 flex flex-col items-center gap-2 group max-w-20">
                                        <div className="relative w-full bg-white/10 rounded-t-xl h-full flex items-end overflow-hidden min-w-8">
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: `${heightPercent}%` }}
                                                transition={{ duration: 0.8, type: "spring" }}
                                                className={`w-full ${getColor(key)} opacity-80 group-hover:opacity-100 transition-opacity rounded-t-lg`}
                                            />
                                        </div>
                                        <span className="capitalize font-medium text-white/60 text-xs text-center truncate w-full">
                                            {translateType(key)}
                                        </span>
                                        <span className="text-xs text-white/40 font-mono">
                                            {Math.round(value / 60)}h
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Additional Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="p-5 bg-white/5 border-white/10">
                            <div className="flex items-center gap-2 mb-3">
                                <TrendingUp className="w-5 h-5 text-emerald-400" />
                                <h3 className="font-semibold text-white">Resumo</h3>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-white/60 text-sm">Dias ativos</span>
                                    <span className="text-white font-medium">{stats.streakDays}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-white/60 text-sm">Tarefas puladas</span>
                                    <span className="text-orange-400 font-medium">{stats.skippedBlocks}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-white/60 text-sm">Taxa de conclusão</span>
                                    <span className={`font-medium ${stats.completionRate >= 70 ? 'text-emerald-400' :
                                            stats.completionRate >= 40 ? 'text-amber-400' : 'text-red-400'
                                        }`}>
                                        {stats.completionRate}%
                                    </span>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-5 bg-white/5 border-white/10">
                            <div className="flex items-center gap-2 mb-3">
                                <XCircle className="w-5 h-5 text-orange-400" />
                                <h3 className="font-semibold text-white">Tendências</h3>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-white/60 text-sm">Foco principal</span>
                                    <span className="text-white font-medium">{getTopFocus(stats.focusDistribution)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-white/60 text-sm">Melhor horário</span>
                                    <span className="text-white font-medium">{stats.mostProductiveTime}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-white/60 text-sm">Média por dia</span>
                                    <span className="text-white font-medium">
                                        {stats.streakDays > 0 ? Math.round(stats.totalBlocks / stats.streakDays) : 0} blocos
                                    </span>
                                </div>
                            </div>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}

function KpiCard({ icon: Icon, label, value, subtitle, color = "text-white" }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    subtitle?: string;
    color?: string;
}) {
    return (
        <Card className="p-4 md:p-6 bg-white/5 border-white/10 hover:bg-white/8 transition-colors">
            <div className="flex items-start justify-between">
                <div className={`p-2 rounded-lg bg-white/10 ${color}`}>
                    <Icon size={20} />
                </div>
                {subtitle && (
                    <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                        {subtitle}
                    </span>
                )}
            </div>
            <div className="mt-3">
                <h3 className="text-2xl font-bold text-white">{value}</h3>
                <p className="text-xs text-white/50 mt-0.5">{label}</p>
            </div>
        </Card>
    );
}

function getColor(type: string) {
    const map: Record<string, string> = {
        work: "bg-blue-500",
        study: "bg-violet-500",
        health: "bg-emerald-500",
        leisure: "bg-amber-500",
        admin: "bg-slate-500",
        sleep: "bg-indigo-500",
        meal: "bg-orange-500",
        commute: "bg-cyan-500",
        fixed: "bg-pink-500",
    };
    return map[type] || "bg-zinc-500";
}

function translateType(type: string) {
    const map: Record<string, string> = {
        work: "Trabalho",
        study: "Estudo",
        health: "Saúde",
        leisure: "Lazer",
        admin: "Admin",
        sleep: "Sono",
        meal: "Refeição",
        commute: "Transporte",
        fixed: "Fixo",
    };
    return map[type] || type;
}

function getTopFocus(dist: Record<string, number>) {
    const entries = Object.entries(dist);
    if (entries.length === 0) return "-";
    const sorted = entries.sort(([, a], [, b]) => b - a);
    return translateType(sorted[0][0]);
}
