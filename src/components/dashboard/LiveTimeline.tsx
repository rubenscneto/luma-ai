"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, ChevronRight, Play, Loader2 } from 'lucide-react';
import { useDailyPlan } from '@/context/dailyPlanContext';
import { BlockCard } from '../agenda/BlockCard';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function LiveTimeline() {
    const { currentBlock, nextBlock, todayBlocks, isLoading, generatePlan, todayPlan, replanDay } = useDailyPlan();
    const [now, setNow] = useState(new Date());
    const [isReplanning, setIsReplanning] = useState(false);

    // Update time every minute
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    const timeString = now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
    });

    // Calculate progress if current block exists
    const progress = currentBlock ? (() => {
        const start = new Date(currentBlock.start_datetime).getTime();
        const end = new Date(currentBlock.end_datetime).getTime();
        const current = now.getTime();
        return Math.min(Math.max(((current - start) / (end - start)) * 100, 0), 100);
    })() : 0;

    // Time remaining in current block
    const timeRemaining = currentBlock ? (() => {
        const end = new Date(currentBlock.end_datetime).getTime();
        const mins = Math.round((end - now.getTime()) / 60000);
        return mins > 0 ? mins : 0;
    })() : 0;

    // Check if user is late (has overdue blocks)
    const isLate = todayBlocks.some(b => b.status === 'delayed');

    // Stats
    const completedCount = todayBlocks.filter(b => b.is_done).length;
    const totalCount = todayBlocks.length;

    const handleReplan = async () => {
        setIsReplanning(true);
        try {
            await replanDay('Usuário solicitou replanejamento');
        } finally {
            setIsReplanning(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
                </div>
            </div>
        );
    }

    if (!todayPlan) {
        return (
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-brand-primary" />
                        <h3 className="font-semibold text-white">Timeline</h3>
                    </div>
                    <span className="text-2xl font-bold text-white">{timeString}</span>
                </div>

                <div className="text-center py-6">
                    <p className="text-white/60 mb-4">Nenhum plano para hoje</p>
                    <button
                        onClick={() => generatePlan()}
                        className="px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary/90 text-white text-sm font-medium transition-colors"
                    >
                        Gerar Plano
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-brand-primary" />
                    <h3 className="font-semibold text-white">Timeline</h3>
                    {isLate && (
                        <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-medium">
                            Atrasado
                        </span>
                    )}
                </div>

                <div className="flex items-center justify-between w-full sm:w-auto gap-3">
                    {isLate && (
                        <button
                            onClick={handleReplan}
                            disabled={isReplanning}
                            className="px-3 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-xs font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                            {isReplanning ? '...' : 'Replanejar'}
                        </button>
                    )}
                    <div className="flex items-center gap-3 ml-auto sm:ml-0">
                        <span className="text-sm text-white/60">
                            {completedCount}/{totalCount}
                        </span>
                        <span className="text-2xl font-bold text-white tabular-nums tracking-tight">{timeString}</span>
                    </div>
                </div>
            </div>

            {/* Current block */}
            {currentBlock ? (
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Play className="w-3 h-3 text-brand-primary fill-current" />
                        <span className="text-xs font-medium text-brand-primary uppercase tracking-wider">
                            Agora
                        </span>
                    </div>
                    <BlockCard block={currentBlock} compact />

                    {/* Progress bar */}
                    <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                            className="h-full bg-brand-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                </div>
            ) : (
                <div className="mb-4 p-4 rounded-xl bg-white/5 text-center">
                    <p className="text-white/60 text-sm">Nenhum bloco ativo no momento</p>
                </div>
            )}

            {/* Next block */}
            {nextBlock && (
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <ChevronRight className="w-3 h-3 text-white/50" />
                        <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
                            Próximo
                        </span>
                        {nextBlock.timeUntilStart && nextBlock.timeUntilStart > 0 && (
                            <span className="text-xs text-white/40">
                                em {nextBlock.timeUntilStart}min
                            </span>
                        )}
                    </div>
                    <BlockCard block={nextBlock} compact />
                </div>
            )}

            {/* Link to full agenda */}
            <Link
                href="/agenda"
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-colors"
            >
                Ver agenda completa
                <ChevronRight className="w-4 h-4" />
            </Link>
        </div>
    );
}
