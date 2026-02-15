"use client";

import React, { useState } from "react";
import { useRoutine } from "@/context/routineContext";
import { useAuth } from "@/context/authContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Loader2, Sparkles, Target, Clock, Zap, Calendar, Brain, Heart, Palette, CheckCircle } from "lucide-react";
import { toast } from "sonner";

import { SleepCycleStep } from "@/components/perdidao/SleepCycleStep";
import { FixedTaskInput } from "@/components/perdidao/FixedTaskInput";
import { FixedTask } from "@/types";

interface ABBlock {
    title: string;
    category: string;
    start_time: string;
    end_time: string;
}

interface ABDay {
    day: string;
    blocks: ABBlock[];
}

interface ABPlan {
    name: string;
    description: string;
    days: ABDay[];
}

const STEPS = [
    { id: 1, title: "Quem é você?", description: "Nos conte sobre sua ocupação.", icon: Brain },
    { id: 2, title: "Pico de Energia", description: "Quando você é mais produtivo?", icon: Zap },
    { id: 3, title: "Nível de Energia", description: "Como sua energia varia durante o dia?", icon: Target },
    { id: 4, title: "Ciclo de Sono", description: "Configure seu horário de dormir e acordar.", icon: Clock },
    { id: 5, title: "Compromissos Fixos", description: "Trabalho, aulas, reuniões recorrentes.", icon: Calendar },
    { id: 6, title: "Seus Objetivos", description: "O que você quer conquistar?", icon: Target },
    { id: 7, title: "Hobbies & Lazer", description: "O que te faz feliz no tempo livre?", icon: Heart },
    { id: 8, title: "Estilo de Rotina", description: "Como é a rotina ideal para você?", icon: Palette },
];

const OCCUPATION_SUGGESTIONS = [
    "Estudante", "Desenvolvedor", "Designer", "Gestor", "Médico",
    "Engenheiro", "Professor", "Freelancer", "Empreendedor", "Outro"
];

const ENERGY_PRESETS = [
    { label: "Madrugador", emoji: "🌅", desc: "Alto pela manhã, cai à tarde", value: "Manhã" },
    { label: "Constante", emoji: "⚡", desc: "Energia estável o dia todo", value: "Constante" },
    { label: "Noturno", emoji: "🌙", desc: "Produtivo à noite", value: "Noite" },
];

const OBJECTIVE_OPTIONS = [
    { label: "Ser mais produtivo", emoji: "🚀" },
    { label: "Ter mais tempo livre", emoji: "⏰" },
    { label: "Melhorar a saúde", emoji: "💪" },
    { label: "Aprender algo novo", emoji: "📚" },
    { label: "Reduzir estresse", emoji: "🧘" },
    { label: "Organizar a vida", emoji: "📋" },
    { label: "Focar na carreira", emoji: "💼" },
    { label: "Equilibrar trabalho e vida", emoji: "⚖️" },
];

const HOBBY_OPTIONS = [
    { label: "Leitura", emoji: "📖" },
    { label: "Exercícios", emoji: "🏋️" },
    { label: "Jogos", emoji: "🎮" },
    { label: "Música", emoji: "🎵" },
    { label: "Filmes/Séries", emoji: "🎬" },
    { label: "Cozinhar", emoji: "🍳" },
    { label: "Meditação", emoji: "🧘" },
    { label: "Passeios", emoji: "🌿" },
    { label: "Redes Sociais", emoji: "📱" },
    { label: "Artesanato", emoji: "🎨" },
    { label: "Esportes", emoji: "⚽" },
    { label: "Voluntariado", emoji: "🤝" },
];

const STYLE_OPTIONS = [
    { label: "Focada", emoji: "🎯", desc: "Blocos longos de concentração" },
    { label: "Equilibrada", emoji: "⚖️", desc: "Mix de foco e pausas" },
    { label: "Relaxada", emoji: "🌊", desc: "Mais flexibilidade e lazer" },
];

export default function MeuPlanejadorPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { setRoutine, setProfile } = useRoutine();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        occupation: "",
        peakProductivity: "",
        energyLevel: "",
        style: "",
    });
    const [objectives, setObjectives] = useState<string[]>([]);
    const [hobbies, setHobbies] = useState<string[]>([]);
    const [userSettings, setUserSettings] = useState({ wake_up_time: "07:00", bed_time: "23:00" });
    const [fixedTasks, setFixedTasks] = useState<FixedTask[]>([]);

    // A/B plan state
    const [abPlans, setAbPlans] = useState<{ planA: ABPlan | null; planB: ABPlan | null }>({ planA: null, planB: null });
    const [showABPreview, setShowABPreview] = useState(false);
    const [selectedPlanKey, setSelectedPlanKey] = useState<'A' | 'B' | null>(null);
    const [savingPlan, setSavingPlan] = useState(false);

    const totalSteps = STEPS.length;

    const handleNext = async () => {
        if (currentStep < totalSteps) {
            setCurrentStep(c => c + 1);
        } else {
            // Final submit — generate A/B plans
            setLoading(true);
            try {
                const profile = {
                    ...formData,
                    fixedTasks,
                    objectives,
                    hobbies,
                    userSettings: { ...userSettings, user_id: user?.id || '' },
                    style: formData.style as any,
                };
                setProfile(profile);

                // Save onboarding data (optional)
                if (user?.id) {
                    fetch('/api/ai/onboarding/save-profile', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: user.id, ...profile }),
                    }).catch(() => { });
                }

                // Generate two plans from the routine API
                const [resA, resB] = await Promise.all([
                    fetch("/api/rotina", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ ...profile, planStyle: 'focused' }),
                    }),
                    fetch("/api/rotina", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ ...profile, planStyle: 'balanced' }),
                    }),
                ]);

                const dataA = await resA.json();
                const dataB = await resB.json();

                // Build A/B plan structures from routine responses
                const buildPlan = (data: any, name: string, desc: string): ABPlan => {
                    const routine = data.routine || data;
                    const days: ABDay[] = [];
                    if (Array.isArray(routine)) {
                        // If routine is array of blocks
                        const dayMap: Record<string, ABBlock[]> = {};
                        routine.forEach((item: any) => {
                            const day = item.day || item.dia || 'Seg';
                            if (!dayMap[day]) dayMap[day] = [];
                            dayMap[day].push({
                                title: item.title || item.titulo || item.activity,
                                category: item.category || item.categoria || 'personal',
                                start_time: item.start_time || item.inicio || item.start || '08:00',
                                end_time: item.end_time || item.fim || item.end || '09:00',
                            });
                        });
                        Object.entries(dayMap).forEach(([day, blocks]) => {
                            days.push({ day, blocks: blocks.sort((a, b) => a.start_time.localeCompare(b.start_time)) });
                        });
                    } else if (typeof routine === 'object') {
                        // If routine is { [day]: [...blocks] }
                        Object.entries(routine).forEach(([day, blocks]: [string, any]) => {
                            if (Array.isArray(blocks)) {
                                days.push({
                                    day,
                                    blocks: blocks.map((b: any) => ({
                                        title: b.title || b.titulo || b.activity,
                                        category: b.category || b.categoria || 'personal',
                                        start_time: b.start_time || b.inicio || b.start || '08:00',
                                        end_time: b.end_time || b.fim || b.end || '09:00',
                                    })).sort((a: ABBlock, b: ABBlock) => a.start_time.localeCompare(b.start_time)),
                                });
                            }
                        });
                    }
                    return { name, description: desc, days: days.length > 0 ? days : [{ day: 'Seg', blocks: [{ title: 'Bloco de exemplo', category: 'work', start_time: '09:00', end_time: '10:00' }] }] };
                };

                setAbPlans({
                    planA: buildPlan(dataA, '🎯 Plano Focado', 'Blocos longos de concentração com menos interrupções'),
                    planB: buildPlan(dataB, '⚖️ Plano Equilibrado', 'Mix de foco, pausas e tempo livre ao longo do dia'),
                });
                setShowABPreview(true);
                toast.success("2 planos gerados! Escolha o que mais combina com você.");
            } catch (error) {
                console.error("Failed to generate plans", error);
                toast.error("Erro ao gerar planos. Tente novamente.");
            } finally {
                setLoading(false);
            }
        }
    };

    const handleSelectPlan = async (planKey: 'A' | 'B') => {
        setSavingPlan(true);
        setSelectedPlanKey(planKey);
        try {
            const plan = planKey === 'A' ? abPlans.planA : abPlans.planB;
            if (!plan) return;

            // Save as routine
            setRoutine(plan.days as any);
            toast.success(`${plan.name} selecionado! Redirecionando para a agenda...`);
            setTimeout(() => router.push("/agenda"), 500);
        } catch (error) {
            console.error('Failed to save plan:', error);
            toast.error('Erro ao salvar plano.');
        } finally {
            setSavingPlan(false);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(c => c - 1);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const StepIcon = STEPS[currentStep - 1].icon;

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-4">
                        <Input
                            name="occupation"
                            placeholder="Ex: Desenvolvedor Senior, Estudante de Medicina..."
                            value={formData.occupation}
                            onChange={handleChange}
                            autoFocus
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                        />
                        <div className="flex flex-wrap gap-2">
                            {OCCUPATION_SUGGESTIONS.map(occ => (
                                <button
                                    key={occ}
                                    onClick={() => setFormData(prev => ({ ...prev, occupation: occ }))}
                                    className={`px-3 py-1.5 text-sm rounded-full border transition-all ${formData.occupation === occ
                                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                                        : 'border-white/10 text-white/50 hover:text-white hover:border-white/20'
                                        }`}
                                >
                                    {occ}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="grid grid-cols-3 gap-4">
                        {ENERGY_PRESETS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setFormData(prev => ({ ...prev, peakProductivity: opt.value }))}
                                className={`p-5 rounded-xl border transition-all text-center ${formData.peakProductivity === opt.value
                                    ? 'bg-purple-500/20 border-purple-500/50 ring-1 ring-purple-500/30'
                                    : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                                    }`}
                            >
                                <div className="text-2xl mb-2">{opt.emoji}</div>
                                <div className="text-sm font-medium text-white">{opt.label}</div>
                                <div className="text-xs text-white/40 mt-1">{opt.desc}</div>
                            </button>
                        ))}
                    </div>
                );
            case 3:
                return (
                    <Input
                        name="energyLevel"
                        placeholder="Ex: Alto pela manhã, baixo pós almoço, melhora à noite"
                        value={formData.energyLevel}
                        onChange={handleChange}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                );
            case 4:
                return (
                    <SleepCycleStep
                        value={{ user_id: '', ...userSettings }}
                        onChange={(settings) => setUserSettings({
                            wake_up_time: settings.wake_up_time,
                            bed_time: settings.bed_time,
                        })}
                    />
                );
            case 5:
                return (
                    <FixedTaskInput
                        tasks={fixedTasks}
                        onChange={setFixedTasks}
                    />
                );
            case 6:
                return (
                    <div className="grid grid-cols-2 gap-3">
                        {OBJECTIVE_OPTIONS.map(opt => (
                            <button
                                key={opt.label}
                                onClick={() => {
                                    if (objectives.includes(opt.label)) {
                                        setObjectives(prev => prev.filter(o => o !== opt.label));
                                    } else {
                                        setObjectives(prev => [...prev, opt.label]);
                                    }
                                }}
                                className={`p-4 rounded-xl border transition-all text-left flex items-center gap-3 ${objectives.includes(opt.label)
                                    ? 'bg-purple-500/20 border-purple-500/50 ring-1 ring-purple-500/30'
                                    : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                                    }`}
                            >
                                <span className="text-xl">{opt.emoji}</span>
                                <span className="text-sm font-medium text-white">{opt.label}</span>
                            </button>
                        ))}
                    </div>
                );
            case 7:
                return (
                    <div className="grid grid-cols-3 gap-3">
                        {HOBBY_OPTIONS.map(opt => (
                            <button
                                key={opt.label}
                                onClick={() => {
                                    if (hobbies.includes(opt.label)) {
                                        setHobbies(prev => prev.filter(h => h !== opt.label));
                                    } else {
                                        setHobbies(prev => [...prev, opt.label]);
                                    }
                                }}
                                className={`p-3 rounded-xl border transition-all text-center ${hobbies.includes(opt.label)
                                    ? 'bg-purple-500/20 border-purple-500/50 ring-1 ring-purple-500/30'
                                    : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                                    }`}
                            >
                                <div className="text-xl mb-1">{opt.emoji}</div>
                                <div className="text-xs text-white/70">{opt.label}</div>
                            </button>
                        ))}
                    </div>
                );
            case 8:
                return (
                    <div className="grid grid-cols-3 gap-4">
                        {STYLE_OPTIONS.map(opt => (
                            <button
                                key={opt.label}
                                onClick={() => setFormData(prev => ({ ...prev, style: opt.label }))}
                                className={`p-5 rounded-xl border transition-all text-center ${formData.style === opt.label
                                    ? 'bg-purple-500/20 border-purple-500/50 ring-1 ring-purple-500/30'
                                    : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                                    }`}
                            >
                                <div className="text-2xl mb-2">{opt.emoji}</div>
                                <div className="text-sm font-medium text-white">{opt.label}</div>
                                <div className="text-xs text-white/40 mt-1">{opt.desc}</div>
                            </button>
                        ))}
                    </div>
                );
            default:
                return null;
        }
    };

    // A/B Plan Preview Screen
    if (showABPreview) {
        const categoryColors: Record<string, string> = {
            work: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
            study: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
            health: 'bg-red-500/20 text-red-300 border-red-500/30',
            personal: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
            leisure: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
            sleep: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
            meal: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
        };

        const renderPlanCard = (plan: ABPlan | null, key: 'A' | 'B') => {
            if (!plan) return null;
            const isSelected = selectedPlanKey === key;
            return (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: key === 'A' ? 0 : 0.15 }}
                    className={`flex-1 min-w-[280px] border rounded-xl p-5 cursor-pointer transition-all ${isSelected
                        ? 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/30'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                    onClick={() => !savingPlan && setSelectedPlanKey(key)}
                >
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                        {isSelected && <CheckCircle className="w-5 h-5 text-purple-400" />}
                    </div>
                    <p className="text-sm text-white/40 mb-4">{plan.description}</p>

                    {/* Day preview - show first 3 days */}
                    <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-thin">
                        {plan.days.slice(0, 3).map((day, di) => (
                            <div key={di}>
                                <p className="text-xs font-medium text-white/50 mb-1.5">{day.day}</p>
                                <div className="space-y-1">
                                    {day.blocks.slice(0, 5).map((block, bi) => (
                                        <div key={bi} className={`flex items-center gap-2 px-2 py-1 rounded text-xs border ${categoryColors[block.category] || 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30'}`}>
                                            <span className="text-[10px] font-mono opacity-60">{block.start_time}</span>
                                            <span className="truncate">{block.title}</span>
                                        </div>
                                    ))}
                                    {day.blocks.length > 5 && (
                                        <p className="text-[10px] text-white/30 pl-2">+{day.blocks.length - 5} mais</p>
                                    )}
                                </div>
                            </div>
                        ))}
                        {plan.days.length > 3 && (
                            <p className="text-xs text-white/30 text-center">+{plan.days.length - 3} dias</p>
                        )}
                    </div>

                    <div className="mt-4 text-center">
                        <p className="text-xs text-white/30">
                            {plan.days.reduce((acc, d) => acc + d.blocks.length, 0)} blocos · {plan.days.length} dias
                        </p>
                    </div>
                </motion.div>
            );
        };

        return (
            <div className="flex flex-col items-center min-h-[80vh] max-w-4xl mx-auto px-4 pt-8">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mb-8 space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                        <Calendar className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Escolha Seu Plano Semanal</h1>
                    <p className="text-white/40">Compare as duas opções e selecione a que mais combina com você.</p>
                </motion.div>

                <div className="flex flex-col sm:flex-row gap-4 w-full mb-8">
                    {renderPlanCard(abPlans.planA, 'A')}
                    {renderPlanCard(abPlans.planB, 'B')}
                </div>

                <div className="flex gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => { setShowABPreview(false); setSelectedPlanKey(null); }}
                        disabled={savingPlan}
                        className="text-white/60 hover:text-white"
                    >
                        <ArrowLeft size={16} className="mr-2" /> Voltar
                    </Button>
                    <Button
                        onClick={() => selectedPlanKey && handleSelectPlan(selectedPlanKey)}
                        disabled={!selectedPlanKey || savingPlan}
                        className="min-w-[200px] bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-0"
                    >
                        {savingPlan ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <><Sparkles size={16} className="mr-2" /> Ativar Plano Selecionado</>
                        )}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] max-w-2xl mx-auto px-4">
            {/* Header */}
            <div className="text-center mb-10 space-y-3">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-4"
                >
                    <Sparkles className="w-8 h-8 text-white" />
                </motion.div>
                <h1 className="text-3xl font-bold text-white">Meu Planejador</h1>
                <p className="text-white/50">Configure seu perfil em {totalSteps} passos para uma rotina personalizada.</p>
            </div>

            <Card className="w-full p-8 shadow-xl border-white/10 bg-white/5 backdrop-blur-sm">
                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex justify-between items-center text-sm font-medium mb-4 text-white/40">
                        <div className="flex items-center gap-2">
                            <StepIcon className="w-4 h-4 text-purple-400" />
                            <span>Passo {currentStep} de {totalSteps}</span>
                        </div>
                        <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="mb-8 min-h-[160px]"
                    >
                        <h2 className="text-2xl font-semibold mb-2 text-white">{STEPS[currentStep - 1].title}</h2>
                        <p className="text-white/40 mb-6">{STEPS[currentStep - 1].description}</p>

                        {renderStep()}
                    </motion.div>
                </AnimatePresence>

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
                    <Button
                        variant="ghost"
                        onClick={handleBack}
                        disabled={currentStep === 1 || loading}
                        className="flex items-center gap-2 text-white/60 hover:text-white"
                    >
                        <ArrowLeft size={16} /> Voltar
                    </Button>

                    <Button
                        onClick={handleNext}
                        disabled={loading}
                        className="min-w-[160px] flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-0"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : currentStep === totalSteps ? (
                            <>
                                <Sparkles size={16} /> Gerar Planos A/B
                            </>
                        ) : (
                            <>
                                Próximo <ArrowRight size={16} />
                            </>
                        )}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
