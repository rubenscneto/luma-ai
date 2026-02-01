"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, List, Settings, Layout } from 'lucide-react';
import { DayView } from '@/components/agenda/DayView';
import WeekView from '@/components/agenda/WeekView';
import FixedBlocksManager from '@/components/agenda/FixedBlocksManager';
import BlockTemplates from '@/components/agenda/BlockTemplates';
import { cn } from '@/lib/utils';

type ViewMode = 'day' | 'week' | 'fixed' | 'templates';

export default function AgendaPage() {
    const [viewMode, setViewMode] = useState<ViewMode>('day');

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Agenda</h1>
                    <p className="text-white/60 text-sm mt-1">
                        Gerencie seu dia com inteligência
                    </p>
                </div>

                {/* View toggle */}
                <div className="flex p-1 rounded-lg bg-white/5 overflow-x-auto">
                    <button
                        onClick={() => setViewMode('day')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
                            viewMode === 'day'
                                ? "bg-brand-primary text-white"
                                : "text-white/60 hover:text-white"
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
                                : "text-white/60 hover:text-white"
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
                                : "text-white/60 hover:text-white"
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
                                : "text-white/60 hover:text-white"
                        )}
                    >
                        <Layout className="w-4 h-4" />
                        Templates
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
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
