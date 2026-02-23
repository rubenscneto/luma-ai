"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    User, Target, Heart, Dumbbell, Moon, AlertTriangle,
    ChevronRight, Check, Loader2
} from 'lucide-react';
import { useHealth } from '@/context/healthContext';
import { HealthGoal, TrainingLevel } from '@/types';
import { cn } from '@/lib/utils';

interface Step {
    id: string;
    title: string;
    icon: React.ElementType;
}

const steps: Step[] = [
    { id: 'basic', title: 'Informações Básicas', icon: User },
    { id: 'goal', title: 'Seu Objetivo', icon: Target },
    { id: 'diet', title: 'Alimentação', icon: Heart },
    { id: 'fitness', title: 'Atividade Física', icon: Dumbbell },
    { id: 'sleep', title: 'Sono', icon: Moon },
];

const goalOptions: { value: HealthGoal; label: string; description: string }[] = [
    { value: 'energy', label: 'Mais Energia', description: 'Foco em hábitos que aumentam disposição' },
    { value: 'fitness', label: 'Condicionamento', description: 'Melhorar forma física e resistência' },
    { value: 'healthy_habits', label: 'Hábitos Saudáveis', description: 'Criar rotina equilibrada' },
    { value: 'sleep', label: 'Qualidade do Sono', description: 'Dormir melhor e acordar disposto' },
    { value: 'stress', label: 'Reduzir Estresse', description: 'Práticas de relaxamento e bem-estar' },
    { value: 'general', label: 'Bem-estar Geral', description: 'Um pouco de tudo' },
];

const dietaryOptions = [
    'Vegetariano', 'Vegano', 'Sem Glúten', 'Sem Lactose',
    'Low Carb', 'Mediterrânea', 'Sem Restrições'
];

const trainingOptions: { value: TrainingLevel; label: string }[] = [
    { value: 'beginner', label: 'Iniciante' },
    { value: 'intermediate', label: 'Intermediário' },
    { value: 'advanced', label: 'Avançado' },
];

const equipmentOptions = [
    'Nenhum', 'Halteres', 'Barras', 'Elásticos',
    'Bicicleta', 'Esteira', 'Academia Completa'
];

interface HealthOnboardingProps {
    onComplete?: () => void;
}

export function HealthOnboarding({ onComplete }: HealthOnboardingProps) {
    const { saveHealthProfile, isLoading } = useHealth();
    const [currentStep, setCurrentStep] = useState(0);

    // Form state
    const [heightCm, setHeightCm] = useState<number | undefined>();
    const [weightKg, setWeightKg] = useState<number | undefined>();
    const [goal, setGoal] = useState<HealthGoal>('general');
    const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
    const [allergiesRestrictions, setAllergiesRestrictions] = useState<string[]>([]);
    const [trainingLevel, setTrainingLevel] = useState<TrainingLevel>('beginner');
    const [equipment, setEquipment] = useState<string[]>([]);
    const [wakeTime, setWakeTime] = useState('07:00');
    const [sleepTime, setSleepTime] = useState('22:00');

    const toggleArrayItem = (arr: string[], setArr: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
        if (arr.includes(item)) {
            setArr(arr.filter(i => i !== item));
        } else {
            setArr([...arr, item]);
        }
    };

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = async () => {
        await saveHealthProfile({
            height_cm: heightCm,
            weight_kg: weightKg,
            goal,
            dietary_preferences: dietaryPreferences,
            allergies_restrictions: allergiesRestrictions,
            training_level: trainingLevel,
            equipment,
            wake_time: wakeTime,
            sleep_time: sleepTime,
        });
        // Call onComplete callback after successful save
        onComplete?.();
    };

    const renderStep = () => {
        switch (steps[currentStep].id) {
            case 'basic':
                return (
                    <div className="space-y-6">
                        <p className="text-muted">
                            Dados opcionais para personalizar suas sugestões.
                            Pule se preferir não informar.
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-muted mb-2">Altura (cm)</label>
                                <input
                                    type="number"
                                    value={heightCm || ''}
                                    onChange={e => setHeightCm(e.target.value ? Number(e.target.value) : undefined)}
                                    placeholder="175"
                                    className="w-full px-4 py-3 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-muted mb-2">Peso (kg)</label>
                                <input
                                    type="number"
                                    value={weightKg || ''}
                                    onChange={e => setWeightKg(e.target.value ? Number(e.target.value) : undefined)}
                                    placeholder="70"
                                    className="w-full px-4 py-3 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                                />
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-700 dark:text-amber-200">
                                Sugestões gerais apenas. Não substituem orientação profissional.
                            </p>
                        </div>
                    </div>
                );

            case 'goal':
                return (
                    <div className="space-y-4">
                        <p className="text-muted mb-4">
                            Qual seu principal objetivo de saúde e bem-estar?
                        </p>

                        <div className="space-y-3">
                            {goalOptions.map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => setGoal(option.value)}
                                    className={cn(
                                        "w-full p-4 rounded-xl border text-left transition-all",
                                        goal === option.value
                                            ? "bg-accent/20 border-accent"
                                            : "bg-foreground/5 border-foreground/10 hover:bg-foreground/10"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-foreground">{option.label}</p>
                                            <p className="text-sm text-muted">{option.description}</p>
                                        </div>
                                        {goal === option.value && (
                                            <Check className="w-5 h-5 text-accent" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                );

            case 'diet':
                return (
                    <div className="space-y-6">
                        <div>
                            <p className="text-muted mb-4">
                                Preferências alimentares (selecione todas que se aplicam)
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {dietaryOptions.map(option => (
                                    <button
                                        key={option}
                                        onClick={() => toggleArrayItem(dietaryPreferences, setDietaryPreferences, option)}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm transition-all",
                                            dietaryPreferences.includes(option)
                                                ? "bg-accent text-white"
                                                : "bg-foreground/10 text-muted hover:bg-foreground/20"
                                        )}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-muted mb-2">
                                Alergias ou restrições (separar por vírgula)
                            </label>
                            <input
                                type="text"
                                value={allergiesRestrictions.join(', ')}
                                onChange={e => setAllergiesRestrictions(
                                    e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                )}
                                placeholder="Ex: amendoim, frutos do mar"
                                className="w-full px-4 py-3 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                            />
                        </div>
                    </div>
                );

            case 'fitness':
                return (
                    <div className="space-y-6">
                        <div>
                            <p className="text-muted mb-4">Seu nível de atividade física</p>
                            <div className="grid grid-cols-3 gap-3">
                                {trainingOptions.map(option => (
                                    <button
                                        key={option.value}
                                        onClick={() => setTrainingLevel(option.value)}
                                        className={cn(
                                            "p-4 rounded-xl border text-center transition-all",
                                            trainingLevel === option.value
                                                ? "bg-accent border-accent text-white"
                                                : "bg-foreground/5 border-card-border text-muted hover:bg-foreground/10"
                                        )}
                                    >
                                        <div className="text-sm font-semibold">{option.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <p className="text-muted mb-4">Equipamentos disponíveis</p>
                            <div className="flex flex-wrap gap-2">
                                {equipmentOptions.map(option => (
                                    <button
                                        key={option}
                                        onClick={() => toggleArrayItem(equipment, setEquipment, option)}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm transition-all",
                                            equipment.includes(option)
                                                ? "bg-accent text-white"
                                                : "bg-foreground/10 text-muted hover:bg-foreground/20"
                                        )}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 'sleep':
                return (
                    <div className="space-y-6">
                        <p className="text-muted">
                            Seus horários ajudam a criar uma rotina equilibrada.
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-muted mb-2">Horário de acordar</label>
                                <input
                                    type="time"
                                    value={wakeTime}
                                    onChange={e => setWakeTime(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-muted mb-2">Horário de dormir</label>
                                <input
                                    type="time"
                                    value={sleepTime}
                                    onChange={e => setSleepTime(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                                />
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    const isLastStep = currentStep === steps.length - 1;

    return (
        <div className="max-w-2xl mx-auto">
            {/* Progress */}
            <div className="flex items-center justify-between mb-8">
                {steps.map((step, index) => {
                    const StepIcon = step.icon;
                    const isActive = index === currentStep;
                    const isComplete = index < currentStep;

                    return (
                        <React.Fragment key={step.id}>
                            <button
                                onClick={() => index < currentStep && setCurrentStep(index)}
                                className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                                    isActive
                                        ? "bg-accent text-white"
                                        : isComplete
                                            ? "bg-green-500/20 text-green-600 dark:text-green-400"
                                            : "bg-foreground/10 text-muted"
                                )}
                            >
                                {isComplete ? (
                                    <Check className="w-5 h-5" />
                                ) : (
                                    <StepIcon className="w-5 h-5" />
                                )}
                            </button>
                            {index < steps.length - 1 && (
                                <div className={cn(
                                    "h-0.5 flex-1 mx-2",
                                    index < currentStep ? "bg-accent" : "bg-foreground/10"
                                )} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Step content */}
            <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="mb-8"
            >
                <h2 className="text-2xl font-bold text-foreground mb-6">
                    {steps[currentStep].title}
                </h2>
                {renderStep()}
            </motion.div>

            {/* Navigation */}
            <div className="flex gap-3">
                {currentStep > 0 && (
                    <button
                        onClick={handleBack}
                        className="px-6 py-3 rounded-xl bg-foreground/10 text-foreground hover:bg-foreground/20 transition-colors"
                    >
                        Voltar
                    </button>
                )}

                <button
                    onClick={isLastStep ? handleSubmit : handleNext}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isLastStep ? (
                        'Salvar Perfil'
                    ) : (
                        <>
                            Próximo
                            <ChevronRight className="w-5 h-5" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
