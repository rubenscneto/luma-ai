"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useDailyPlan } from '@/context/dailyPlanContext';
import { Play, Pause, RotateCcw, BookOpen, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';

const WORK_TIME = 25 * 60;
const SHORT_BREAK = 5 * 60;
const LONG_BREAK = 15 * 60;

export default function EstudosPage() {
    const { todayBlocks } = useDailyPlan();

    // Timer state
    const [timeLeft, setTimeLeft] = useState(WORK_TIME);
    const [isRunning, setIsRunning] = useState(false);
    const [mode, setMode] = useState<TimerMode>('pomodoro');
    const [cycles, setCycles] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Audio beep
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        audioRef.current = new Audio('/beep.mp3'); // Simple beep tone, user can add to public later
    }, []);

    // Get today's study blocks
    const studyBlocks = useMemo(() => {
        return todayBlocks.filter(b => (b.category as any) === 'study' || (b.category as any) === 'estudo').sort((a, b) => a.start_datetime.localeCompare(b.start_datetime));
    }, [todayBlocks]);

    useEffect(() => {
        if (isRunning) {
            intervalRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        handleTimerComplete();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isRunning, mode, cycles]);

    const handleTimerComplete = () => {
        setIsRunning(false);
        if (audioRef.current) {
            audioRef.current.play().catch(e => console.log('Audio play failed:', e));
        }

        if (mode === 'pomodoro') {
            const nextCycles = cycles + 1;
            setCycles(nextCycles);
            if (nextCycles % 4 === 0) {
                switchMode('longBreak');
            } else {
                switchMode('shortBreak');
            }
        } else {
            switchMode('pomodoro');
        }
    };

    const toggleTimer = () => setIsRunning(!isRunning);

    const resetTimer = () => {
        setIsRunning(false);
        switchMode(mode);
    };

    const switchMode = (newMode: TimerMode) => {
        setMode(newMode);
        setIsRunning(false);
        switch (newMode) {
            case 'pomodoro': setTimeLeft(WORK_TIME); break;
            case 'shortBreak': setTimeLeft(SHORT_BREAK); break;
            case 'longBreak': setTimeLeft(LONG_BREAK); break;
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const getProgress = () => {
        let total = WORK_TIME;
        if (mode === 'shortBreak') total = SHORT_BREAK;
        if (mode === 'longBreak') total = LONG_BREAK;
        return 100 - ((timeLeft / total) * 100);
    };

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-bg flex flex-col xl:flex-row gap-8">
            <div className="flex-1 flex flex-col items-center justify-center min-h-[500px]">
                <div className="max-w-md w-full text-center space-y-8">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-bold text-foreground">Sessão de Foco</h1>
                        <p className="text-muted">A técnica Pomodoro ajuda você a manter a densidade sem se desgastar. (25m Foco / 5m Pausa)</p>
                    </div>

                    {/* Mode Selectors */}
                    <div className="inline-flex items-center gap-2 p-1.5 bg-surface dark:bg-black/20 border border-card-border/50 rounded-2xl mx-auto">
                        <button
                            onClick={() => switchMode('pomodoro')}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${mode === 'pomodoro' ? 'bg-purple-600 text-white shadow-lg' : 'text-muted hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                        >
                            Foco
                        </button>
                        <button
                            onClick={() => switchMode('shortBreak')}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${mode === 'shortBreak' ? 'bg-blue-500 text-white shadow-lg' : 'text-muted hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                        >
                            Pausa Curta
                        </button>
                        <button
                            onClick={() => switchMode('longBreak')}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${mode === 'longBreak' ? 'bg-indigo-500 text-white shadow-lg' : 'text-muted hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                        >
                            Pausa Longa
                        </button>
                    </div>

                    {/* Timer Display */}
                    <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" className="fill-none stroke-card-border/50 stroke-[2]" />
                            <motion.circle
                                cx="50"
                                cy="50"
                                r="45"
                                className={`fill-none stroke-[4] stroke-linecap-round ${mode === 'pomodoro' ? 'stroke-purple-500' : mode === 'shortBreak' ? 'stroke-blue-400' : 'stroke-indigo-400'}`}
                                strokeDasharray="283"
                                strokeDashoffset={283 - (283 * getProgress()) / 100}
                                initial={{ strokeDashoffset: 283 }}
                                animate={{ strokeDashoffset: 283 - (283 * getProgress()) / 100 }}
                                transition={{ duration: 1, ease: 'linear' }}
                            />
                        </svg>
                        <div className="text-6xl font-black text-foreground tabular-nums tracking-tighter">
                            {formatTime(timeLeft)}
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-6">
                        <button
                            onClick={toggleTimer}
                            className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-xl transition-transform hover:scale-105 active:scale-95 ${isRunning ? 'bg-zinc-800' : mode === 'pomodoro' ? 'bg-purple-600' : 'bg-blue-500'}`}
                        >
                            {isRunning ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current translate-x-1" />}
                        </button>

                        <button
                            onClick={resetTimer}
                            className="w-12 h-12 rounded-xl bg-surface border border-card-border/50 flex items-center justify-center text-muted hover:text-foreground transition-all hover:bg-black/5"
                            title="Resetar"
                        >
                            <RotateCcw className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Sidebar Context */}
            <div className="w-full xl:w-80 space-y-6 shrink-0">
                <div className="bg-surface dark:bg-zinc-900 border border-card-border/50 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-purple-500" />
                        Sessões de Hoje
                    </h3>

                    {studyBlocks.length === 0 ? (
                        <div className="text-center py-6 text-muted">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Nenhum bloco de estudo agendado para hoje.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {studyBlocks.map(block => {
                                const start = new Date(block.start_datetime);
                                const isDone = block.is_done;
                                return (
                                    <div key={block.id} className={`p-3 rounded-xl border ${isDone ? 'bg-zinc-50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 opacity-60' : 'bg-purple-500/10 border-purple-500/20'}`}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-xs font-bold ${isDone ? 'text-zinc-500' : 'text-purple-600 dark:text-purple-400'}`}>
                                                {start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {isDone && <span className="text-[10px] uppercase font-bold text-zinc-400">Concluído</span>}
                                        </div>
                                        <p className={`text-sm font-semibold truncate ${isDone ? 'text-zinc-500 line-through' : 'text-foreground'}`}>
                                            {block.title}
                                        </p>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="bg-surface dark:bg-zinc-900 border border-card-border/50 rounded-2xl p-6">
                    <h4 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-500" /> Estatísticas Rápidas
                    </h4>
                    <div className="flex justify-between items-center text-sm py-2 border-b border-card-border/30">
                        <span className="text-muted">Ciclos concluídos</span>
                        <span className="font-bold text-foreground">{cycles} / 4</span>
                    </div>
                    <div className="flex justify-between items-center text-sm py-2">
                        <span className="text-muted">Tempo focado</span>
                        <span className="font-bold text-foreground">{Math.floor(cycles * 25)} min</span>
                    </div>
                </div>
            </div>
        </div>
    );
}