"use client";

import React, { useEffect, useState } from "react";
import { useRoutine } from "@/context/routineContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Clock, Target, ArrowRight, Plus, X, Check, Trash2 } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

import { useAuth } from "@/context/authContext";

interface Priority {
    id: string;
    text: string;
    completed: boolean;
    createdAt: number;
}

export default function DashboardPage() {
    const { user } = useAuth();
    const { motivation, setMotivation, routine } = useRoutine();
    const [insight, setInsight] = useState("Carregando insight do dia...");
    const [priorities, setPriorities] = useState<Priority[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newPriority, setNewPriority] = useState("");

    const userName = user?.user_metadata?.full_name?.split(' ')[0] || "Visionário";

    // Dynamic greeting based on time of day
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return "Bom dia";
        if (hour >= 12 && hour < 18) return "Boa tarde";
        return "Boa noite";
    };

    // Load priorities from localStorage
    useEffect(() => {
        const stored = localStorage.getItem("luma-priorities");
        if (stored) {
            setPriorities(JSON.parse(stored));
        }
    }, []);

    // Save priorities to localStorage
    useEffect(() => {
        if (priorities.length > 0 || localStorage.getItem("luma-priorities")) {
            localStorage.setItem("luma-priorities", JSON.stringify(priorities));
        }
    }, [priorities]);

    useEffect(() => {
        if (!motivation) {
            fetch("/api/ai/daily-motivation")
                .then((res) => res.json())
                .then((data) => setMotivation(data.motivation));
        }
    }, [motivation, setMotivation]);

    useEffect(() => {
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

    const addPriority = () => {
        if (!newPriority.trim()) return;
        const priority: Priority = {
            id: Date.now().toString(),
            text: newPriority.trim(),
            completed: false,
            createdAt: Date.now(),
        };
        setPriorities([...priorities, priority]);
        setNewPriority("");
        setShowAddModal(false);
    };

    const togglePriority = (id: string) => {
        setPriorities(priorities.map(p =>
            p.id === id ? { ...p, completed: !p.completed } : p
        ));
    };

    const deletePriority = (id: string) => {
        setPriorities(priorities.filter(p => p.id !== id));
    };

    const activePriorities = priorities.filter(p => !p.completed);
    const completedPriorities = priorities.filter(p => p.completed);

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold mb-2">{getGreeting()}, {userName}.</h1>
                <p className="text-zinc-500 dark:text-zinc-400">Aqui está o seu panorama diário.</p>
            </header>

            {/* Motivation Banner */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden group"
            >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--luma-sky)] opacity-50" />

                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-[var(--luma-slate)] mb-3">
                            <span className="text-xs font-semibold uppercase tracking-wider opacity-70">Daily Motivation</span>
                        </div>
                        <p className="text-lg md:text-xl font-medium text-[var(--luma-black)] dark:text-white leading-relaxed font-sans">
                            "{motivation?.text || 'Carregando...'}"
                        </p>
                    </div>
                    {motivation?.author && (
                        <p className="text-right text-[var(--luma-slate)] text-sm mt-3 font-medium">— {motivation.author}</p>
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
                            upcomingBlocks.map((block) => (
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

                {/* Priorities */}
                <div className="space-y-6">
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Target className="text-red-500" size={20} />
                                <h2 className="font-semibold text-lg">Prioridades</h2>
                            </div>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="text-xs text-[#86BBD8] font-medium hover:underline flex items-center gap-1"
                            >
                                <Plus size={14} /> Adicionar
                            </button>
                        </div>

                        {priorities.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
                                <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                                    <Target size={20} />
                                </div>
                                <p className="text-sm text-zinc-500">Nenhuma prioridade definida ainda.</p>
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="text-xs text-[#86BBD8] font-medium hover:underline"
                                >
                                    Adicionar Prioridade
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                <AnimatePresence>
                                    {activePriorities.map((priority) => (
                                        <motion.div
                                            key={priority.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 10 }}
                                            className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 group"
                                        >
                                            <button
                                                onClick={() => togglePriority(priority.id)}
                                                className="w-5 h-5 rounded-full border-2 border-[#86BBD8] flex items-center justify-center hover:bg-[#86BBD8]/20 transition-colors"
                                            >
                                            </button>
                                            <span className="flex-1 text-sm">{priority.text}</span>
                                            <button
                                                onClick={() => deletePriority(priority.id)}
                                                className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </motion.div>
                                    ))}
                                    {completedPriorities.length > 0 && (
                                        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 mt-2">
                                            <p className="text-xs text-zinc-400 mb-2">Concluídas ({completedPriorities.length})</p>
                                            {completedPriorities.map((priority) => (
                                                <motion.div
                                                    key={priority.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="flex items-center gap-3 p-2 rounded-lg group"
                                                >
                                                    <button
                                                        onClick={() => togglePriority(priority.id)}
                                                        className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"
                                                    >
                                                        <Check size={12} className="text-white" />
                                                    </button>
                                                    <span className="flex-1 text-sm text-zinc-400 line-through">{priority.text}</span>
                                                    <button
                                                        onClick={() => deletePriority(priority.id)}
                                                        className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-all"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
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

            {/* Add Priority Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowAddModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">Nova Prioridade</h3>
                                <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-zinc-600">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={(e) => { e.preventDefault(); addPriority(); }}>
                                <Input
                                    placeholder="Ex: Finalizar relatório trimestral"
                                    value={newPriority}
                                    onChange={(e) => setNewPriority(e.target.value)}
                                    className="mb-4 border-[#4D626A]/30 focus:border-[#86BBD8] focus:ring-[#86BBD8]"
                                    autoFocus
                                />
                                <div className="flex gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setShowAddModal(false)}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="flex-1 bg-[#090C08] text-[#EEF4ED] hover:bg-[#4D626A]"
                                        disabled={!newPriority.trim()}
                                    >
                                        Adicionar
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

