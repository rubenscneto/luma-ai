"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Sun, Moon, Target, Battery, MessageSquare,
    Trophy, TrendingUp, AlertTriangle, CheckCircle2,
    ChevronRight, Sparkles, Zap
} from "lucide-react";
import { useDailyPlan } from "@/context/dailyPlanContext";

interface DailyResetScore {
    completed: number;
    total: number;
    skipped: number;
    percentage: number;
    streak: number;
}

function getDailyScore(blocks: any[]): DailyResetScore {
    const total = blocks.length;
    const completed = blocks.filter(b => b.is_done).length;
    const skipped = blocks.filter(b => b.is_skipped).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, skipped, percentage, streak: 0 };
}

function getScoreEmoji(percentage: number): { emoji: string; label: string; color: string } {
    if (percentage >= 90) return { emoji: "🏆", label: "Excelente!", color: "text-yellow-400" };
    if (percentage >= 70) return { emoji: "💪", label: "Muito bom!", color: "text-green-400" };
    if (percentage >= 50) return { emoji: "👍", label: "Bom progresso!", color: "text-blue-400" };
    if (percentage >= 30) return { emoji: "🌱", label: "Em evolução", color: "text-purple-400" };
    return { emoji: "🌅", label: "Amanhã será melhor!", color: "text-orange-400" };
}

function getTimeOfDay(): "morning" | "afternoon" | "evening" | "night" {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    if (hour < 21) return "evening";
    return "night";
}

const TIME_GREETINGS = {
    morning: { greeting: "Bom dia!", icon: Sun, emoji: "☀️" },
    afternoon: { greeting: "Boa tarde!", icon: Sun, emoji: "🌤️" },
    evening: { greeting: "Boa noite!", icon: Moon, emoji: "🌅" },
    night: { greeting: "Boa noite!", icon: Moon, emoji: "🌙" },
};

interface DailyResetProps {
    onDismiss?: () => void;
}

export default function DailyReset({ onDismiss }: DailyResetProps) {
    const { todayBlocks, generatePlan } = useDailyPlan();
    const [step, setStep] = useState<'review' | 'insight' | 'plan'>('review');
    const [moodNote, setMoodNote] = useState("");
    const [energyLevel, setEnergyLevel] = useState<'low' | 'medium' | 'high' | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const timeOfDay = getTimeOfDay();
    const { greeting, icon: TimeIcon, emoji: timeEmoji } = TIME_GREETINGS[timeOfDay];
    const isNightReview = timeOfDay === 'evening' || timeOfDay === 'night';

    const score = getDailyScore(todayBlocks);
    const scoreInfo = getScoreEmoji(score.percentage);

    const handleGeneratePlan = async () => {
        setIsGenerating(true);
        try {
            await generatePlan(undefined, 'first_time');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-blue-500/10 rounded-2xl border border-white/10 p-6 space-y-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                        <span className="text-2xl">{timeEmoji}</span>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">{greeting}</h2>
                        <p className="text-sm text-white/50">
                            {isNightReview ? "Vamos revisar o seu dia?" : "Pronto para começar?"}
                        </p>
                    </div>
                </div>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="text-white/30 hover:text-white/60 transition-colors text-sm"
                    >
                        Pular
                    </button>
                )}
            </div>

            <AnimatePresence mode="wait">
                {step === 'review' && (
                    <motion.div
                        key="review"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-6"
                    >
                        {/* Yesterday/Today Score Card */}
                        {todayBlocks.length > 0 && (
                            <div className="bg-white/5 rounded-xl p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-medium text-white/60">
                                        {isNightReview ? "Resultado de hoje" : "Ontem"}
                                    </h3>
                                    <span className="text-2xl">{scoreInfo.emoji}</span>
                                </div>

                                {/* Score Circle */}
                                <div className="flex items-center gap-6">
                                    <div className="relative w-20 h-20">
                                        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 40 40">
                                            <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                                            <circle
                                                cx="20" cy="20" r="16" fill="none"
                                                stroke="url(#gradient)"
                                                strokeWidth="3"
                                                strokeLinecap="round"
                                                strokeDasharray={`${(score.percentage / 100) * 100.53} 100.53`}
                                            />
                                            <defs>
                                                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                    <stop offset="0%" stopColor="#a855f7" />
                                                    <stop offset="100%" stopColor="#6366f1" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-lg font-bold text-white">{score.percentage}%</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                                            <span className="text-sm text-white/70">{score.completed} concluídos</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4 text-yellow-400" />
                                            <span className="text-sm text-white/70">{score.skipped} pulados</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Target className="w-4 h-4 text-purple-400" />
                                            <span className="text-sm text-white/70">{score.total} total</span>
                                        </div>
                                    </div>
                                </div>

                                <p className={`text-sm font-medium ${scoreInfo.color}`}>
                                    {scoreInfo.label}
                                </p>
                            </div>
                        )}

                        {/* Energy Rating */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-white/60">
                                Como está sua energia agora?
                            </h3>
                            <div className="grid grid-cols-3 gap-3">
                                {([
                                    { value: 'low', emoji: '😴', label: 'Baixa' },
                                    { value: 'medium', emoji: '😊', label: 'Normal' },
                                    { value: 'high', emoji: '⚡', label: 'Alta' },
                                ] as const).map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setEnergyLevel(opt.value)}
                                        className={`p-3 rounded-xl border transition-all text-center ${energyLevel === opt.value
                                                ? 'bg-purple-500/20 border-purple-500/50'
                                                : 'border-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <div className="text-xl mb-1">{opt.emoji}</div>
                                        <div className="text-xs text-white/60">{opt.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Mood Note */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-white/60">
                                Alguma nota? (opcional)
                            </h3>
                            <textarea
                                value={moodNote}
                                onChange={(e) => setMoodNote(e.target.value)}
                                placeholder="Ex: Dormi mal, preciso de uma agenda mais leve..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/30 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                rows={2}
                            />
                        </div>

                        <button
                            onClick={() => setStep('plan')}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-medium transition-colors"
                        >
                            <Sparkles className="w-4 h-4" />
                            Gerar minha agenda
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}

                {step === 'plan' && (
                    <motion.div
                        key="plan"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                    >
                        <div className="bg-white/5 rounded-xl p-5 text-center space-y-4">
                            <div className="w-16 h-16 mx-auto rounded-full bg-purple-500/20 flex items-center justify-center">
                                <Zap className="w-8 h-8 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-medium">Vamos montar sua agenda!</h3>
                                <p className="text-sm text-white/50 mt-1">
                                    {energyLevel === 'low'
                                        ? "Vou criar uma agenda mais leve hoje."
                                        : energyLevel === 'high'
                                            ? "Dia de alta performance! Vou otimizar sua agenda."
                                            : "Vou balancear produtividade e descanso."}
                                </p>
                            </div>

                            <button
                                onClick={handleGeneratePlan}
                                disabled={isGenerating}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                            >
                                {isGenerating ? (
                                    <>
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                        >
                                            <Sparkles className="w-4 h-4" />
                                        </motion.div>
                                        Gerando...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        Gerar Agenda com IA
                                    </>
                                )}
                            </button>
                        </div>

                        <button
                            onClick={() => setStep('review')}
                            className="text-sm text-white/40 hover:text-white/60 transition-colors mx-auto block"
                        >
                            ← Voltar para revisão
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
