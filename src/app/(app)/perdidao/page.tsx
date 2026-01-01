"use client";

import React, { useState } from "react";
import { useRoutine } from "@/context/routineContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Loader2, Sparkles } from "lucide-react";

import { SleepCycleStep } from "@/components/perdidao/SleepCycleStep";
import { FixedTaskInput } from "@/components/perdidao/FixedTaskInput";
import { FixedTask } from "@/types";

const STEPS = [
    { id: 1, title: "O que você faz?", description: "Estudante, Profissional, Freelancer..." },
    { id: 2, title: "Pico de Produtividade", description: "Manhã, Tarde ou Noite?" },
    { id: 3, title: "Nível de Energia", description: "Como você costuma se sentir?" },
    { id: 4, title: "Ciclo de Sono", description: "Que horas seu dia começa e termina?" },
    { id: 5, title: "Compromissos Fixos", description: "Trabalho, Aulas, Treinos..." },
    { id: 6, title: "Estilo de Rotina", description: "Focada, Flexível, Equilibrada..." },
];

export default function PerdidaoPage() {
    const router = useRouter();
    const { setRoutine, setProfile } = useRoutine();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        occupation: "",
        peakProductivity: "",
        energyLevel: "",
        style: "",
    });

    const [userSettings, setUserSettings] = useState({ wake_up_time: "07:00", bed_time: "23:00" });
    const [fixedTasks, setFixedTasks] = useState<FixedTask[]>([]);

    const handleNext = async () => {
        if (currentStep < 6) {
            setCurrentStep(c => c + 1);
        } else {
            // Submit
            setLoading(true);
            try {
                // Save profile
                const profile = {
                    ...formData,
                    fixedTasks,
                    userSettings: { ...userSettings, user_id: '' },
                    style: formData.style as any
                };
                setProfile(profile);

                // Generate routine
                const res = await fetch("/api/rotina", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(profile),
                });
                const data = await res.json();

                if (data.routine) {
                    setRoutine(data.routine);
                    router.push("/agenda");
                }
            } catch (error) {
                console.error("Failed to generate routine", error);
                alert("Erro ao gerar rotina. Tente novamente.");
            } finally {
                setLoading(false);
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(c => c - 1);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <Input
                        name="occupation"
                        placeholder="Ex: Desenvolvedor Senior"
                        value={formData.occupation}
                        onChange={handleChange}
                        autoFocus
                    />
                );
            case 2:
                // ... same as before
                return (
                    <div className="grid grid-cols-3 gap-3">
                        {["Manhã", "Tarde", "Noite"].map(opt => (
                            <button
                                key={opt}
                                onClick={() => setFormData(prev => ({ ...prev, peakProductivity: opt }))}
                                className={`p-4 rounded-xl border transition-all ${formData.peakProductivity === opt ? 'bg-black text-white border-black dark:bg-white dark:text-black' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                );
            case 3:
                return (
                    <Input
                        name="energyLevel"
                        placeholder="Ex: Alto pela manhã, baixo pós almoço"
                        value={formData.energyLevel}
                        onChange={handleChange}
                    />
                );
            case 4:
                return (
                    <SleepCycleStep
                        value={{ user_id: '', ...userSettings }}
                        onChange={(settings) => setUserSettings({ wake_up_time: settings.wake_up_time, bed_time: settings.bed_time })}
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
                    <div className="grid grid-cols-3 gap-3">
                        {["Focada", "Equilibrada", "Relaxada"].map(opt => (
                            <button
                                key={opt}
                                onClick={() => setFormData(prev => ({ ...prev, style: opt }))}
                                className={`p-4 rounded-xl border transition-all ${formData.style === opt ? 'bg-black text-white border-black dark:bg-white dark:text-black' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] max-w-2xl mx-auto">
            <div className="text-center mb-10 space-y-2">
                <h1 className="text-4xl font-bold">O Perdidão</h1>
                <p className="text-zinc-500">Vamos encontrar o seu caminho em 6 passos.</p>
            </div>

            <Card className="w-full p-8 shadow-xl border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-black/50">
                {/* Progress Bar ... */}
                <div className="mb-8">
                    <div className="flex justify-between items-center text-sm font-medium mb-4 text-zinc-400">
                        <span>Passo {currentStep} de 6</span>
                        <span>{Math.round((currentStep / 6) * 100)}%</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-black dark:bg-white"
                            initial={{ width: 0 }}
                            animate={{ width: `${(currentStep / 6) * 100}%` }}
                        />
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="mb-8 min-h-[120px]"
                    >
                        <h2 className="text-2xl font-semibold mb-2">{STEPS[currentStep - 1].title}</h2>
                        <p className="text-zinc-500 mb-6">{STEPS[currentStep - 1].description}</p>

                        {renderStep()}

                    </motion.div>
                </AnimatePresence>

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                    <Button
                        variant="ghost"
                        onClick={handleBack}
                        disabled={currentStep === 1 || loading}
                        className="flex items-center gap-2"
                    >
                        <ArrowLeft size={16} /> Voltar
                    </Button>

                    <Button
                        onClick={handleNext}
                        disabled={loading}
                        className="min-w-[140px] flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : currentStep === 6 ? (
                            <>
                                <Sparkles size={16} /> Gerar Rotina
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
