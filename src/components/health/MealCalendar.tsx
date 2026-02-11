"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, ChevronRight, Plus, Utensils, Coffee,
    Moon, Cookie, RefreshCw, Sparkles, X, AlertCircle,
    ThumbsUp, ThumbsDown, Clock, Flame
} from 'lucide-react';
import { useHealth, PlannedMealDB } from '@/context/healthContext';
import { toast } from 'sonner';

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const FULL_DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type SlotState = 'idle' | 'loading' | 'error';

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
    const {
        generateMealSuggestion, hasCompletedOnboarding,
        plannedMeals, loadPlannedMeals, saveFeedback
    } = useHealth();

    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const today = new Date();
        today.setDate(today.getDate() - today.getDay());
        return today;
    });
    const [slotStates, setSlotStates] = useState<Record<string, SlotState>>({});
    const [selectedMeal, setSelectedMeal] = useState<PlannedMealDB | null>(null);
    const [generatingWeek, setGeneratingWeek] = useState(false);

    const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);
    const today = new Date();
    const todayKey = formatDateKey(today);

    // Reload meals when week changes
    useEffect(() => {
        const start = formatDateKey(weekDates[0]);
        const end = formatDateKey(weekDates[6]);
        loadPlannedMeals(start, end);
    }, [weekDates, loadPlannedMeals]);

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

    const getMealForSlot = (date: Date, mealType: MealType): PlannedMealDB | undefined => {
        const dateKey = formatDateKey(date);
        return plannedMeals.find(m => m.date === dateKey && m.meal_type === mealType);
    };

    const handleGenerateMeal = async (date: Date, mealType: MealType) => {
        const dateKey = formatDateKey(date);
        const slotKey = `${dateKey}-${mealType}`;

        setSlotStates(prev => ({ ...prev, [slotKey]: 'loading' }));

        try {
            const suggestion = await generateMealSuggestion(mealType);

            if (suggestion?.meal) {
                setSlotStates(prev => ({ ...prev, [slotKey]: 'idle' }));
                toast.success(`${suggestion.meal.name} sugerido!`);
            } else {
                setSlotStates(prev => ({ ...prev, [slotKey]: 'error' }));
            }
        } catch (error) {
            console.error('Error generating meal:', error);
            setSlotStates(prev => ({ ...prev, [slotKey]: 'error' }));
        }
    };

    const handleGenerateWeek = async () => {
        setGeneratingWeek(true);
        for (const date of weekDates) {
            for (const slot of MEAL_SLOTS.filter(s => s.type !== 'snack')) {
                const existing = getMealForSlot(date, slot.type);
                if (!existing) {
                    await handleGenerateMeal(date, slot.type);
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }
        setGeneratingWeek(false);
    };

    const handleFeedback = async (meal: PlannedMealDB, type: 'like' | 'dislike') => {
        await saveFeedback('meal', meal.name, type);
        setSelectedMeal(null);
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
                    disabled={generatingWeek}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                >
                    {generatingWeek ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                        <Sparkles className="w-4 h-4" />
                    )}
                    {generatingWeek ? 'Gerando...' : 'Gerar Semana'}
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
                                const state = slotStates[slotKey] || 'idle';

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
                                                {meal.prep_time_min && (
                                                    <p className="text-[10px] text-white/60 mt-0.5">
                                                        {meal.prep_time_min} min
                                                    </p>
                                                )}
                                                {meal.nutrition?.calories && (
                                                    <p className="text-[10px] text-white/50 mt-0.5">
                                                        {meal.nutrition.calories} kcal
                                                    </p>
                                                )}
                                            </motion.button>
                                        ) : state === 'error' ? (
                                            <button
                                                onClick={() => handleGenerateMeal(date, slot.type)}
                                                className="w-full h-full flex flex-col items-center justify-center rounded-lg border border-dashed border-red-500/30 bg-red-500/5 hover:bg-red-500/10 transition-all gap-1"
                                            >
                                                <AlertCircle className="w-4 h-4 text-red-400/60" />
                                                <span className="text-[10px] text-red-400/60">Tentar de novo</span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleGenerateMeal(date, slot.type)}
                                                disabled={state === 'loading'}
                                                className="w-full h-full flex items-center justify-center rounded-lg border border-dashed border-white/10 hover:border-white/30 hover:bg-white/5 transition-all group"
                                            >
                                                {state === 'loading' ? (
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
                            className="bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-md border border-white/10 max-h-[80vh] overflow-y-auto"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-white">{selectedMeal.name}</h3>
                                    <p className="text-sm text-white/60">
                                        {FULL_DAYS[new Date(selectedMeal.date + 'T12:00:00').getDay()]} • {
                                            MEAL_SLOTS.find(s => s.type === selectedMeal.meal_type)?.label
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

                            {/* Why it fits */}
                            {selectedMeal.why_fits_user && (
                                <div className="mb-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                    <p className="text-xs text-purple-300">
                                        <Sparkles className="w-3 h-3 inline mr-1" />
                                        {selectedMeal.why_fits_user}
                                    </p>
                                </div>
                            )}

                            {/* Nutrition */}
                            {selectedMeal.nutrition && (selectedMeal.nutrition.calories || selectedMeal.nutrition.protein) && (
                                <div className="grid grid-cols-4 gap-2 mb-4">
                                    {selectedMeal.nutrition.calories != null && (
                                        <div className="text-center p-2 rounded-lg bg-orange-500/10">
                                            <Flame className="w-3.5 h-3.5 text-orange-400 mx-auto mb-1" />
                                            <div className="text-sm font-medium text-white">{selectedMeal.nutrition.calories}</div>
                                            <div className="text-[10px] text-white/50">kcal</div>
                                        </div>
                                    )}
                                    {selectedMeal.nutrition.protein != null && (
                                        <div className="text-center p-2 rounded-lg bg-blue-500/10">
                                            <div className="text-sm font-medium text-white">{selectedMeal.nutrition.protein}g</div>
                                            <div className="text-[10px] text-white/50">Proteína</div>
                                        </div>
                                    )}
                                    {selectedMeal.nutrition.carbs != null && (
                                        <div className="text-center p-2 rounded-lg bg-yellow-500/10">
                                            <div className="text-sm font-medium text-white">{selectedMeal.nutrition.carbs}g</div>
                                            <div className="text-[10px] text-white/50">Carbs</div>
                                        </div>
                                    )}
                                    {selectedMeal.nutrition.fat != null && (
                                        <div className="text-center p-2 rounded-lg bg-red-500/10">
                                            <div className="text-sm font-medium text-white">{selectedMeal.nutrition.fat}g</div>
                                            <div className="text-[10px] text-white/50">Gordura</div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Prep time */}
                            {selectedMeal.prep_time_min && (
                                <div className="flex items-center gap-2 text-sm text-white/60 mb-4">
                                    <Clock className="w-4 h-4" />
                                    <span>Tempo de preparo: {selectedMeal.prep_time_min} min</span>
                                </div>
                            )}

                            {/* Ingredients */}
                            {selectedMeal.ingredients && selectedMeal.ingredients.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="text-sm font-medium text-white mb-2">Ingredientes</h4>
                                    <ul className="space-y-1">
                                        {selectedMeal.ingredients.map((ing: any, i: number) => (
                                            <li key={i} className="text-sm text-white/60 flex items-start gap-2">
                                                <span className="text-purple-400 mt-1">•</span>
                                                {ing.quantity} {ing.unit} {ing.name}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Instructions */}
                            {selectedMeal.instructions && selectedMeal.instructions.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="text-sm font-medium text-white mb-2">Preparo</h4>
                                    <ol className="space-y-1">
                                        {selectedMeal.instructions.map((step: string, i: number) => (
                                            <li key={i} className="text-sm text-white/60 flex items-start gap-2">
                                                <span className="text-purple-400 font-medium shrink-0">{i + 1}.</span>
                                                {step}
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            )}

                            {/* Feedback + Actions */}
                            <div className="flex gap-2 pt-2 border-t border-white/10">
                                <button
                                    onClick={() => handleFeedback(selectedMeal, 'like')}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 hover:bg-green-500/20 transition-all text-sm"
                                >
                                    <ThumbsUp className="w-3.5 h-3.5" />
                                    Gostei
                                </button>
                                <button
                                    onClick={() => handleFeedback(selectedMeal, 'dislike')}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 hover:bg-red-500/20 transition-all text-sm"
                                >
                                    <ThumbsDown className="w-3.5 h-3.5" />
                                    Não gostei
                                </button>
                                <div className="flex-1" />
                                <button
                                    onClick={() => {
                                        handleGenerateMeal(new Date(selectedMeal.date + 'T12:00:00'), selectedMeal.meal_type);
                                        setSelectedMeal(null);
                                    }}
                                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white text-sm font-medium"
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
