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
    const [showRegenerateModal, setShowRegenerateModal] = useState(false);
    const [userFeedback, setUserFeedback] = useState('');
    const [isRegenerating, setIsRegenerating] = useState(false);

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

    const handleRegenerate = async () => {
        if (!user || !userFeedback.trim()) return;
        setIsRegenerating(true);

        try {
            // Monday of current week for testing/generation sync
            const today = new Date();
            const day = today.getDay();
            const diff = today.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(today.setDate(diff));
            const start_date = monday.toISOString().split('T')[0];

            const response = await fetch('/api/ai/agenda/plan-week', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    start_date,
                    action: 'replan_with_feedback',
                    user_feedback: userFeedback
                })
            });

            if (response.ok) {
                setShowRegenerateModal(false);
                setUserFeedback('');
                // Força o reload da página para a WeekView pegar os novos dados
                window.location.reload();
            } else {
                console.error("Erro ao regerar");
            }
        } catch (error) {
            console.error("Erro na requisição", error);
        } finally {
            setIsRegenerating(false);
        }
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

                    <div className="hidden md:flex items-center gap-3">
                        <button
                            onClick={() => setShowRegenerateModal(true)}
                            disabled={isSaving || isRegenerating}
                            className="px-6 py-2.5 rounded-full bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-sm transition-all shadow border border-zinc-200 dark:border-zinc-700 disabled:opacity-50"
                        >
                            Alterar IA
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isSaving || isRegenerating}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50"
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
            <div className="md:hidden shrink-0 sticky bottom-0 z-50 p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-t border-zinc-200/50 dark:border-zinc-800/50 flex gap-3">
                <button
                    onClick={() => setShowRegenerateModal(true)}
                    disabled={isSaving || isRegenerating}
                    className="flex-1 flex items-center justify-center py-3.5 rounded-2xl bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-base transition-all shadow border border-zinc-200 dark:border-zinc-700 disabled:opacity-50"
                >
                    Alterar IA
                </button>
                <button
                    onClick={handleConfirm}
                    disabled={isSaving || isRegenerating}
                    className="flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-base transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                >
                    {isSaving ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <span>Começar!</span>
                            <CheckCircle className="w-5 h-5" />
                        </>
                    )}
                </button>
            </div>

            {/* Modal de Regeneração */}
            {showRegenerateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl border border-zinc-200 dark:border-zinc-800">
                        <h3 className="text-xl font-bold mb-4">O que a IA deve corrigir?</h3>
                        <p className="text-sm text-zinc-500 mb-4">
                            Descreva o que não ficou bom. ("Tire os momentos de leitura", "Coloque almoço às 14h")
                        </p>
                        <textarea
                            value={userFeedback}
                            onChange={e => setUserFeedback(e.target.value)}
                            className="w-full h-32 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-purple-500 resize-none mb-4 text-sm"
                            placeholder="Sua instrução para a IA..."
                        />
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowRegenerateModal(false)}
                                disabled={isRegenerating}
                                className="px-5 py-2.5 rounded-xl font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleRegenerate}
                                disabled={isRegenerating || !userFeedback.trim()}
                                className="px-5 py-2.5 rounded-xl font-semibold bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                            >
                                {isRegenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                Refazer Agenda
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
