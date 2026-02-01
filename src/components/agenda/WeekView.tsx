"use client";

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    ChevronLeft, ChevronRight, Calendar,
    Briefcase, GraduationCap, Dumbbell, Utensils,
    Moon, Heart, Users, Sparkles, CheckCircle2
} from 'lucide-react';
import { useDailyPlan } from '@/context/dailyPlanContext';
import { DailyBlock } from '@/types';

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6:00 to 21:00

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    trabalho: { icon: Briefcase, color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/30' },
    estudo: { icon: GraduationCap, color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/30' },
    treino: { icon: Dumbbell, color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/30' },
    alimentacao: { icon: Utensils, color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/30' },
    descanso: { icon: Moon, color: 'text-indigo-400', bg: 'bg-indigo-500/20 border-indigo-500/30' },
    saude: { icon: Heart, color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30' },
    social: { icon: Users, color: 'text-pink-400', bg: 'bg-pink-500/20 border-pink-500/30' },
    outro: { icon: Sparkles, color: 'text-gray-400', bg: 'bg-gray-500/20 border-gray-500/30' },
};

function getWeekDates(baseDate: Date): Date[] {
    const start = new Date(baseDate);
    start.setDate(start.getDate() - start.getDay());

    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
    });
}

function formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
}

interface WeekViewProps {
    weekBlocks?: Record<string, DailyBlock[]>;
}

export default function WeekView({ weekBlocks = {} }: WeekViewProps) {
    const { todayBlocks } = useDailyPlan();
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const today = new Date();
        today.setDate(today.getDate() - today.getDay());
        return today;
    });

    const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);
    const today = new Date();
    const todayKey = formatDateKey(today);

    const navigateWeek = (direction: 'prev' | 'next') => {
        setCurrentWeekStart(prev => {
            const newDate = new Date(prev);
            newDate.setDate(prev.getDate() + (direction === 'next' ? 7 : -7));
            return newDate;
        });
    };

    const goToToday = () => {
        const today = new Date();
        today.setDate(today.getDate() - today.getDay());
        setCurrentWeekStart(today);
    };

    // Get blocks for a specific date
    const getBlocksForDate = (date: Date): DailyBlock[] => {
        const key = formatDateKey(date);
        if (key === todayKey) {
            return todayBlocks;
        }
        return weekBlocks[key] || [];
    };

    // Calculate block position and height
    const getBlockStyle = (block: DailyBlock) => {
        const start = new Date(block.start_datetime);
        const end = new Date(block.end_datetime);

        const startHour = start.getHours() + start.getMinutes() / 60;
        const endHour = end.getHours() + end.getMinutes() / 60;

        const top = ((startHour - 6) / 16) * 100;
        const height = ((endHour - startHour) / 16) * 100;

        return {
            top: `${Math.max(0, top)}%`,
            height: `${Math.max(3, height)}%`,
        };
    };

    const weekLabel = useMemo(() => {
        const start = weekDates[0];
        const end = weekDates[6];
        const startMonth = start.toLocaleDateString('pt-BR', { month: 'short' });
        const endMonth = end.toLocaleDateString('pt-BR', { month: 'short' });

        if (startMonth === endMonth) {
            return `${start.getDate()} - ${end.getDate()} ${startMonth}`;
        }
        return `${start.getDate()} ${startMonth} - ${end.getDate()} ${endMonth}`;
    }, [weekDates]);

    return (
        <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigateWeek('prev')}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-white/60" />
                    </button>
                    <h3 className="text-lg font-medium text-white capitalize">
                        {weekLabel}
                    </h3>
                    <button
                        onClick={() => navigateWeek('next')}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <ChevronRight className="w-5 h-5 text-white/60" />
                    </button>
                </div>

                <button
                    onClick={goToToday}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                    <Calendar className="w-4 h-4" />
                    Hoje
                </button>
            </div>

            {/* Week Grid */}
            <div className="flex">
                {/* Time Column */}
                <div className="w-12 flex-shrink-0 border-r border-white/10">
                    <div className="h-12 border-b border-white/10" /> {/* Header spacer */}
                    <div className="relative" style={{ height: '640px' }}>
                        {HOURS.map(hour => (
                            <div
                                key={hour}
                                className="absolute w-full text-[10px] text-white/40 text-right pr-2"
                                style={{ top: `${((hour - 6) / 16) * 100}%` }}
                            >
                                {hour}:00
                            </div>
                        ))}
                    </div>
                </div>

                {/* Days Columns */}
                <div className="flex-1 flex">
                    {weekDates.map((date, idx) => {
                        const dateKey = formatDateKey(date);
                        const isToday = dateKey === todayKey;
                        const blocks = getBlocksForDate(date);

                        return (
                            <div
                                key={dateKey}
                                className={`flex-1 border-r border-white/10 last:border-r-0 ${isToday ? 'bg-purple-500/5' : ''
                                    }`}
                            >
                                {/* Day Header */}
                                <div className={`h-12 flex flex-col items-center justify-center border-b border-white/10 ${isToday ? 'bg-purple-500/10' : ''
                                    }`}>
                                    <span className="text-xs text-white/60">{DAYS[idx]}</span>
                                    <span className={`text-sm font-medium ${isToday ? 'text-purple-400' : 'text-white'
                                        }`}>
                                        {date.getDate()}
                                    </span>
                                </div>

                                {/* Blocks Area */}
                                <div className="relative" style={{ height: '640px' }}>
                                    {/* Hour Lines */}
                                    {HOURS.map(hour => (
                                        <div
                                            key={hour}
                                            className="absolute w-full border-t border-white/5"
                                            style={{ top: `${((hour - 6) / 16) * 100}%` }}
                                        />
                                    ))}

                                    {/* Current Time Indicator */}
                                    {isToday && (
                                        <div
                                            className="absolute left-0 right-0 z-10 flex items-center"
                                            style={{
                                                top: `${((today.getHours() + today.getMinutes() / 60 - 6) / 16) * 100}%`
                                            }}
                                        >
                                            <div className="w-2 h-2 rounded-full bg-red-500" />
                                            <div className="flex-1 h-0.5 bg-red-500/50" />
                                        </div>
                                    )}

                                    {/* Blocks */}
                                    {blocks.map(block => {
                                        const cat = CATEGORY_CONFIG[block.category] || CATEGORY_CONFIG.outro;
                                        const Icon = cat.icon;
                                        const style = getBlockStyle(block);

                                        return (
                                            <motion.div
                                                key={block.id}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className={`absolute left-1 right-1 rounded-lg border p-1.5 overflow-hidden ${cat.bg} ${block.is_done ? 'opacity-60' : ''
                                                    }`}
                                                style={style}
                                            >
                                                <div className="flex items-start gap-1">
                                                    {block.is_done ? (
                                                        <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
                                                    ) : (
                                                        <Icon className={`w-3 h-3 flex-shrink-0 mt-0.5 ${cat.color}`} />
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <p className={`text-[10px] font-medium truncate ${block.is_done ? 'text-white/60 line-through' : 'text-white'
                                                            }`}>
                                                            {block.title}
                                                        </p>
                                                        <p className="text-[9px] text-white/50">
                                                            {new Date(block.start_datetime).toLocaleTimeString('pt-BR', {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
