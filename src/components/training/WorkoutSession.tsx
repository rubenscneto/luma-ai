"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Dumbbell, Plus, Check, X, Clock, Flame,
    ChevronDown, ChevronUp, Loader2, Target
} from 'lucide-react';
import { useTraining } from '@/context/trainingContext';
import { TrainingPlanDay, WorkoutExercise, WorkoutSet } from '@/types';

interface WorkoutSessionProps {
    dayPlan: TrainingPlanDay;
    onComplete: () => void;
    onCancel: () => void;
}

export default function WorkoutSession({ dayPlan, onComplete, onCancel }: WorkoutSessionProps) {
    const {
        activeSession, sessionSets, logSet, completeSession, cancelSession,
        isLoading, personalRecords, progressions
    } = useTraining();
    const [expandedExercise, setExpandedExercise] = useState<string | null>(dayPlan.workout[0]?.exerciseId || null);
    const [setForm, setSetForm] = useState<{ weight: string; reps: string; rest: string; rpe: string }>({
        weight: '', reps: '', rest: '60', rpe: '',
    });

    const exerciseProgress = useMemo(() => {
        const map: Record<string, WorkoutSet[]> = {};
        for (const s of sessionSets) {
            if (!map[s.exercise_id]) map[s.exercise_id] = [];
            map[s.exercise_id].push(s);
        }
        return map;
    }, [sessionSets]);

    const totalVolume = useMemo(() => {
        return sessionSets.reduce((sum, s) => sum + (s.weight_kg || 0) * (s.reps || 0), 0);
    }, [sessionSets]);

    const handleLogSet = async (exercise: WorkoutExercise) => {
        if (!setForm.weight || !setForm.reps) return;

        const setsForExercise = exerciseProgress[exercise.exerciseId] || [];
        const setNumber = setsForExercise.length + 1;

        await logSet(exercise.exerciseId, exercise.name, setNumber, {
            weightKg: parseFloat(setForm.weight),
            reps: parseInt(setForm.reps),
            restSec: setForm.rest ? parseInt(setForm.rest) : undefined,
            rpe: setForm.rpe ? parseInt(setForm.rpe) : undefined,
        });

        setSetForm(prev => ({ ...prev, reps: '', rpe: '' }));
    };

    const handleComplete = async () => {
        await completeSession();
        onComplete();
    };

    const allExercisesDone = dayPlan.workout.every(ex => {
        const sets = exerciseProgress[ex.exerciseId] || [];
        return sets.length >= ex.setsTarget;
    });

    return (
        <div className="space-y-4">
            {/* Session Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-foreground">Treino: {dayPlan.focus}</h3>
                    <p className="text-xs text-muted">
                        {dayPlan.workout.length} exercícios • Volume: {totalVolume.toFixed(0)} kg
                    </p>
                </div>
                <button
                    onClick={async () => { await cancelSession(); onCancel(); }}
                    className="p-2 rounded-lg hover:bg-foreground/10 text-muted"
                    title="Cancelar"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Exercise List */}
            <div className="space-y-3">
                {dayPlan.workout.map((exercise) => {
                    const sets = exerciseProgress[exercise.exerciseId] || [];
                    const isDone = sets.length >= exercise.setsTarget;
                    const isExpanded = expandedExercise === exercise.exerciseId;

                    return (
                        <motion.div
                            key={exercise.exerciseId}
                            layout
                            className={`rounded-2xl border overflow-hidden transition-colors ${isDone
                                ? 'bg-green-500/10 border-green-500/20'
                                : isExpanded
                                    ? 'bg-foreground/10 border-foreground/20'
                                    : 'bg-foreground/5 border-foreground/10'
                                }`}
                        >
                            {/* Exercise Header */}
                            <button
                                onClick={() => setExpandedExercise(isExpanded ? null : exercise.exerciseId)}
                                className="w-full flex items-center justify-between p-4"
                            >
                                <div className="flex items-center gap-3">
                                    {isDone ? (
                                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                            <Check className="w-4 h-4 text-green-400" />
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                            <Dumbbell className="w-4 h-4 text-blue-400" />
                                        </div>
                                    )}
                                    <div className="text-left">
                                        <p className="text-left py-0.5">
                                            <span className={`text-sm font-medium ${isDone ? 'text-green-600 dark:text-green-300' : 'text-foreground'}`}>
                                                {exercise.name}
                                            </span>
                                            {personalRecords[exercise.exerciseId] && (
                                                <span className="ml-2 px-1.5 py-0.5 rounded-md bg-purple-500/10 text-[10px] text-purple-400 border border-purple-500/20">
                                                    PR: {personalRecords[exercise.exerciseId]}kg
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-xs text-muted">
                                            {exercise.machineOrType} • {exercise.setsTarget}x{exercise.repsTarget} • {exercise.restSecTarget}s desc
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted">
                                        {sets.length}/{exercise.setsTarget}
                                    </span>
                                    {isExpanded ? (
                                        <ChevronUp className="w-4 h-4 text-muted" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-muted" />
                                    )}
                                </div>
                            </button>

                            {/* Expanded: Sets Log */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-white/10"
                                    >
                                        <div className="p-4 space-y-3">
                                            {/* Previous sets */}
                                            {sets.length > 0 && (
                                                <div className="space-y-1">
                                                    {sets.map((s) => (
                                                        <div key={s.id} className="flex items-center gap-3 text-sm">
                                                            <span className="text-muted w-16">Série {s.set_number}</span>
                                                            <span className="text-foreground">{s.weight_kg}kg</span>
                                                            <span className="text-muted">×</span>
                                                            <span className="text-foreground">{s.reps} reps</span>
                                                            {s.rpe && (
                                                                <span className="text-orange-600 dark:text-orange-400 text-xs">RPE {s.rpe}</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* New Set Form */}
                                            {!isDone && (
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-xs text-muted">
                                                            Série {sets.length + 1} de {exercise.setsTarget}
                                                        </p>
                                                        {progressions.find(p => p.exerciseName === exercise.name) && (
                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                                                <Target className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                                                <span className="text-[10px] text-blue-700 dark:text-blue-300 font-medium">Meta: {progressions.find(p => p.exerciseName === exercise.name)?.detail}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        <div>
                                                            <label className="text-[10px] text-muted">Peso (kg)</label>
                                                            <input
                                                                type="number"
                                                                value={setForm.weight}
                                                                onChange={e => setSetForm(f => ({ ...f, weight: e.target.value }))}
                                                                placeholder="0"
                                                                className="w-full px-2 py-2 rounded-lg bg-input border border-input-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-muted">Reps</label>
                                                            <input
                                                                type="number"
                                                                value={setForm.reps}
                                                                onChange={e => setSetForm(f => ({ ...f, reps: e.target.value }))}
                                                                placeholder="0"
                                                                className="w-full px-2 py-2 rounded-lg bg-input border border-input-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-muted">Desc (s)</label>
                                                            <input
                                                                type="number"
                                                                value={setForm.rest}
                                                                onChange={e => setSetForm(f => ({ ...f, rest: e.target.value }))}
                                                                placeholder="60"
                                                                className="w-full px-2 py-2 rounded-lg bg-input border border-input-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-muted">RPE</label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max="10"
                                                                value={setForm.rpe}
                                                                onChange={e => setSetForm(f => ({ ...f, rpe: e.target.value }))}
                                                                placeholder="7"
                                                                className="w-full px-2 py-2 rounded-lg bg-input border border-input-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                                                            />
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleLogSet(exercise)}
                                                        disabled={!setForm.weight || !setForm.reps}
                                                        className="w-full flex items-center justify-center gap-2 py-2 bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-300 text-sm font-medium hover:bg-blue-500/30 disabled:opacity-30 transition-colors"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                        Registrar Série
                                                    </button>
                                                </div>
                                            )}

                                            {exercise.notes && (
                                                <p className="text-xs text-muted italic">💡 {exercise.notes}</p>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>

            {/* Complete Session Button */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleComplete}
                disabled={isLoading || sessionSets.length === 0}
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-medium transition-all ${allExercisesDone
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                    : 'bg-foreground/10 border border-foreground/20 text-muted'
                    } disabled:opacity-30`}
            >
                {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <>
                        <Check className="w-5 h-5" />
                        {allExercisesDone ? 'Concluir Treino ✓' : 'Finalizar Treino (incompleto)'}
                    </>
                )}
            </motion.button>

            {/* Session Summary */}
            {sessionSets.length > 0 && (
                <div className="p-4 rounded-2xl bg-foreground/5 border border-foreground/10">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-xs text-muted">Séries</p>
                            <p className="text-lg font-bold text-foreground">{sessionSets.length}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted">Volume</p>
                            <p className="text-lg font-bold text-foreground">{totalVolume.toFixed(0)}<span className="text-xs font-normal text-muted"> kg</span></p>
                        </div>
                        <div>
                            <p className="text-xs text-muted">RPE Médio</p>
                            <p className="text-lg font-bold text-foreground">
                                {sessionSets.filter(s => s.rpe).length > 0
                                    ? (sessionSets.filter(s => s.rpe).reduce((sum, s) => sum + (s.rpe || 0), 0) / sessionSets.filter(s => s.rpe).length).toFixed(1)
                                    : '-'}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
