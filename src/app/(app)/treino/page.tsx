"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, CalendarDays, BarChart3 } from 'lucide-react';
import { useTraining } from '@/context/trainingContext';
import { TrainingPlanDay } from '@/types';
import WeeklyPlan from '@/components/training/WeeklyPlan';
import WorkoutSession from '@/components/training/WorkoutSession';
import ProgressDashboard from '@/components/training/ProgressDashboard';

type TrainingTab = 'plan' | 'session' | 'progress';

export default function TreinoPage() {
    const { weeklyPlan, activeSession, loadWeeklyPlan } = useTraining();
    const [activeTab, setActiveTab] = useState<TrainingTab>('plan');
    const [sessionDayPlan, setSessionDayPlan] = useState<TrainingPlanDay | null>(null);

    useEffect(() => {
        loadWeeklyPlan();
    }, [loadWeeklyPlan]);

    // Auto-switch to session tab when there's an active session (including resumed ones)
    useEffect(() => {
        if (activeSession && weeklyPlan) {
            // If we have a resumed session, derive the dayPlan from the weekly plan
            if (!sessionDayPlan && activeSession.day_of_week) {
                const matchingDay = weeklyPlan.plan_data?.find(
                    d => d.dayOfWeek === activeSession.day_of_week
                );
                if (matchingDay) {
                    setSessionDayPlan(matchingDay);
                }
            }
            setActiveTab('session');
        }
    }, [activeSession, weeklyPlan, sessionDayPlan]);

    const handleStartSession = (day: TrainingPlanDay) => {
        setSessionDayPlan(day);
        setActiveTab('session');
    };

    const tabs: { key: TrainingTab; label: string; icon: React.ElementType }[] = [
        { key: 'plan', label: 'Plano', icon: CalendarDays },
        { key: 'session', label: 'Sessão', icon: Dumbbell },
        { key: 'progress', label: 'Progresso', icon: BarChart3 },
    ];

    return (
        <div className="p-6 space-y-6 max-w-3xl mx-auto pb-24">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/20">
                        <Dumbbell className="w-6 h-6 text-blue-400" />
                    </div>
                    Treino
                </h1>
                <p className="text-sm text-white/60 mt-1">
                    Seu plano de treino personalizado, sessões e progressão.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    const hasActiveIndicator = tab.key === 'session' && activeSession;

                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 relative flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${isActive
                                ? 'bg-white/10 text-white'
                                : 'text-white/50 hover:text-white/70'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                            {hasActiveIndicator && (
                                <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'plan' && (
                        <WeeklyPlan onStartSession={handleStartSession} />
                    )}

                    {activeTab === 'session' && (
                        sessionDayPlan ? (
                            <WorkoutSession
                                dayPlan={sessionDayPlan}
                                onComplete={() => {
                                    setSessionDayPlan(null);
                                    setActiveTab('progress');
                                }}
                                onCancel={() => {
                                    setSessionDayPlan(null);
                                    setActiveTab('plan');
                                }}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16">
                                <Dumbbell className="w-12 h-12 text-white/20 mb-4" />
                                <p className="text-white/50 text-sm text-center mb-6">
                                    Nenhuma sessão ativa.
                                    <br />
                                    Inicie um treino pela aba Plano.
                                </p>
                                <button
                                    onClick={() => setActiveTab('plan')}
                                    className="text-blue-400 text-sm hover:underline"
                                >
                                    Ir para Plano →
                                </button>
                            </div>
                        )
                    )}

                    {activeTab === 'progress' && (
                        <ProgressDashboard />
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
