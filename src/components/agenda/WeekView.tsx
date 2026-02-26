"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, ChevronRight, Calendar, Wand2, Loader2,
    Briefcase, GraduationCap, Dumbbell, Utensils,
    Moon, Heart, Users, Sparkles, CheckCircle2, Plus,
    Clock, XCircle, ThumbsDown, Pencil
} from 'lucide-react';
import { useDailyPlan } from '@/context/dailyPlanContext';
import { useAuth } from '@/context/authContext';
import { useAgenda } from '@/context/agendaContext';
import { DailyBlock } from '@/types';
import { toast } from 'sonner';
import { BlockEditorModal } from './BlockEditorModal';

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6:00 to 21:00

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    work: { icon: Briefcase, color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/30' },
    study: { icon: GraduationCap, color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/30' },
    health: { icon: Dumbbell, color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/30' },
    meal: { icon: Utensils, color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/30' },
    sleep: { icon: Moon, color: 'text-indigo-400', bg: 'bg-indigo-500/20 border-indigo-500/30' },
    leisure: { icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/20 border-pink-500/30' },
    admin: { icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-500/20 border-cyan-500/30' },
    commute: { icon: Sparkles, color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30' },
    fixed: { icon: Calendar, color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30' },
    // Legacy mappings
    trabalho: { icon: Briefcase, color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/30' },
    estudo: { icon: GraduationCap, color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/30' },
    treino: { icon: Dumbbell, color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/30' },
    alimentacao: { icon: Utensils, color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/30' },
    descanso: { icon: Moon, color: 'text-indigo-400', bg: 'bg-indigo-500/20 border-indigo-500/30' },
    saude: { icon: Heart, color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30' },
    social: { icon: Users, color: 'text-pink-400', bg: 'bg-pink-500/20 border-pink-500/30' },
};

const DEFAULT_CATEGORY = { icon: Sparkles, color: 'text-gray-400', bg: 'bg-gray-500/20 border-gray-500/30' };

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

// function formatDateKey(date: Date): string {
//     return date.toISOString().split('T')[0];
// }

export default function WeekView() {
    const {
        todayBlocks,
        generatePlan,
        weekBlocks,
        fetchWeekBlocks,
        loadTodayPlan,
        updateBlock,
    } = useDailyPlan();
    const { user } = useAuth();
    const { addFeedback, pendingFeedbacks, removeFeedback } = useAgenda();
    const [activeFeedbackBlock, setActiveFeedbackBlock] = useState<string | null>(null);
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const today = new Date();
        today.setDate(today.getDate() - today.getDay());
        return today;
    });
    const [isWeekLoading, setIsWeekLoading] = useState(false);
    const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
    const [editingBlock, setEditingBlock] = useState<DailyBlock | null>(null);

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

    // Fetch week blocks when currentWeekStart changes
    React.useEffect(() => {
        const startDateKey = formatDateKey(currentWeekStart);
        fetchWeekBlocks(startDateKey);
    }, [currentWeekStart, fetchWeekBlocks]);

    const handleDayClick = useCallback((date: Date) => {
        const key = formatDateKey(date);
        setSelectedDayKey(prev => prev === key ? null : key);
        // if (onDayClick) onDayClick(key); // Removed prop
    }, []);

    const handlePlanWeek = async () => {
        if (isWeekLoading) return;
        if (!user) {
            toast.error('Usuário não autenticado.');
            return;
        }
        setIsWeekLoading(true);
        try {
            const startDate = formatDateKey(weekDates[0]);

            const payload = {
                user_id: user.id,
                start_date: startDate,
                timezone: 'America/Sao_Paulo',
                debug: true, // TEMP: diagnostic — see ai_raw_count / after_filter / after_solver
            };

            const response = await fetch('/api/ai/agenda/plan-week', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const data = await response.json();
                // DEBUG: log full response for diagnosis
                console.log('[plan-week] response:', JSON.stringify(data, null, 2));
                toast.success(`Semana planejada! ${data.totalBlocks} blocos criados.`);
                // Refresh week view AND today's blocks
                await fetchWeekBlocks(formatDateKey(currentWeekStart));
                await loadTodayPlan();
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('Plan week error data:', JSON.stringify(errorData, null, 2));
                toast.error(errorData.error || 'Erro ao planejar semana.');
            }
        } catch (error) {
            console.error('Plan week error exception:', error);
            toast.error('Erro de conexão ao planejar semana.');
        } finally {
            setIsWeekLoading(false);
        }
    };

    const handlePlanDay = async (date: Date) => {
        const dateStr = formatDateKey(date);
        try {
            await generatePlan(dateStr, 'first_time');
            toast.success(`Dia ${date.getDate()} planejado com sucesso!`);
            fetchWeekBlocks(formatDateKey(currentWeekStart));
        } catch (error) {
            toast.error('Erro ao planejar dia.');
        }
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

    // Count blocks per day for summary
    const dayBlockCounts = useMemo(() => {
        return weekDates.reduce((acc, date) => {
            const key = formatDateKey(date);
            acc[key] = getBlocksForDate(date).length;
            return acc;
        }, {} as Record<string, number>);
    }, [weekDates, todayBlocks, weekBlocks]);

    return (
        <div className="bg-foreground/5 dark:bg-foreground/5 rounded-2xl border border-card-border/50 dark:border-card-border/50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-card-border/50">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigateWeek('prev')}
                        className="p-2 rounded-lg hover:bg-foreground/10 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-muted" />
                    </button>
                    <h3 className="text-lg font-medium text-foreground capitalize">
                        {weekLabel}
                    </h3>
                    <button
                        onClick={() => navigateWeek('next')}
                        className="p-2 rounded-lg hover:bg-foreground/10 transition-colors"
                    >
                        <ChevronRight className="w-5 h-5 text-muted" />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePlanWeek}
                        disabled={isWeekLoading}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isWeekLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Wand2 className="w-4 h-4" />
                        )}
                        Planejar Semana
                    </button>
                    <button
                        onClick={goToToday}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted hover:text-foreground hover:bg-foreground/10 rounded-lg transition-colors"
                    >
                        <Calendar className="w-4 h-4" />
                        Hoje
                    </button>
                </div>
            </div>

            {/* Week Grid */}
            <div className="flex bg-surface dark:bg-zinc-950">
                {/* Time Column */}
                <div className="w-14 flex-shrink-0 border-r border-card-border/50 bg-bg">
                    <div className="h-16 border-b border-card-border/50" /> {/* Header spacer */}
                    <div className="relative" style={{ height: '1152px' }}> {/* 16 * 72px */}
                        {HOURS.map(hour => (
                            <div
                                key={hour}
                                className="absolute w-full text-[11px] font-medium text-muted/60 text-right pr-3 -mt-2"
                                style={{ top: `${((hour - 6) / 16) * 100}%` }}
                            >
                                {hour}:00
                            </div>
                        ))}
                    </div>
                </div>

                {/* Days Columns */}
                <div className="flex-1 flex overflow-x-auto snap-x">
                    {weekDates.map((date, idx) => {
                        const dateKey = formatDateKey(date);
                        const isToday = dateKey === todayKey;
                        const isSelected = dateKey === selectedDayKey;
                        const blocks = getBlocksForDate(date);
                        const blockCount = dayBlockCounts[dateKey] || 0;
                        const isFuture = date > today;
                        const isPast = dateKey < todayKey;

                        return (
                            <div
                                key={dateKey}
                                className={`flex-1 min-w-[120px] snap-center border-r border-card-border/50 last:border-r-0 cursor-pointer transition-colors ${isToday ? 'bg-purple-500/[0.03]' :
                                    isSelected ? 'bg-blue-500/[0.03]' :
                                        isPast ? 'bg-black/[0.01] dark:bg-white/[0.01]' : ''
                                    }`}
                                onClick={() => handleDayClick(date)}
                            >
                                {/* Day Header */}
                                <div className={`h-16 sticky top-0 z-20 flex flex-col items-center justify-center border-b border-card-border/50 backdrop-blur-md ${isToday ? 'bg-purple-500/10' :
                                    isSelected ? 'bg-blue-500/10' : 'bg-white/80 dark:bg-zinc-950/80'
                                    }`}>
                                    <span className={`text-[10px] uppercase font-bold tracking-wider ${isToday ? 'text-purple-600 dark:text-purple-400' : 'text-muted'}`}>{DAYS[idx]}</span>
                                    <div className={`mt-0.5 w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold ${isToday ? 'bg-purple-600 text-white' :
                                        isSelected ? 'text-blue-600 dark:text-blue-400' :
                                            'text-foreground'
                                        }`}>
                                        {date.getDate()}
                                    </div>
                                    {blockCount > 0 ? (
                                        <span className="text-[9px] text-muted/50 font-medium absolute top-2 right-2">{blockCount}</span>
                                    ) : isFuture && isToday === false ? (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handlePlanDay(date); }}
                                            className="text-[9px] absolute top-2 right-2 text-purple-600/70 hover:text-purple-600 transition-colors flex items-center justify-center w-5 h-5 rounded-full hover:bg-purple-500/10"
                                            title="Planejar Dia"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    ) : null}
                                </div>

                                {/* Blocks Area (Height: 1152px) */}
                                <div className="relative" style={{ height: '1152px' }}>
                                    {/* Hour Lines - Enhanced contrast for legibility */}
                                    {HOURS.map(hour => (
                                        <div
                                            key={hour}
                                            className="absolute w-full border-t border-card-border/30"
                                            style={{ top: `${((hour - 6) / 16) * 100}%` }}
                                        />
                                    ))}

                                    {/* Current Time Indicator */}
                                    {isToday && (
                                        <div
                                            className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
                                            style={{
                                                top: `${((today.getHours() + today.getMinutes() / 60 - 6) / 16) * 100}%`
                                            }}
                                        >
                                            <div className="w-2.5 h-2.5 -ml-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                                            <div className="flex-1 h-px bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                                        </div>
                                    )}

                                    {/* Blocks */}
                                    {blocks.map(block => {
                                        const cat = CATEGORY_CONFIG[block.category] || DEFAULT_CATEGORY;
                                        const Icon = cat.icon;
                                        const style = getBlockStyle(block);

                                        // Calc duration for internal layout
                                        const start = new Date(block.start_datetime);
                                        const end = new Date(block.end_datetime);
                                        const durMinutes = (end.getTime() - start.getTime()) / 60000;
                                        const isShort = durMinutes <= 30;

                                        return (
                                            <motion.div
                                                key={block.id}
                                                initial={{ opacity: 0, scale: 0.98 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (block.is_done) return;
                                                    setActiveFeedbackBlock(activeFeedbackBlock === block.id ? null : block.id);
                                                }}
                                                className={`absolute left-0.5 right-0.5 rounded-md border ${cat.bg} ${block.is_done ? 'opacity-50 grayscale' : 'shadow-sm'
                                                    } ${activeFeedbackBlock === block.id ? 'z-50 shadow-xl ring-2 ring-purple-500' : 'overflow-hidden cursor-pointer hover:shadow-md hover:brightness-105 transition-all z-0'}`}
                                                style={style}
                                            >
                                                {pendingFeedbacks.find(f => f.blockId === block.id) && (
                                                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 shadow-sm" title="Feedback pendente" />
                                                )}

                                                <div className={`flex items-start gap-1 p-1 h-full pointer-events-none ${isShort ? 'items-center flex-row overflow-hidden' : 'flex-col'}`}>
                                                    <div className={`flex items-center gap-1 shrink-0 ${isShort ? '' : 'mb-0.5'}`}>
                                                        {block.is_done ? (
                                                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                                                        ) : (
                                                            <Icon className={`w-3 h-3 ${cat.color}`} />
                                                        )}
                                                        {!isShort && (
                                                            <span className={`text-[9px] font-semibold opacity-80 ${cat.color}`}>
                                                                {start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-[11px] font-semibold leading-tight line-clamp-3 ${block.is_done ? 'text-muted line-through' : 'text-zinc-900 dark:text-zinc-100'}`}>
                                                            {block.title}
                                                        </p>
                                                        {isShort && (
                                                            <span className={`text-[9px] font-semibold opacity-80 ml-1 inline-block ${cat.color}`}>
                                                                {start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Action Menu popover */}
                                                {activeFeedbackBlock === block.id && (
                                                    <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-1 z-[60]" onClick={e => e.stopPropagation()}>
                                                        <div className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 px-2 py-1.5 mb-1 border-b border-zinc-100 dark:border-zinc-800">Opções</div>
                                                        <button
                                                            onClick={() => {
                                                                setEditingBlock(block);
                                                                setActiveFeedbackBlock(null);
                                                            }}
                                                            className="flex items-center gap-2 w-full text-left px-2 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 text-[11px] font-medium transition-colors"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" /> Editar Detalhes
                                                        </button>

                                                        <div className="text-[10px] font-bold text-red-500 px-2 py-1 mt-1 mb-1 border-t border-zinc-100 dark:border-zinc-800 bg-red-50 dark:bg-red-950/20">Ajustar IA</div>
                                                        <button
                                                            onClick={() => {
                                                                addFeedback({ blockId: block.id, title: block.title, dayKey: formatDateKey(date), originalTime: block.start_datetime, type: 'bad_time' });
                                                                setActiveFeedbackBlock(null);
                                                                toast.success("Feedback anotado");
                                                            }}
                                                            className="flex items-center gap-2 w-full text-left px-2 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 text-[11px] font-medium transition-colors"
                                                        >
                                                            <Clock className="w-3.5 h-3.5" /> Horário Ruim
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                addFeedback({ blockId: block.id, title: block.title, dayKey: formatDateKey(date), originalTime: block.start_datetime, type: 'unrealistic' });
                                                                setActiveFeedbackBlock(null);
                                                                toast.success("Feedback anotado");
                                                            }}
                                                            className="flex items-center gap-2 w-full text-left px-2 py-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg text-orange-600 dark:text-orange-400 text-[11px] font-medium transition-colors"
                                                        >
                                                            <XCircle className="w-3.5 h-3.5" /> Tempo Irreal
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                addFeedback({ blockId: block.id, title: block.title, dayKey: formatDateKey(date), originalTime: block.start_datetime, type: 'dislike' });
                                                                setActiveFeedbackBlock(null);
                                                                toast.success("Feedback anotado");
                                                            }}
                                                            className="flex items-center gap-2 w-full text-left px-2 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 text-[11px] font-medium transition-colors"
                                                        >
                                                            <ThumbsDown className="w-3.5 h-3.5" /> Não Gostei
                                                        </button>
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })}

                                    {/* Empty state for unplanned future days */}
                                    {blocks.length === 0 && isFuture && (
                                        <div className="absolute inset-x-2 top-10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-10">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handlePlanDay(date); }}
                                                className="flex flex-col items-center gap-1.5 px-4 py-3 bg-white dark:bg-zinc-900 shadow-xl rounded-xl border border-zinc-200 dark:border-zinc-800 hover:scale-105 transition-all text-purple-600 dark:text-purple-400"
                                            >
                                                <Wand2 className="w-5 h-5" />
                                                <span className="text-[11px] font-bold">Autocompletar Dia</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <AnimatePresence>
                {editingBlock && (
                    <BlockEditorModal
                        isOpen={!!editingBlock}
                        onClose={() => setEditingBlock(null)}
                        onSave={(updates: Partial<DailyBlock>) => {
                            if (updateBlock) updateBlock(editingBlock.id, updates);
                            setEditingBlock(null);
                        }}
                        initialData={editingBlock}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
