"use client";

import React, { useEffect } from "react";
import { useRoutine } from "@/context/routineContext";
import { Card } from "@/components/ui/card";
import { Sparkles, Clock, Target, ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function DashboardPage() {
    const { motivation, setMotivation, routine } = useRoutine();
    const [insight, setInsight] = React.useState("Carregando insight do dia...");

    useEffect(() => {
        if (!motivation) {
            fetch("/api/motivacao")
                .then((res) => res.json())
                .then((data) => setMotivation(data.motivation));
        }
    }, [motivation, setMotivation]);

    useEffect(() => {
        // Generate insight based on routine
        if (routine.length > 0) {
            fetch("/api/insight", {
                method: "POST",
                body: JSON.stringify({ routineLength: routine.length, firstBlock: routine[0] }),
            })
                .then((res) => res.json())
                .then((data) => setInsight(data.insight));
        } else {
            setInsight("Defina sua rotina no 'Perdidão' para receber insights personalizados.");
        }
    }, [routine]);

    const upcomingBlocks = routine.filter(b => !b.completed).slice(0, 3);

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold mb-2">Bom dia, Visionário.</h1>
                <p className="text-zinc-500 dark:text-zinc-400">Aqui está o seu panorama diário.</p>
            </header>

            {/* Motivation Banner */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Sparkles size={100} />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-violet-200 mb-2">
                            <Sparkles size={16} />
                            <span className="text-sm font-medium uppercase tracking-wider">Daily Motivation</span>
                        </div>
                        <p className="text-xl md:text-2xl font-serif italic text-pretty max-w-2xl leading-relaxed">"{motivation?.text || 'Carregando...'}"</p>
                    </div>
                    {motivation?.author && (
                        <p className="text-right text-violet-200 font-medium text-sm mt-4">— {motivation.author}</p>
                    )}
                </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Timeline Widget */}
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Clock className="text-violet-500" size={20} />
                            <h2 className="font-semibold text-lg">Timeline</h2>
                        </div>
                        <Link href="/agenda" className="text-sm text-zinc-500 hover:text-violet-500 flex items-center gap-1 transition-colors">
                            Ver tudo <ArrowRight size={14} />
                        </Link>
                    </div>

                    <div className="space-y-4">
                        {upcomingBlocks.length === 0 ? (
                            <p className="text-zinc-500 text-sm">Nenhuma tarefa pendente ou rotina não configurada.</p>
                        ) : (
                            upcomingBlocks.map((block, i) => (
                                <div key={block.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800">
                                    <div className="w-12 text-center">
                                        <span className="text-sm font-bold block">{block.startTime}</span>
                                    </div>
                                    <div className="h-full w-1 rounded-full bg-zinc-200 dark:bg-zinc-700 mx-2" />
                                    <div className="flex-1">
                                        <h3 className="font-medium text-sm">{block.title}</h3>
                                        <p className="text-xs text-zinc-500 capitalize">{block.type}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>

                {/* Priorities / Insights */}
                <div className="space-y-6">
                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Target className="text-red-500" size={20} />
                            <h2 className="font-semibold text-lg">Prioridades</h2>
                        </div>
                        {/* Priorities Logic: Currently Empty as requested */}
                        <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
                            <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                                <Target size={20} />
                            </div>
                            <p className="text-sm text-zinc-500">Nenhuma prioridade definida ainda.</p>
                            <button className="text-xs text-blue-600 font-medium hover:underline">Adicionar Prioridade</button>
                        </div>
                    </Card>

                    <Card className="p-6 bg-violet-50 dark:bg-zinc-900 border-violet-100 dark:border-violet-900/20">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="text-violet-500" size={16} />
                            <h3 className="font-semibold text-violet-700 dark:text-violet-400 text-sm">AI Insight</h3>
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            {insight}
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    );
}
