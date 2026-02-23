"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    RefreshCw, Loader2, TrendingUp, Check, X, Pin,
    Briefcase, BookOpen, Heart, Coffee, Home, Moon, Bus, Sparkles,
    Clock
} from 'lucide-react';
import { useDailyPlan } from '@/context/dailyPlanContext';
import { RecurrenceSuggestion, BlockCategory } from '@/types';

const categoryConfig: Record<string, { icon: React.ElementType; color: string; bg: string; gradient: string }> = {
    work: { icon: Briefcase, color: 'text-blue-400', bg: 'bg-blue-500/20', gradient: 'from-blue-500 to-blue-600' },
    study: { icon: BookOpen, color: 'text-purple-400', bg: 'bg-purple-500/20', gradient: 'from-purple-500 to-purple-600' },
    health: { icon: Heart, color: 'text-green-400', bg: 'bg-green-500/20', gradient: 'from-green-500 to-green-600' },
    leisure: { icon: Coffee, color: 'text-amber-400', bg: 'bg-amber-500/20', gradient: 'from-amber-500 to-amber-600' },
    admin: { icon: Home, color: 'text-gray-400', bg: 'bg-gray-500/20', gradient: 'from-gray-500 to-gray-600' },
    sleep: { icon: Moon, color: 'text-indigo-400', bg: 'bg-indigo-500/20', gradient: 'from-indigo-500 to-indigo-600' },
    meal: { icon: Coffee, color: 'text-orange-400', bg: 'bg-orange-500/20', gradient: 'from-orange-500 to-orange-600' },
    commute: { icon: Bus, color: 'text-cyan-400', bg: 'bg-cyan-500/20', gradient: 'from-cyan-500 to-cyan-600' },
    fixed: { icon: Pin, color: 'text-pink-400', bg: 'bg-pink-500/20', gradient: 'from-pink-500 to-pink-600' },
};

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function ConfidenceBadge({ confidence }: { confidence: number }) {
    const color = confidence >= 80
        ? 'bg-green-500/20 text-green-400 border-green-500/30'
        : confidence >= 60
            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            : 'bg-foreground/10 text-muted border-card-border/50';

    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
            {confidence}%
        </span>
    );
}

function SuggestionCard({
    suggestion,
    onAccept,
    onDismiss,
}: {
    suggestion: RecurrenceSuggestion;
    onAccept: () => void;
    onDismiss: () => void;
}) {
    const config = categoryConfig[suggestion.category] || categoryConfig.work;
    const Icon = config.icon;

    const daysText = suggestion.days.map(d => DAY_NAMES[d]).join(', ');

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="p-5 rounded-2xl bg-foreground/5 border border-card-border/50 hover:border-white/20 transition-all"
        >
            <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shrink-0`}>
                    <Icon className="w-6 h-6 text-foreground" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-base font-semibold text-foreground truncate">
                            {suggestion.title}
                        </h4>
                        <ConfidenceBadge confidence={suggestion.confidence} />
                    </div>

                    {/* Schedule pattern */}
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-3.5 h-3.5 text-muted/70" />
                        <span className="text-sm text-muted">
                            {daysText} • {suggestion.start_time} - {suggestion.end_time}
                        </span>
                    </div>

                    {/* Pattern description */}
                    {suggestion.pattern && (
                        <p className="text-xs text-muted mb-3">{suggestion.pattern}</p>
                    )}

                    {/* Day pills */}
                    <div className="flex gap-1.5 mb-3">
                        {[0, 1, 2, 3, 4, 5, 6].map(day => {
                            const isActive = suggestion.days.includes(day);
                            return (
                                <div
                                    key={day}
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${isActive
                                            ? `bg-gradient-to-br ${config.gradient} text-white`
                                            : 'bg-foreground/5 text-muted/50'
                                        }`}
                                >
                                    {DAY_NAMES[day][0]}
                                </div>
                            );
                        })}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs text-muted/70">
                        <span>{suggestion.occurrences}x detectado</span>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                <button
                    onClick={onAccept}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors font-medium text-sm"
                >
                    <Pin className="w-4 h-4" />
                    Criar Bloco Fixo
                </button>
                <button
                    onClick={onDismiss}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-muted transition-colors text-sm"
                >
                    <X className="w-4 h-4" />
                    Ignorar
                </button>
            </div>
        </motion.div>
    );
}

export default function RecurrenceSuggestions() {
    const { recurrenceSuggestions, isRecurrenceLoading, detectRecurrences, addRecurrenceAsFixed, dismissRecurrence } = useDailyPlan();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-foreground">Padrões Detectados</h2>
                    <p className="text-sm text-muted">
                        A IA analisa sua agenda e detecta atividades recorrentes
                    </p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={detectRecurrences}
                    disabled={isRecurrenceLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                >
                    {isRecurrenceLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <RefreshCw className="w-4 h-4" />
                    )}
                    {isRecurrenceLoading ? 'Analisando...' : 'Detectar Padrões'}
                </motion.button>
            </div>

            {/* Loading state */}
            {isRecurrenceLoading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-16"
                >
                    <Loader2 className="w-10 h-10 text-purple-400 animate-spin mb-4" />
                    <p className="text-muted text-sm">Analisando 14 dias de atividades...</p>
                    <p className="text-muted/70 text-xs mt-1">Buscando padrões recorrentes com IA</p>
                </motion.div>
            )}

            {/* Empty state */}
            {!isRecurrenceLoading && recurrenceSuggestions.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-16 text-center"
                >
                    <div className="w-20 h-20 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-4">
                        <TrendingUp className="w-10 h-10 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                        Nenhum padrão detectado
                    </h3>
                    <p className="text-muted max-w-sm mb-6">
                        Continue usando a agenda por alguns dias e clique em &quot;Detectar Padrões&quot; para que a IA identifique suas atividades recorrentes.
                    </p>
                    <button
                        onClick={detectRecurrences}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-600/90 text-white font-medium transition-colors"
                    >
                        <Sparkles className="w-5 h-5" />
                        Analisar Agora
                    </button>
                </motion.div>
            )}

            {/* Suggestions list */}
            {!isRecurrenceLoading && recurrenceSuggestions.length > 0 && (
                <div className="space-y-4">
                    <p className="text-sm text-muted">
                        {recurrenceSuggestions.length} padrão(ões) encontrado(s). Converta em blocos fixos para automatizar.
                    </p>
                    <AnimatePresence>
                        {recurrenceSuggestions.map(suggestion => (
                            <SuggestionCard
                                key={suggestion.id}
                                suggestion={suggestion}
                                onAccept={() => addRecurrenceAsFixed(suggestion)}
                                onDismiss={() => dismissRecurrence(suggestion.id)}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
