"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/authContext";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { BarChart3, Clock, Zap, Target, BrainCircuit } from "lucide-react";

interface Stats {
    totalRoutines: number;
    totalHours: number;
    focusDistribution: {
        work: number;
        study: number;
        health: number;
        leisure: number;
    };
    mostProductiveTime: string;
}

export default function AnalyticsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<Stats>({
        totalRoutines: 0,
        totalHours: 0,
        focusDistribution: { work: 0, study: 0, health: 0, leisure: 0 },
        mostProductiveTime: "Manhã"
    });

    useEffect(() => {
        async function fetchStats() {
            if (!user) return;

            const { data: routines } = await supabase
                .from("routines")
                .select("*")
                .eq("user_id", user.id);

            if (!routines || routines.length === 0) {
                setLoading(false);
                return;
            }

            // Calculate Stats
            let totalMins = 0;
            const dist = { work: 0, study: 0, health: 0, leisure: 0 };

            routines.forEach(r => {
                totalMins += r.duration;
                const type = r.type as keyof typeof dist;
                if (dist[type] !== undefined) {
                    dist[type] += r.duration;
                }
            });

            // Simple heuristic for "Most Productive Time" based on 'work' block starts
            // This is a simplified logic
            setStats({
                totalRoutines: routines.length,
                totalHours: Math.round(totalMins / 60),
                focusDistribution: dist,
                mostProductiveTime: "Manhã" // Placeholder logic, could be real later
            });
            setLoading(false);
        }

        fetchStats();
    }, [user]);

    const maxVal = Math.max(...Object.values(stats.focusDistribution));

    return (
        <div className="p-8 space-y-8 max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-violet-500/10 rounded-xl">
                    <BarChart3 className="w-8 h-8 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
                    <p className="text-zinc-500">Seus dados de produtividade em tempo real.</p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20 text-zinc-500">Carregando dados...</div>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <KpiCard icon={Target} label="Rotinas Criadas" value={stats.totalRoutines} />
                        <KpiCard icon={Clock} label="Horas Planejadas" value={`${stats.totalHours}h`} />
                        <KpiCard icon={BrainCircuit} label="Foco Principal" value={getTopFocus(stats.focusDistribution)} />
                        <KpiCard icon={Zap} label="Pico de Energia" value={stats.mostProductiveTime} />
                    </div>

                    {/* Distribution Chart */}
                    <Card className="p-8 pb-12">
                        <h2 className="text-xl font-bold mb-6">Distribuição de Foco (Minutos)</h2>
                        <div className="flex items-end gap-4 h-64 mt-4 justify-between max-w-2xl mx-auto">
                            {Object.entries(stats.focusDistribution).map(([key, value]) => {
                                const heightPercent = maxVal > 0 ? (value / maxVal) * 100 : 0;
                                return (
                                    <div key={key} className="flex-1 flex flex-col items-center gap-2 group">
                                        <div className="relative w-full bg-zinc-100 dark:bg-zinc-800 rounded-t-xl h-full flex items-end overflow-hidden">
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: `${heightPercent}%` }}
                                                transition={{ duration: 1, type: "spring" }}
                                                className={`w-full ${getColor(key)} opacity-80 group-hover:opacity-100 transition-opacity`}
                                            />
                                        </div>
                                        <span className="capitalize font-medium text-zinc-600 dark:text-zinc-400">{translateType(key)}</span>
                                        <span className="text-xs text-zinc-400 font-mono">{Math.round(value / 60)}h</span>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
}

function KpiCard({ icon: Icon, label, value }: { icon: any, label: string, value: string | number }) {
    return (
        <Card className="p-6 flex items-center gap-4 hover:shadow-lg transition-all border-zinc-200 dark:border-zinc-800">
            <div className="p-3 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                <Icon size={24} />
            </div>
            <div>
                <p className="text-sm font-medium text-zinc-500">{label}</p>
                <h3 className="text-2xl font-bold">{value}</h3>
            </div>
        </Card>
    );
}

function getColor(type: string) {
    const map: Record<string, string> = {
        work: "bg-blue-500",
        study: "bg-violet-500",
        health: "bg-emerald-500",
        leisure: "bg-amber-500"
    };
    return map[type] || "bg-zinc-500";
}

function translateType(type: string) {
    const map: Record<string, string> = {
        work: "Trabalho",
        study: "Estudo",
        health: "Saúde",
        leisure: "Lazer"
    };
    return map[type] || type;
}

function getTopFocus(dist: Stats["focusDistribution"]) {
    const sorted = Object.entries(dist).sort(([, a], [, b]) => b - a);
    return translateType(sorted[0][0]);
}
