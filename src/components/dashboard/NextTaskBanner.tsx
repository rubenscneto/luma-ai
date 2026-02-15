"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, ArrowRight, Zap, Coffee, BookOpen, Dumbbell, Briefcase, Moon } from "lucide-react";
import { useDailyPlan } from "@/context/dailyPlanContext";
import Link from "next/link";

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    work: { icon: Briefcase, color: "text-blue-400", bg: "bg-blue-500/20" },
    study: { icon: BookOpen, color: "text-purple-400", bg: "bg-purple-500/20" },
    health: { icon: Dumbbell, color: "text-green-400", bg: "bg-green-500/20" },
    meal: { icon: Coffee, color: "text-orange-400", bg: "bg-orange-500/20" },
    leisure: { icon: Zap, color: "text-yellow-400", bg: "bg-yellow-500/20" },
    sleep: { icon: Moon, color: "text-indigo-400", bg: "bg-indigo-500/20" },
};

export function NextTaskBanner() {
    const { currentBlock, nextBlock, todayBlocks } = useDailyPlan();
    const [timeUntilNext, setTimeUntilNext] = useState("");

    useEffect(() => {
        if (!nextBlock) return;

        const update = () => {
            const now = new Date();
            const startTime = new Date(nextBlock.start_datetime);
            const diff = startTime.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeUntilNext("agora");
                return;
            }

            const mins = Math.floor(diff / 60000);
            const hours = Math.floor(mins / 60);

            if (hours > 0) {
                setTimeUntilNext(`em ${hours}h${mins % 60 > 0 ? ` ${mins % 60}min` : ''}`);
            } else {
                setTimeUntilNext(`em ${mins}min`);
            }
        };

        update();
        const interval = setInterval(update, 30000); // update every 30s
        return () => clearInterval(interval);
    }, [nextBlock]);

    // No blocks at all — show CTA
    if (todayBlocks.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-xl p-5"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">Nenhum bloco para hoje</p>
                            <p className="text-xs text-white/40">Gere uma agenda com IA na página de Agenda</p>
                        </div>
                    </div>
                    <Link
                        href="/agenda"
                        className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Planejar <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </motion.div>
        );
    }

    // Show current + next block
    const blockToShow = currentBlock || nextBlock;
    if (!blockToShow) return null;

    const isCurrent = !!currentBlock;
    const config = CATEGORY_CONFIG[blockToShow.category] || CATEGORY_CONFIG.work;
    const Icon = config.icon;

    const startTime = new Date(blockToShow.start_datetime).toLocaleTimeString('pt-BR', {
        hour: '2-digit', minute: '2-digit'
    });
    const endTime = new Date(blockToShow.end_datetime).toLocaleTimeString('pt-BR', {
        hour: '2-digit', minute: '2-digit'
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`border rounded-xl p-5 ${isCurrent
                    ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20'
                    : 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20'
                }`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-white">{blockToShow.title}</p>
                            {isCurrent && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                    Agora
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/40 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>{startTime} — {endTime}</span>
                            {!isCurrent && nextBlock && (
                                <span className="text-blue-400 font-medium">({timeUntilNext})</span>
                            )}
                        </div>
                    </div>
                </div>
                <Link
                    href="/agenda"
                    className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
                >
                    Ver agenda <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </motion.div>
    );
}
