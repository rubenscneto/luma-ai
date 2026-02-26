"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Loader2, FileText, Clock, Zap, CheckCircle, Calendar, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/authContext';
import { useRoutine } from '@/context/routineContext';
import { SleepCycleStep } from '@/components/perdidao/SleepCycleStep';
import { FixedTaskInput } from '@/components/perdidao/FixedTaskInput';
import { FixedTask } from '@/types';
import { toast } from 'sonner';

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface RoutineWizardProps {
    onComplete: () => void;
}

const STEPS = [
    {
        id: 1,
        title: "Sua Rotina em Palavras",
        subtitle: "Descreva como é o seu dia ou o que você gostaria que fosse. A Luma entende contexto pago e livre.",
        icon: FileText
    },
    {
        id: 2,
        title: "Horários e Energia",
        subtitle: "Como o seu relógio biológico funciona?",
        icon: Clock
    },
    {
        id: 3,
        title: "Compromissos Fixos",
        subtitle: "O que não pode mudar na sua semana?",
        icon: Calendar
    },
    {
        id: 4,
        title: "Revisão Final",
        subtitle: "Confirme seus dados antes da IA gerar a sua semana inteira.",
        icon: CheckCircle
    }
];

const ENERGY_PRESETS = [
    { label: "Madrugador", emoji: "🌅", value: "Manhã" },
    { label: "Constante", emoji: "⚡", value: "Constante" },
    { label: "Noturno", emoji: "🌙", value: "Noite" },
];

export function RoutineWizard({ onComplete }: RoutineWizardProps) {
    const { user } = useAuth();
    const { setProfile } = useRoutine();

    // Step State
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form Data
    const [description, setDescription] = useState("");
    const [userSettings, setUserSettings] = useState({ wake_up_time: "07:00", bed_time: "23:00" });
    const [peakProductivity, setPeakProductivity] = useState("Constante");
    const [fixedTasks, setFixedTasks] = useState<FixedTask[]>([]);

    const handleNext = async () => {
        if (currentStep < STEPS.length) {
            setCurrentStep(c => c + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            await handleSubmit();
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(c => c - 1);
        }
    };

    const handleSubmit = async () => {
        if (!user?.id) return;

        setIsSubmitting(true);
        const toastId = toast.loading("Configurando sua rotina base...");

        try {
            const profilePayload = {
                description,
                peakProductivity,
                fixedTasks,
                userSettings: { ...userSettings, user_id: user.id },
                energyLevel: peakProductivity,
                style: "Equilibrada", // default
                occupations: [],
                studyFocus: "",
                objectives: [],
                hobbies: []
            };

            // 1. Save onboarding profile
            const saveRes = await fetch('/api/ai/onboarding/save-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id, ...profilePayload }),
            });

            if (!saveRes.ok) throw new Error("Falha ao salvar o perfil");

            setProfile(profilePayload as any);
            toast.loading("Analisando perfil e criando sua semana ideal (Isso pode levar de 30 a 60 segundos)...", { id: toastId });

            // Calculate current week's Sunday for start_date
            const now = new Date();
            const dayOfWeek = now.getDay();
            const sunday = new Date(now);
            sunday.setDate(now.getDate() - dayOfWeek);
            const startDateStr = sunday.toISOString().split('T')[0];

            // 2. Automatically Plan Week
            const planRes = await fetch('/api/ai/agenda/plan-week', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'first_plan',
                    user_id: user.id,
                    start_date: startDateStr
                })
            });

            if (!planRes.ok) throw new Error("Falha ao planejar a semana com IA");

            toast.success("Rotina criada com sucesso!", { id: toastId });
            onComplete();

        } catch (error: any) {
            console.error("Failed to finish routine onboarding:", error);
            toast.error("Houve um erro técnico. Tente novamente.", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    const StepIcon = STEPS[currentStep - 1].icon;

    return (
        <div className="max-w-xl mx-auto">
            {/* Header & Progress */}
            <div className="mb-8 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Montar Minha Rotina Ideal</h1>
                    <p className="text-muted text-sm mt-1">Nós criamos sua base de hábitos através de IA.</p>
                </div>

                <div className="pt-4 max-w-sm mx-auto">
                    <div className="flex justify-between text-xs text-muted mb-2 font-medium">
                        <span>Passo {currentStep}</span>
                        <span>{Math.round((currentStep / STEPS.length) * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-foreground/10 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${(currentStep / STEPS.length) * 100}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </div>
            </div>

            {/* Step Content container */}
            <div className="bg-surface border border-card-border p-6 sm:p-8 rounded-2xl shadow-xl">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="min-h-[300px] flex flex-col"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <StepIcon className="w-5 h-5 text-purple-500" />
                            <h2 className="text-xl font-semibold text-foreground">
                                {STEPS[currentStep - 1].title}
                            </h2>
                        </div>
                        <p className="text-muted text-sm mb-8">
                            {STEPS[currentStep - 1].subtitle}
                        </p>

                        <div className="flex-1">
                            {currentStep === 1 && (
                                <div className="space-y-4 h-full">
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Ex: Sou estudante universitário, tenho aulas das 8h às 12h. Quero focar em programação Python a tarde por 2 horas e treinar musculação à noite. Preciso de pausas frequentes..."
                                        className="w-full h-48 p-4 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm placeholder:text-muted/50"
                                    />
                                    <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs">
                                        <Sparkles className="w-4 h-4" />
                                        <p>Seja o mais específico possível sobre seus desejos.</p>
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="space-y-8">
                                    <SleepCycleStep
                                        value={{ user_id: '', ...userSettings }}
                                        onChange={(settings) => setUserSettings({
                                            wake_up_time: settings.wake_up_time,
                                            bed_time: settings.bed_time,
                                        })}
                                    />

                                    <div>
                                        <h3 className="text-sm font-medium text-foreground mb-3">Pico de Energia</h3>
                                        <div className="grid grid-cols-3 gap-3">
                                            {ENERGY_PRESETS.map(opt => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => setPeakProductivity(opt.value)}
                                                    className={`p-3 rounded-xl border transition-all text-center flex flex-col items-center justify-center gap-1 ${peakProductivity === opt.value
                                                        ? 'bg-purple-100 dark:bg-purple-500/20 border-purple-500 text-purple-700 dark:text-purple-400'
                                                        : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                                                        }`}
                                                >
                                                    <span className="text-xl">{opt.emoji}</span>
                                                    <span className="text-xs font-medium">{opt.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="space-y-4 pb-12">
                                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl mb-4">
                                        <p className="text-sm text-purple-400">
                                            Adicione apenas os eventos inegociáveis. A IA planejará o resto ao redor deles.
                                        </p>
                                    </div>
                                    <FixedTaskInput
                                        tasks={fixedTasks}
                                        onChange={setFixedTasks}
                                    />
                                </div>
                            )}

                            {currentStep === 4 && (
                                <div className="space-y-6">
                                    <div className="p-4 rounded-xl bg-foreground/5 border border-card-border space-y-4">
                                        <div>
                                            <h4 className="text-xs font-semibold text-muted uppercase tracking-wide">Ritmo e Energia</h4>
                                            <p className="text-sm font-medium mt-1 text-foreground">
                                                Acorda às {userSettings.wake_up_time} | Dorme às {userSettings.bed_time} <br />
                                                Pico de energia: <span className="text-brand-primary">{peakProductivity}</span>
                                            </p>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-semibold text-muted uppercase tracking-wide">Compromissos Fixos</h4>
                                            {fixedTasks.length > 0 ? (
                                                <ul className="text-sm mt-1 space-y-1 text-foreground">
                                                    {fixedTasks.map((t, idx) => (
                                                        <li key={idx}>• {t.title} ({t.start_time} - {t.end_time}) - {t.days_of_week.map(d => DAYS[d]).join(', ')}</li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-sm mt-1 text-muted italic">Nenhum compromisso fixo.</p>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-semibold text-muted uppercase tracking-wide">Sobre sua rotina</h4>
                                            <p className="text-sm mt-1 text-foreground line-clamp-3">
                                                {description}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 flex gap-3 items-start">
                                        <Zap className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                                        <p className="text-sm text-purple-300">
                                            A IA vai cruzar essas instruções com os horários disponíveis para criar a semana perfeita pra você.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Footer Navigation */}
                <div className="flex items-center justify-between pt-6 mt-6 border-t border-card-border/50">
                    <button
                        onClick={handleBack}
                        className={`font-medium px-4 py-2 flex items-center gap-2 text-sm transition-colors ${currentStep === 1 ? 'opacity-0 pointer-events-none' : 'text-muted hover:text-foreground'
                            }`}
                    >
                        <ArrowLeft className="w-4 h-4" /> Voltar
                    </button>

                    <button
                        onClick={handleNext}
                        disabled={isSubmitting || (currentStep === 1 && description.trim().length < 10)}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 dark:bg-purple-500 text-white text-sm font-medium hover:bg-purple-700 dark:hover:bg-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processando...
                            </>
                        ) : currentStep === STEPS.length ? (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                Gerar minha agenda
                            </>
                        ) : (
                            <>
                                Próximo
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
