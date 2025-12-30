"use client";

import React, { useState } from "react";
import { useRoutine } from "@/context/routineContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Loader2, Sparkles } from "lucide-react";

import { PersonalConfigStep } from "@/components/perdidao/PersonalConfigStep";
import { FixedTask } from "@/types";

const STEPS = [
    { id: 1, title: "O que você faz?", description: "Estudante, Profissional, Freelancer..." },
    { id: 2, title: "Pico de Produtividade", description: "Manhã, Tarde ou Noite?" },
    { id: 3, title: "Nível de Energia", description: "Como você costuma se sentir?" },
    { id: 4, title: "Configuração Pessoal", description: "Sono e Compromissos Fixos" }, // Updated Title
    { id: 5, title: "Estilo de Rotina", description: "Focada, Flexível, Equilibrada..." },
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

    // New state for personal config
    const [userSettings, setUserSettings] = useState({ wake_up_time: "07:00", bed_time: "23:00" });
    const [fixedTasks, setFixedTasks] = useState<FixedTask[]>([]);

    const handleNext = async () => {
        if (currentStep < 5) {
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
                    <PersonalConfigStep
                        initialSettings={{ user_id: '', ...userSettings }}
                        initialTasks={fixedTasks}
                        onNext={(settings, tasks) => {
                            setUserSettings({ wake_up_time: settings.wake_up_time, bed_time: settings.bed_time });
                            setFixedTasks(tasks);
                            setCurrentStep(5); // Auto advance handled by internal but here we update state. 
                            // Actually PersonalConfigStep calls onNext. We shouldn't auto advance here if the button inside it does it? 
                            // The PersonalConfigStep has a "Next" button. 
                            // Ideally, `PersonalConfigStep` should NOT have the next button if the parent controls navigation, 
                            // OR the parent should hide its navigation when on this step.
                            // Given the existing UI has navigation at the bottom, I should probably REMOVE the navigation buttonINSIDE PersonalConfigStep 
                            // and let the parent handle it. OR update PersonalConfigStep to just update state on change.
                            // Let's assume for now I will use the parent state.
                        }}
                    />
                );
            case 5:
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

    // Special case: Step 4 (PersonalConfigStep) has its own complex state.
    // To properly "Next" from parent, we need the state to be up to date.
    // I already lifted state (userSettings, fixedTasks).
    // The PersonalConfigStep component I wrote creates its own local state and only calls onNext on button click.
    // This is a bit conflicting with the parent's "Prior/Next" buttons at the bottom.
    // I should probably hide the parent's Next button on Step 4, OR update PersonalConfigStep to be controlled.
    // I'll make PersonalConfigStep accept `onChange` instead of `onNext` and remove its internal button.

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] max-w-2xl mx-auto">
            <div className="text-center mb-10 space-y-2">
                <h1 className="text-4xl font-bold">O Perdidão</h1>
                <p className="text-zinc-500">Vamos encontrar o seu caminho em 5 passos.</p>
            </div>

            <Card className="w-full p-8 shadow-xl border-zinc-200/60 dark:border-zinc-800">
                {/* Progress Bar ... */}
                <div className="mb-8">
                    <div className="flex justify-between items-center text-sm font-medium mb-4 text-zinc-400">
                        <span>Passo {currentStep} de 5</span>
                        <span>{Math.round((currentStep / 5) * 100)}%</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-black dark:bg-white"
                            initial={{ width: 0 }}
                            animate={{ width: `${(currentStep / 5) * 100}%` }}
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

                        {/* Custom render for Step 4 to pass props */}
                        {currentStep === 4 ? (
                            <PersonalConfigStep
                                initialSettings={{ user_id: '', ...userSettings }}
                                initialTasks={fixedTasks}
                                onNext={(settings, tasks) => {
                                    // This is acting as onChange in my modified logic plan
                                    setUserSettings({ wake_up_time: settings.wake_up_time, bed_time: settings.bed_time });
                                    setFixedTasks(tasks);
                                }}
                            // Note: I need to modify PersonalConfigStep to support 'controlled' mode or simply accept that I have two Next buttons?
                            // Let's hide the Parent Next button for step 4 if I use the child one.
                            // Or better: Modification of PersonalConfigStep to expose data to parent continuously (onChange).
                            />
                        ) : renderStep()}
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

                    {/* Hide Next button on Step 4 because the component has its own 'Next' (Wait, I should standardize) */}
                    {/* The cleaner UX is to having the main navigation controls at the bottom always. */}
                    {/* So I will refactor PersonalConfigStep to NOT have the button and just use useEffect to report changes up? */}
                    {/* OR I can keep the button in PersonalConfig and HIDE this one. */}

                    {currentStep !== 4 && (
                        <Button
                            onClick={handleNext}
                            disabled={loading}
                            className="min-w-[140px] flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : currentStep === 5 ? (
                                <>
                                    <Sparkles size={16} /> Gerar Rotina
                                </>
                            ) : (
                                <>
                                    Próximo <ArrowRight size={16} />
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
}
