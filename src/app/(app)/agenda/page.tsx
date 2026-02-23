"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, List, Settings, Layout, TrendingUp, Bot, Loader2 } from 'lucide-react';
import { DayView } from '@/components/agenda/DayView';
import WeekView from '@/components/agenda/WeekView';
import FixedBlocksManager from '@/components/agenda/FixedBlocksManager';
import BlockTemplates from '@/components/agenda/BlockTemplates';
import RecurrenceSuggestions from '@/components/agenda/RecurrenceSuggestions';
import { cn } from '@/lib/utils';
import { useAgenda } from '@/context/agendaContext';
import { useAuth } from '@/context/authContext';
import { toast } from 'sonner';

type ViewMode = 'day' | 'week' | 'fixed' | 'templates' | 'recurrences';

export default function AgendaPage() {
    const [viewMode, setViewMode] = useState<ViewMode>('day');
    const { pendingFeedbacks, clearFeedbacks } = useAgenda();
    const { user } = useAuth();
    const [isReplanning, setIsReplanning] = useState(false);

    const handleReplanWithFeedback = async () => {
        if (!user) return;
        setIsReplanning(true);
        const toastId = toast.loading("Repensando sua semana com seus feedbacks...");

        try {
            const today = new Date();
            today.setDate(today.getDate() - today.getDay());
            const startDate = today.toISOString().split('T')[0];

            const res = await fetch('/api/ai/agenda/plan-week', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'replan_with_feedback',
                    user_id: user.id,
                    feedbacks: pendingFeedbacks,
                    start_date: startDate
                })
            });

            if (!res.ok) throw new Error("Erro ao replanejar");
            toast.success("Semana atualizada!", { id: toastId });
            clearFeedbacks();
            window.location.reload();
        } catch (e: any) {
            toast.error(e.message || "Erro", { id: toastId });
            setIsReplanning(false);
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
                    <p className="text-muted text-sm mt-1">
                        Gerencie seu dia com inteligência
                    </p>
                </div>

                {/* View toggle */}
                <div className="flex p-1 rounded-lg bg-foreground/5 overflow-x-auto">
                    <button
                        onClick={() => setViewMode('day')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
                            viewMode === 'day'
                                ? "bg-brand-primary text-white"
                                : "text-muted hover:text-foreground"
                        )}
                    >
                        <List className="w-4 h-4" />
                        Dia
                    </button>
                    <button
                        onClick={() => setViewMode('week')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
                            viewMode === 'week'
                                ? "bg-brand-primary text-white"
                                : "text-muted hover:text-foreground"
                        )}
                    >
                        <Calendar className="w-4 h-4" />
                        Semana
                    </button>
                    <button
                        onClick={() => setViewMode('fixed')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
                            viewMode === 'fixed'
                                ? "bg-brand-primary text-white"
                                : "text-muted hover:text-foreground"
                        )}
                    >
                        <Settings className="w-4 h-4" />
                        Fixos
                    </button>
                    <button
                        onClick={() => setViewMode('templates')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
                            viewMode === 'templates'
                                ? "bg-brand-primary text-white"
                                : "text-muted hover:text-foreground"
                        )}
                    >
                        <Layout className="w-4 h-4" />
                        Templates
                    </button>
                    <button
                        onClick={() => setViewMode('recurrences')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
                            viewMode === 'recurrences'
                                ? "bg-brand-primary text-white"
                                : "text-muted hover:text-foreground"
                        )}
                    >
                        <TrendingUp className="w-4 h-4" />
                        Recorrências
                    </button>
                </div>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={viewMode}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {viewMode === 'day' && <DayView />}
                    {viewMode === 'week' && <WeekView />}
                    {viewMode === 'fixed' && <FixedBlocksManager />}
                    {viewMode === 'templates' && <BlockTemplates />}
                    {viewMode === 'recurrences' && <RecurrenceSuggestions />}
                </motion.div>
            </AnimatePresence>

            <AnimatePresence>
                {pendingFeedbacks.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-24 right-6 z-[100]"
                    >
                        <button
                            onClick={handleReplanWithFeedback}
                            disabled={isReplanning}
                            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-purple-500/50 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
                        >
                            {isReplanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5" />}
                            <span className="font-semibold tracking-wide">Refazer Semana ({pendingFeedbacks.length})</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
