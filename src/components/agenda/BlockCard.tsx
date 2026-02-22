"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Check, X, Clock, MoreHorizontal, Play, Pause,
    Briefcase, BookOpen, Heart, Coffee, Home, Moon, Bus, Plus,
    Sparkles
} from 'lucide-react';
import { DailyBlockWithStatus, BlockCategory } from '@/types';
import { useDailyPlan } from '@/context/dailyPlanContext';
import { cn } from '@/lib/utils';

interface BlockCardProps {
    block: DailyBlockWithStatus;
    compact?: boolean;
}

const categoryConfig: Record<BlockCategory, { icon: React.ElementType; color: string; bg: string }> = {
    work: { icon: Briefcase, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    study: { icon: BookOpen, color: 'text-purple-400', bg: 'bg-purple-500/20' },
    health: { icon: Heart, color: 'text-green-400', bg: 'bg-green-500/20' },
    leisure: { icon: Coffee, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    admin: { icon: Home, color: 'text-gray-400', bg: 'bg-gray-500/20' },
    sleep: { icon: Moon, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
    meal: { icon: Coffee, color: 'text-orange-400', bg: 'bg-orange-500/20' },
    commute: { icon: Bus, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
    fixed: { icon: Plus, color: 'text-pink-400', bg: 'bg-pink-500/20' },
};

export function BlockCard({ block, compact = false }: BlockCardProps) {
    const { markBlockDone, skipBlock, delayBlock } = useDailyPlan();
    const [showActions, setShowActions] = useState(false);
    const [showDelayOptions, setShowDelayOptions] = useState(false);

    const config = categoryConfig[block.category] || categoryConfig.work;
    const Icon = config.icon;

    const startTime = new Date(block.start_datetime).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
    });
    const endTime = new Date(block.end_datetime).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
    });

    const handleDone = () => {
        markBlockDone(block.id);
        setShowActions(false);
    };

    const handleSkip = () => {
        skipBlock(block.id, 'Pulado pelo usuário');
        setShowActions(false);
    };

    const handleDelay = (minutes: number) => {
        delayBlock(block.id, minutes);
        setShowDelayOptions(false);
        setShowActions(false);
    };

    const statusStyles = {
        current: 'border-2 border-brand-primary shadow-lg shadow-brand-primary/20',
        upcoming: 'border border-white/10',
        done: 'opacity-60 border border-green-500/30',
        skipped: 'opacity-40 border border-white/5',
        delayed: 'border border-amber-500/30',
    };

    if (compact) {
        return (
            <div className={cn(
                "flex items-center gap-3 p-2 rounded-lg",
                block.status === 'current' ? 'bg-brand-primary/10' : 'bg-white/5'
            )}>
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", config.bg)}>
                    <Icon className={cn("w-4 h-4", config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className={cn(
                        "text-sm font-medium truncate",
                        block.is_done && "line-through text-white/50"
                    )}>
                        {block.title}
                    </p>
                    <p className="text-xs text-white/50">{startTime}</p>
                </div>
                {block.status === 'current' && (
                    <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
                )}
            </div>
        );
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
                "relative p-4 rounded-xl bg-white/5 backdrop-blur-sm transition-all",
                statusStyles[block.status]
            )}
        >
            {/* Header */}
            <div className="flex items-start gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", config.bg)}>
                    <Icon className={cn("w-5 h-5", config.color)} />
                </div>

                <div className="flex-1 min-w-0">
                    <h4 className={cn(
                        "font-semibold text-white",
                        block.is_done && "line-through text-white/50"
                    )}>
                        {block.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-white/40" />
                        <span className="text-sm text-white/60">{startTime} - {endTime}</span>
                        {(block.source === 'fixed' || (block as any).is_fixed) && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/50">
                                Fixo
                            </span>
                        )}
                    </div>
                </div>

                {/* Status indicator */}
                {block.status === 'current' && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-brand-primary/20">
                        <Play className="w-3 h-3 text-brand-primary fill-current" />
                        <span className="text-xs font-medium text-brand-primary">Agora</span>
                    </div>
                )}

                {/* Actions toggle — DISABLED for virtual fixed blocks (not yet materialized in DB) */}
                {!block.is_done && !block.is_skipped && !(block as any).is_fixed && block.source !== 'fixed' && (
                    <button
                        onClick={() => setShowActions(!showActions)}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <MoreHorizontal className="w-5 h-5 text-white/50" />
                    </button>
                )}
            </div>

            {/* AI Reasoning / Suggested Reason */}
            {block.meta?.suggested_reason && !block.is_done && !block.is_skipped && (
                <div className="mt-3 flex items-start gap-2 p-2 rounded-lg bg-brand-primary/5 border border-brand-primary/10">
                    <Sparkles className="w-3 h-3 text-brand-primary shrink-0 mt-0.5" />
                    <p className="text-[11px] text-white/70 leading-relaxed italic">
                        {block.meta.suggested_reason}
                    </p>
                </div>
            )}

            {/* Quick actions */}
            <AnimatePresence>
                {showActions && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 pt-3 border-t border-white/10"
                    >
                        {!showDelayOptions ? (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleDone}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors"
                                >
                                    <Check className="w-4 h-4" />
                                    <span className="text-sm">Concluir</span>
                                </button>
                                <button
                                    onClick={() => setShowDelayOptions(true)}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 transition-colors"
                                >
                                    <Clock className="w-4 h-4" />
                                    <span className="text-sm">Atrasar</span>
                                </button>
                                <button
                                    onClick={handleSkip}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                    <span className="text-sm">Pular</span>
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                {[15, 30, 60].map(mins => (
                                    <button
                                        key={mins}
                                        onClick={() => handleDelay(mins)}
                                        className="flex-1 py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-sm font-medium transition-colors"
                                    >
                                        +{mins}min
                                    </button>
                                ))}
                                <button
                                    onClick={() => setShowDelayOptions(false)}
                                    className="py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 text-sm transition-colors"
                                >
                                    Voltar
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Done/Skipped overlay */}
            {block.is_done && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-400" />
                </div>
            )}
            {block.is_skipped && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                    <X className="w-4 h-4 text-red-400" />
                </div>
            )}
        </motion.div>
    );
}
