"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Heart, User, Utensils, ShoppingCart, Sparkles,
    ChevronRight, Plus, Loader2, Edit2, Calendar, Package
} from 'lucide-react';
import { useHealth } from '@/context/healthContext';
import { HealthOnboarding } from '@/components/health/HealthOnboarding';
import { ShoppingListCard } from '@/components/health/ShoppingListCard';
import MealCalendar from '@/components/health/MealCalendar';
import PantryManager from '@/components/health/PantryManager';
import { cn } from '@/lib/utils';

type Tab = 'profile' | 'meals' | 'calendar' | 'shopping' | 'pantry';

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'meals', label: 'Refeições', icon: Utensils },
    { id: 'calendar', label: 'Cardápio', icon: Calendar },
    { id: 'shopping', label: 'Compras', icon: ShoppingCart },
    { id: 'pantry', label: 'Despensa', icon: Package },
];

const goalLabels: Record<string, string> = {
    energy: 'Mais Energia',
    fitness: 'Condicionamento',
    healthy_habits: 'Hábitos Saudáveis',
    sleep: 'Qualidade do Sono',
    stress: 'Reduzir Estresse',
    general: 'Bem-estar Geral',
};

const trainingLabels: Record<string, string> = {
    beginner: 'Iniciante',
    intermediate: 'Intermediário',
    advanced: 'Avançado',
};

export default function SaudePage() {
    const {
        healthProfile,
        shoppingLists,
        isLoading,
        hasCompletedOnboarding,
        generateMealSuggestion,
        generateShoppingList,
    } = useHealth();

    const [activeTab, setActiveTab] = useState<Tab>('profile');
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [mealSuggestion, setMealSuggestion] = useState<any>(null);
    const [loadingMeal, setLoadingMeal] = useState(false);
    const [loadingShopping, setLoadingShopping] = useState(false);

    // Close onboarding when completed
    React.useEffect(() => {
        if (hasCompletedOnboarding) {
            setShowOnboarding(false);
        }
    }, [hasCompletedOnboarding]);

    const handleGenerateMeal = async (type: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
        setLoadingMeal(true);
        const result = await generateMealSuggestion(type);
        setMealSuggestion(result);
        setLoadingMeal(false);
    };

    const handleGenerateShoppingList = async () => {
        setLoadingShopping(true);
        await generateShoppingList('alimentação saudável', 7);
        setLoadingShopping(false);
    };

    // Show onboarding if no profile
    if (!hasCompletedOnboarding && !showOnboarding) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center max-w-md"
                >
                    <div className="w-20 h-20 rounded-2xl bg-brand-primary/20 flex items-center justify-center mx-auto mb-6">
                        <Heart className="w-10 h-10 text-brand-primary" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground mb-4">
                        Seu Perfil de Saúde
                    </h1>
                    <p className="text-muted mb-8">
                        Configure seu perfil para receber sugestões personalizadas de hábitos,
                        refeições e compras alinhadas aos seus objetivos.
                    </p>
                    <button
                        onClick={() => setShowOnboarding(true)}
                        className="flex items-center justify-center gap-2 w-full max-w-xs mx-auto py-4 rounded-xl bg-brand-primary text-primary-foreground font-medium hover:bg-brand-primary/90 transition-colors"
                    >
                        <Sparkles className="w-5 h-5" />
                        Começar
                    </button>
                </motion.div>
            </div>
        );
    }

    if (showOnboarding || !hasCompletedOnboarding) {
        return (
            <div className="p-6 pb-24">
                <HealthOnboarding onComplete={() => setShowOnboarding(false)} />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Saúde</h1>
                    <p className="text-muted text-sm mt-1">
                        {goalLabels[healthProfile?.goal || 'general']}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 rounded-xl bg-foreground/5 overflow-x-auto">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap px-3",
                                activeTab === tab.id
                                    ? "bg-brand-primary text-primary-foreground"
                                    : "text-muted hover:text-foreground hover:bg-foreground/5"
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
                {activeTab === 'profile' && (
                    <motion.div
                        key="profile"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                    >
                        {/* Profile summary card */}
                        <div className="p-5 rounded-2xl bg-surface border border-card-border">
                            <div className="flex items-start justify-between mb-4">
                                <h3 className="font-semibold text-foreground">Seu Perfil</h3>
                                <button
                                    onClick={() => setShowOnboarding(true)}
                                    className="p-2 rounded-lg hover:bg-foreground/10 text-muted hover:text-foreground transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {healthProfile?.height_cm && (
                                    <div>
                                        <p className="text-xs text-muted mb-1">Altura</p>
                                        <p className="text-foreground">{healthProfile.height_cm} cm</p>
                                    </div>
                                )}
                                {healthProfile?.weight_kg && (
                                    <div>
                                        <p className="text-xs text-muted mb-1">Peso</p>
                                        <p className="text-foreground">{healthProfile.weight_kg} kg</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs text-muted mb-1">Objetivo</p>
                                    <p className="text-foreground">{goalLabels[healthProfile?.goal || 'general']}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted mb-1">Nível</p>
                                    <p className="text-foreground">{trainingLabels[healthProfile?.training_level || 'beginner']}</p>
                                </div>
                            </div>

                            {healthProfile?.dietary_preferences && healthProfile.dietary_preferences.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-card-border/50">
                                    <p className="text-xs text-muted mb-2">Preferências alimentares</p>
                                    <div className="flex flex-wrap gap-2">
                                        {healthProfile.dietary_preferences.map((pref: string) => (
                                            <span
                                                key={pref}
                                                className="text-xs px-2 py-1 rounded-lg bg-foreground/10 text-muted"
                                            >
                                                {pref}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sleep schedule */}
                        <div className="p-5 rounded-2xl bg-surface border border-card-border">
                            <h3 className="font-semibold text-foreground mb-4">Horários</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-muted mb-1">Acordar</p>
                                    <p className="text-foreground text-lg">{healthProfile?.wake_time || '07:00'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted mb-1">Dormir</p>
                                    <p className="text-foreground text-lg">{healthProfile?.sleep_time || '22:00'}</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'meals' && (
                    <motion.div
                        key="meals"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                    >
                        <p className="text-muted text-sm">
                            Peça sugestões de refeições saudáveis baseadas no seu perfil.
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => handleGenerateMeal(type)}
                                    disabled={loadingMeal}
                                    className="p-4 rounded-xl bg-surface border border-card-border hover:bg-foreground/5 transition-colors text-left"
                                >
                                    <p className="font-medium text-foreground">
                                        {type === 'breakfast' ? 'Café da manhã' :
                                            type === 'lunch' ? 'Almoço' :
                                                type === 'dinner' ? 'Jantar' : 'Lanche'}
                                    </p>
                                    <p className="text-xs text-muted mt-1">
                                        Gerar sugestão
                                    </p>
                                </button>
                            ))}
                        </div>

                        {loadingMeal && (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
                            </div>
                        )}

                        {mealSuggestion && !loadingMeal && (
                            <div className="p-5 rounded-2xl bg-surface border border-card-border">
                                <p className="text-foreground whitespace-pre-wrap">
                                    {mealSuggestion.message_to_user}
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'calendar' && (
                    <motion.div
                        key="calendar"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <MealCalendar />
                    </motion.div>
                )}

                {activeTab === 'shopping' && (
                    <motion.div
                        key="shopping"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                    >
                        {/* Generate button */}
                        <button
                            onClick={handleGenerateShoppingList}
                            disabled={loadingShopping}
                            className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-brand-primary/20 border border-brand-primary/30 hover:bg-brand-primary/30 text-brand-primary transition-colors"
                        >
                            {loadingShopping ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    Gerar Lista com IA
                                </>
                            )}
                        </button>

                        {/* Shopping lists */}
                        {shoppingLists.length > 0 ? (
                            <div className="space-y-4">
                                {shoppingLists.map(list => (
                                    <ShoppingListCard key={list.id} list={list} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <ShoppingCart className="w-12 h-12 text-muted/30 mx-auto mb-4" />
                                <p className="text-muted">
                                    Nenhuma lista de compras ainda
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'pantry' && (
                    <motion.div
                        key="pantry"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <PantryManager />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
