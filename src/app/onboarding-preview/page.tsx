"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/authContext';
import { Loader2, CheckCircle, Sparkles } from 'lucide-react';
import WeekView from '@/components/agenda/WeekView';
import { DailyPlanProvider } from '@/context/dailyPlanContext';
import { ToastProvider } from '@/context/toastContext';

export default function OnboardingPreviewPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [isSaving, setIsSaving] = useState(false);

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg dark:bg-zinc-950">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        );
    }

    const handleConfirm = () => {
        setIsSaving(true);
        // Em um cenário real, aqui poderíamos marcar "is_fully_onboarded: true" no BD
        // se quiséssemos um estado intermediário (draft). Por enquanto, apenas finalizamos.
        window.location.href = '/agenda?view=week';
    };

    return (
        <div className="min-h-[100dvh] bg-bg dark:bg-zinc-950 flex flex-col font-sans">
            {/* Header / Top Bar */}
            <div className="shrink-0 sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50">
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                                Sua rotina está pronta!
                            </h1>
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                Dê uma olhada no que a IA planejou para você.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleConfirm}
                        disabled={isSaving}
                        className="hidden md:flex items-center gap-2 px-6 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <span>Tudo certo, começar!</span>
                                <CheckCircle className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Main Content (Preview Area) */}
            <div className="flex-1 w-full overflow-hidden relative">
                {/* Aqui renderizamos a WeekView. O ideal é que na WeekView possamos 
                    passar um prop `isReadonly` ou garantir que não tem sidebar lá, mas 
                    como criamos a página limpa, a tela já fica sem a sidebar do (app). */}
                <div className="h-full overflow-y-auto">
                    <ToastProvider>
                        <DailyPlanProvider>
                            <WeekView />
                        </DailyPlanProvider>
                    </ToastProvider>
                </div>

                {/* Blocker overlay so user can only *view* but not interact heavily yet 
                    (opcional, dependendo de quão interativa a preview é permitida ser) */}
                {/* <div className="absolute inset-0 z-40 bg-transparent" /> */}
            </div>

            {/* Mobile Bottom Bar */}
            <div className="md:hidden shrink-0 sticky bottom-0 z-50 p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-t border-zinc-200/50 dark:border-zinc-800/50">
                <button
                    onClick={handleConfirm}
                    disabled={isSaving}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-base transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                >
                    {isSaving ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <span>Tudo certo, começar!</span>
                            <CheckCircle className="w-5 h-5" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
