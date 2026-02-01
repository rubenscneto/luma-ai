"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, ChevronRight, Plus, Utensils, Coffee,
    Moon, Cookie, RefreshCw, Sparkles, X
} from 'lucide-react';
import { useHealth } from '@/context/healthContext';

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const FULL_DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface MealSlot {
    type: MealType;
    label: string;
    icon: React.ElementType;
    color: string;
}

const MEAL_SLOTS: MealSlot[] = [
    { type: 'breakfast', label: 'Café', icon: Coffee, color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30' },
    { type: 'lunch', label: 'Almoço', icon: Utensils, color: 'from-green-500/20 to-emerald-500/20 border-green-500/30' },
    { type: 'dinner', label: 'Jantar', icon: Moon, color: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/30' },
    { type: 'snack', label: 'Lanche', icon: Cookie, color: 'from-pink-500/20 to-rose-500/20 border-pink-500/30' },
];

interface PlannedMeal {
    id: string;
    date: string;
    type: MealType;
    name: string;
    description?: string;
    prepTime?: number;
}

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

export default function MealCalendar() {
    const { generateMealSuggestion, hasCompletedOnboarding } = useHealth();
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const today = new Date();
        today.setDate(today.getDate() - today.getDay());
        return today;
    });
    const [plannedMeals, setPlannedMeals] = useState<PlannedMeal[]>([]);
    const [generatingFor, setGeneratingFor] = useState<string | null>(null);
    const [selectedMeal, setSelectedMeal] = useState<PlannedMeal | null>(null);

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

    const getMealForSlot = (date: Date, mealType: MealType): PlannedMeal | undefined => {
        const dateKey = formatDateKey(date);
        return plannedMeals.find(m => m.date === dateKey && m.type === mealType);
    };

    const handleGenerateMeal = async (date: Date, mealType: MealType) => {
        const dateKey = formatDateKey(date);
        const slotKey = `${dateKey}-${mealType}`;

        setGeneratingFor(slotKey);

        try {
            const suggestion = await generateMealSuggestion(mealType);

            if (suggestion?.meal) {
                const newMeal: PlannedMeal = {
                    id: `meal-${Date.now()}`,
                    date: dateKey,
                    type: mealType,
                    name: suggestion.meal.name,
                    description: suggestion.meal.description,
                    prepTime: suggestion.meal.prep_time,
                };

                // Remove existing meal for this slot if any
                setPlannedMeals(prev => [
                    ...prev.filter(m => !(m.date === dateKey && m.type === mealType)),
                    newMeal
                ]);
            }
        } catch (error) {
            console.error('Error generating meal:', error);
        } finally {
            setGeneratingFor(null);
        }
    };

    const handleRemoveMeal = (mealId: string) => {
        setPlannedMeals(prev => prev.filter(m => m.id !== mealId));
        setSelectedMeal(null);
    };

    const handleGenerateWeek = async () => {
        for (const date of weekDates) {
            for (const slot of MEAL_SLOTS.filter(s => s.type !== 'snack')) {
                const existing = getMealForSlot(date, slot.type);
                if (!existing) {
                    await handleGenerateMeal(date, slot.type);
                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }
    };

    if (!hasCompletedOnboarding) {
        return (
            <div className="text-center py-16">
                <Utensils className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/60">
                    Complete seu perfil de saúde para usar o calendário de refeições
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
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
                    <button
                        onClick={goToToday}
                        className="px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        Hoje
                    </button>
                </div>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleGenerateWeek}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white text-sm font-medium"
                >
                    <Sparkles className="w-4 h-4" />
                    Gerar Semana
                </motion.button>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                {/* Day Headers */}
                <div className="grid grid-cols-8 border-b border-white/10">
                    <div className="p-3 text-xs text-white/40 font-medium">Refeição</div>
                    {weekDates.map((date, idx) => {
                        const dateKey = formatDateKey(date);
                        const isToday = dateKey === todayKey;
                        return (
                            <div
                                key={dateKey}
                                className={`p-3 text-center ${isToday ? 'bg-purple-500/10' : ''}`}
                            >
                                <div className="text-xs text-white/60">{DAYS[idx]}</div>
                                <div className={`text-sm font-medium ${isToday ? 'text-purple-400' : 'text-white'}`}>
                                    {date.getDate()}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Meal Rows */}
                {MEAL_SLOTS.map(slot => {
                    const Icon = slot.icon;
                    return (
                        <div key={slot.type} className="grid grid-cols-8 border-b border-white/5 last:border-0">
                            {/* Row Label */}
                            <div className="p-3 flex items-center gap-2 border-r border-white/10">
                                <Icon className="w-4 h-4 text-white/40" />
                                <span className="text-xs text-white/60">{slot.label}</span>
                            </div>

                            {/* Day Cells */}
                            {weekDates.map(date => {
                                const dateKey = formatDateKey(date);
                                const isToday = dateKey === todayKey;
                                const meal = getMealForSlot(date, slot.type);
                                const slotKey = `${dateKey}-${slot.type}`;
                                const isGenerating = generatingFor === slotKey;

                                return (
                                    <div
                                        key={slotKey}
                                        className={`p-2 min-h-[80px] ${isToday ? 'bg-purple-500/5' : ''}`}
                                    >
                                        {meal ? (
                                            <motion.button
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                onClick={() => setSelectedMeal(meal)}
                                                className={`w-full p-2 rounded-lg bg-gradient-to-br ${slot.color} border text-left hover:scale-[1.02] transition-transform`}
                                            >
                                                <p className="text-xs font-medium text-white truncate">
                                                    {meal.name}
                                                </p>
                                                {meal.prepTime && (
                                                    <p className="text-[10px] text-white/60 mt-0.5">
                                                        {meal.prepTime} min
                                                    </p>
                                                )}
                                            </motion.button>
                                        ) : (
                                            <button
                                                onClick={() => handleGenerateMeal(date, slot.type)}
                                                disabled={isGenerating}
                                                className="w-full h-full flex items-center justify-center rounded-lg border border-dashed border-white/10 hover:border-white/30 hover:bg-white/5 transition-all group"
                                            >
                                                {isGenerating ? (
                                                    <RefreshCw className="w-4 h-4 text-white/40 animate-spin" />
                                                ) : (
                                                    <Plus className="w-4 h-4 text-white/20 group-hover:text-white/40" />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {/* Meal Detail Modal */}
            <AnimatePresence>
                {selectedMeal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedMeal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-md border border-white/10"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-white">{selectedMeal.name}</h3>
                                    <p className="text-sm text-white/60">
                                        {FULL_DAYS[new Date(selectedMeal.date).getDay()]} • {
                                            MEAL_SLOTS.find(s => s.type === selectedMeal.type)?.label
                                        }
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedMeal(null)}
                                    className="p-2 rounded-lg hover:bg-white/10"
                                >
                                    <X className="w-5 h-5 text-white/60" />
                                </button>
                            </div>

                            {selectedMeal.description && (
                                <p className="text-sm text-white/70 mb-4">{selectedMeal.description}</p>
                            )}

                            {selectedMeal.prepTime && (
                                <div className="flex items-center gap-2 text-sm text-white/60 mb-4">
                                    <span>⏱️ Tempo de preparo: {selectedMeal.prepTime} min</span>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => handleRemoveMeal(selectedMeal.id)}
                                    className="flex-1 py-2.5 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 hover:bg-red-500/30 transition-all"
                                >
                                    Remover
                                </button>
                                <button
                                    onClick={() => {
                                        handleGenerateMeal(new Date(selectedMeal.date), selectedMeal.type);
                                        setSelectedMeal(null);
                                    }}
                                    className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-medium"
                                >
                                    Regenerar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
