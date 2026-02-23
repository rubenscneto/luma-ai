"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Repeat, Check, X, Loader2, Sparkles } from 'lucide-react';
import { useDailyPlan } from '@/context/dailyPlanContext';

const DAY_NAMES: Record<number, string> = {
    0: 'Dom',
    1: 'Seg',
    2: 'Ter',
    3: 'Qua',
    4: 'Qui',
    5: 'Sex',
    6: 'Sáb',
};

export function RecurrenceBanner() {
    const {
        recurrenceSuggestions,
        isRecurrenceLoading,
        detectRecurrences,
        addRecurrenceAsFixed,
        dismissRecurrence,
    } = useDailyPlan();

    return (
        <div className="space-y-3">
            {/* Detection button */}
            <button
                onClick={detectRecurrences}
                disabled={isRecurrenceLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium rounded-xl hover:bg-indigo-500/15 transition-all w-full justify-center"
            >
                {isRecurrenceLoading ? (
                    <><Loader2 size={14} className="animate-spin" /> Analisando padrões...</>
                ) : (
                    <><Repeat size={14} /> Detectar Padrões Recorrentes</>
                )}
            </button>

            {/* Suggestions list */}
            <AnimatePresence mode="popLayout">
                {recurrenceSuggestions.map((suggestion) => {
                    const dayLabels = (suggestion.days || []).map(d => DAY_NAMES[d] || `${d}`).join(', ');
                    const confidenceColor =
                        suggestion.confidence >= 80 ? 'text-green-400' :
                            suggestion.confidence >= 60 ? 'text-yellow-400' :
                                'text-orange-400';

                    return (
                        <motion.div
                            key={suggestion.id}
                            layout
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20"
                        >
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-indigo-500/20 shrink-0">
                                    <Sparkles className="w-4 h-4 text-indigo-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-sm font-semibold text-foreground truncate">{suggestion.title}</h4>
                                        <span className={`text-xs font-medium ${confidenceColor}`}>
                                            {suggestion.confidence}%
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                                        <span>{dayLabels}</span>
                                        <span>•</span>
                                        <span>{suggestion.start_time} - {suggestion.end_time}</span>
                                        {suggestion.occurrences && (
                                            <>
                                                <span>•</span>
                                                <span>{suggestion.occurrences}x visto</span>
                                            </>
                                        )}
                                    </div>
                                    {suggestion.pattern && (
                                        <p className="text-xs text-zinc-500 mt-1">{suggestion.pattern}</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        onClick={() => addRecurrenceAsFixed(suggestion)}
                                        className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                                        title="Tornar bloco fixo"
                                    >
                                        <Check size={14} />
                                    </button>
                                    <button
                                        onClick={() => dismissRecurrence(suggestion.id)}
                                        className="p-1.5 rounded-lg bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20 transition-colors"
                                        title="Ignorar sugestão"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
