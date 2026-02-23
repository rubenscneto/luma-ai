"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles, Loader2, Calendar, RefreshCw, Heart, GitCompareArrows, X, Target, Zap, Clock, Lightbulb, Download } from 'lucide-react';
import { useDailyPlan } from '@/context/dailyPlanContext';
import { useAuth } from '@/context/authContext';
import { BlockCard } from './BlockCard';
import { AIGeneratedPlan, AIBlock } from '@/types';

import { ConsistencyScore } from './ConsistencyScore';

interface AddBlockModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (block: any) => void;
}

function AddBlockModal({ isOpen, onClose, onAdd }: AddBlockModalProps) {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState<string>('work');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !startTime || !endTime) return;

        const today = new Date().toISOString().split('T')[0];
        onAdd({
            title,
            category,
            start_datetime: `${today}T${startTime}:00-03:00`,
            end_datetime: `${today}T${endTime}:00-03:00`,
        });

        setTitle('');
        setCategory('work');
        setStartTime('');
        setEndTime('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md p-6 rounded-2xl bg-[#1a1a2e] border border-card-border/50"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-lg font-semibold text-foreground mb-4">Adicionar Bloco</h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-muted mb-1">Título</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg bg-foreground/5 border border-card-border/50 text-foreground focus:outline-none focus:border-brand-primary"
                            placeholder="Ex: Reunião com equipe"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-muted mb-1">Categoria</label>
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg bg-foreground/5 border border-card-border/50 text-foreground focus:outline-none focus:border-brand-primary"
                        >
                            <option value="work">Trabalho</option>
                            <option value="study">Estudo</option>
                            <option value="health">Saúde</option>
                            <option value="leisure">Lazer</option>
                            <option value="admin">Administrativo</option>
                            <option value="meal">Refeição</option>
                            <option value="commute">Deslocamento</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-muted mb-1">Início</label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={e => setStartTime(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-foreground/5 border border-card-border/50 text-foreground focus:outline-none focus:border-brand-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-muted mb-1">Fim</label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={e => setEndTime(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-foreground/5 border border-card-border/50 text-foreground focus:outline-none focus:border-brand-primary"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 rounded-lg bg-foreground/10 text-muted hover:bg-white/20 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-2 rounded-lg bg-brand-primary text-white font-medium hover:bg-brand-primary/90 transition-colors"
                        >
                            Adicionar
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

// ========== A/B Plan Comparison Modal ==========

const categoryLabels: Record<string, string> = {
    work: 'Trabalho',
    study: 'Estudo',
    health: 'Saúde',
    leisure: 'Lazer',
    admin: 'Admin',
    meal: 'Refeição',
    sleep: 'Sono',
    commute: 'Desloc.',
    fixed: 'Fixo',
};

function PlanCard({
    plan,
    label,
    icon: Icon,
    accentColor,
    onSelect,
    isLoading,
}: {
    plan: AIGeneratedPlan;
    label: string;
    icon: React.ElementType;
    accentColor: string;
    onSelect: () => void;
    isLoading: boolean;
}) {
    // Count blocks by category
    const categoryCounts = plan.blocks.reduce((acc, b) => {
        acc[b.category] = (acc[b.category] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 p-5 rounded-2xl bg-foreground/5 border border-card-border/50 hover:border-white/20 transition-all"
        >
            {/* Plan Name */}
            <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-lg ${accentColor} flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-foreground" />
                </div>
                <h4 className="text-lg font-semibold text-foreground">{label}</h4>
            </div>

            {/* Summary */}
            <p className="text-sm text-foreground/70 mb-4 line-clamp-2">{plan.summary}</p>

            {/* Insight */}
            {plan.insight && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
                    <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-300">{plan.insight}</p>
                </div>
            )}

            {/* Category breakdown */}
            <div className="flex flex-wrap gap-1.5 mb-4">
                {Object.entries(categoryCounts).map(([cat, count]) => (
                    <span key={cat} className="px-2 py-0.5 text-xs rounded-full bg-foreground/10 text-foreground/70">
                        {categoryLabels[cat] || cat}: {count}
                    </span>
                ))}
            </div>

            {/* Timeline preview */}
            <div className="space-y-1.5 mb-4 max-h-48 overflow-y-auto pr-1">
                {plan.blocks.map((block, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="text-muted/70 w-[72px] shrink-0 font-mono">
                            {block.start_time}-{block.end_time}
                        </span>
                        <div className="flex-1 px-2 py-1 rounded bg-foreground/5 text-foreground/80 truncate">
                            {block.title}
                        </div>
                    </div>
                ))}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-xs text-muted mb-4">
                <span>{plan.blocks.length} blocos</span>
                <span>•</span>
                <span>{Object.keys(categoryCounts).length} categorias</span>
            </div>

            {/* Select button */}
            <button
                onClick={onSelect}
                disabled={isLoading}
                className={`w-full py-2.5 rounded-xl font-medium text-foreground transition-all disabled:opacity-50 ${accentColor} hover:opacity-90`}
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 mx-auto animate-spin" />
                ) : (
                    `Escolher ${label}`
                )}
            </button>
        </motion.div>
    );
}

function ABPlanComparison() {
    const { abPlans, selectPlan, clearABPlans, isLoading } = useDailyPlan();

    if (!abPlans.planA || !abPlans.planB) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#12122a] border border-card-border/50 p-6"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-foreground">Comparar Planos</h3>
                        <p className="text-sm text-muted mt-1">
                            Escolha o estilo que melhor se encaixa no seu dia
                        </p>
                    </div>
                    <button
                        onClick={clearABPlans}
                        className="p-2 rounded-lg hover:bg-foreground/10 transition-colors"
                    >
                        <X className="w-5 h-5 text-muted" />
                    </button>
                </div>

                {/* Plans side by side */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <PlanCard
                        plan={abPlans.planA}
                        label="Foco"
                        icon={Target}
                        accentColor="bg-blue-600"
                        onSelect={() => selectPlan('A')}
                        isLoading={isLoading}
                    />
                    <PlanCard
                        plan={abPlans.planB}
                        label="Equilíbrio"
                        icon={Zap}
                        accentColor="bg-emerald-600"
                        onSelect={() => selectPlan('B')}
                        isLoading={isLoading}
                    />
                </div>
            </motion.div>
        </motion.div>
    );
}

// ========== Generate Mode Selector ==========

function GenerateModePicker({
    isOpen,
    onClose,
    onGenerate,
    onGenerateAB,
    isLoading,
    isABLoading,
    selectedDate,
}: {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: () => void;
    onGenerateAB: () => void;
    isLoading: boolean;
    isABLoading: boolean;
    selectedDate: string;
}) {
    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-sm p-6 rounded-2xl bg-[#1a1a2e] border border-card-border/50"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-lg font-semibold text-foreground mb-2">Gerar Agenda com IA</h3>
                <p className="text-sm text-muted mb-5">Escolha como deseja gerar o plano do dia</p>

                <div className="space-y-3">
                    <button
                        onClick={() => { onGenerate(); onClose(); }}
                        disabled={isLoading || isABLoading || !selectedDate}
                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-brand-primary/20 hover:bg-brand-primary/30 border border-brand-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="w-10 h-10 rounded-lg bg-brand-primary/30 flex items-center justify-center shrink-0">
                            <Sparkles className="w-5 h-5 text-brand-primary" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-medium text-foreground">Plano Único</p>
                            <p className="text-xs text-muted">Gere o melhor plano automaticamente</p>
                        </div>
                        {isLoading && <Loader2 className="w-4 h-4 text-brand-primary animate-spin ml-auto" />}
                    </button>

                    <button
                        onClick={() => { onGenerateAB(); onClose(); }}
                        disabled={isLoading || isABLoading || !selectedDate}
                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="w-10 h-10 rounded-lg bg-purple-500/30 flex items-center justify-center shrink-0">
                            <GitCompareArrows className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-medium text-foreground">Comparar A/B</p>
                            <p className="text-xs text-muted">Dois estilos para você escolher</p>
                        </div>
                        {isABLoading && <Loader2 className="w-4 h-4 text-purple-400 animate-spin ml-auto" />}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ========== Main DayView ==========

export function DayView() {
    const {
        todayBlocks, todayPlan, isLoading, generatePlan,
        generateHealthBlocks, addBlock, replanDay,
        generateABPlan, abPlans, isABLoading, selectedDate,
        lastSolverWarnings, lastAISummary, consistencyScore
    } = useDailyPlan();
    const { user } = useAuth();

    const [showAddModal, setShowAddModal] = useState(false);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [isReplanning, setIsReplanning] = useState(false);
    const [isGeneratingHealth, setIsGeneratingHealth] = useState(false);

    const now = new Date();
    const formattedDate = now.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });

    // Group blocks by status
    const pastBlocks = todayBlocks.filter(b => b.status === 'done' || b.status === 'skipped');
    const currentBlock = todayBlocks.find(b => b.status === 'current');
    const upcomingBlocks = todayBlocks.filter(b => b.status === 'upcoming');
    const delayedBlocks = todayBlocks.filter(b => b.status === 'delayed');

    const handleReplan = async () => {
        setIsReplanning(true);
        try {
            await replanDay('Usuário solicitou replanejamento');
        } finally {
            setIsReplanning(false);
        }
    };

    const handleGenerateHealth = async () => {
        setIsGeneratingHealth(true);
        try {
            await generateHealthBlocks();
        } finally {
            setIsGeneratingHealth(false);
        }
    };

    const handleExportICS = () => {
        if (!selectedDate || !user) return;
        window.open(`/api/agenda/export?date=${selectedDate}&user_id=${user.id}`, '_blank');
    };

    // Current time position for timeline (6:00 to 22:00 range)
    const currentHour = now.getHours() + now.getMinutes() / 60;
    const timelineProgress = Math.max(0, Math.min(100, ((currentHour - 6) / 16) * 100));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground capitalize">{formattedDate}</h2>
                        <p className="text-muted text-sm mt-1">
                            {todayBlocks.length} blocos • {pastBlocks.length} concluídos
                            {delayedBlocks.length > 0 && (
                                <span className="text-amber-400"> • {delayedBlocks.length} atrasado(s)</span>
                            )}
                        </p>
                    </div>
                    {todayPlan && (
                        <ConsistencyScore score={consistencyScore} size={50} />
                    )}
                </div>

                <div className="flex gap-2">
                    {delayedBlocks.length > 0 && (
                        <button
                            onClick={handleReplan}
                            disabled={isReplanning}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isReplanning ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">{isReplanning ? 'Replanejando...' : 'Replanejar'}</span>
                        </button>
                    )}

                    {todayPlan && (
                        <button
                            onClick={handleGenerateHealth}
                            disabled={isGeneratingHealth || isLoading}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors disabled:opacity-50"
                        >
                            {isGeneratingHealth ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Heart className="w-4 h-4" />
                            )}
                            <span className="hidden sm:inline">Saúde</span>
                        </button>
                    )}

                    {todayPlan && (
                        <button
                            onClick={handleExportICS}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 transition-colors disabled:opacity-50"
                            title="Exportar para Calendário (.ics)"
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Exportar</span>
                        </button>
                    )}

                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground/10 hover:bg-white/20 text-foreground transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Adicionar</span>
                    </button>

                    <button
                        onClick={() => setShowGenerateModal(true)}
                        disabled={isLoading || isABLoading || !selectedDate}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white transition-colors disabled:opacity-50"
                    >
                        {isLoading || isABLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Sparkles className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">Gerar com IA</span>
                    </button>
                </div>
            </div>

            {/* A/B Loading state */}
            {
                isABLoading && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20"
                    >
                        <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                        <div>
                            <p className="text-sm font-medium text-purple-300">Gerando dois planos alternativos...</p>
                            <p className="text-xs text-purple-300/60">Plano A (Foco) e Plano B (Equilíbrio)</p>
                        </div>
                    </motion.div>
                )
            }

            {/* No plan state */}
            {
                !todayPlan && !isLoading && !isABLoading && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-16 text-center"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-brand-primary/20 flex items-center justify-center mb-4">
                            <Calendar className="w-10 h-10 text-brand-primary" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">Nenhum plano para hoje</h3>
                        <p className="text-muted max-w-sm mb-6">
                            Gere um plano com IA baseado nos seus compromissos fixos e objetivos, ou adicione blocos manualmente.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => generatePlan()}
                                disabled={isLoading || !selectedDate}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Sparkles className="w-5 h-5" />
                                Plano Único
                            </button>
                            <button
                                onClick={() => generateABPlan()}
                                disabled={isABLoading || !selectedDate}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-600/90 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <GitCompareArrows className="w-5 h-5" />
                                Comparar A/B
                            </button>
                        </div>
                    </motion.div>
                )
            }

            {/* Loading state */}
            {
                isLoading && (
                    <div className="flex flex-col items-center justify-center py-16">
                        <Loader2 className="w-10 h-10 text-brand-primary animate-spin mb-4" />
                        <p className="text-muted">Gerando seu plano...</p>
                    </div>
                )
            }

            {/* AI Summary and Warnings */}
            <AnimatePresence>
                {(lastAISummary || lastSolverWarnings.length > 0) && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 overflow-hidden"
                    >
                        {lastAISummary && (
                            <div className="p-4 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex gap-3 items-start">
                                <Sparkles className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-semibold text-brand-primary">Insight do Dia</h4>
                                    <p className="text-sm text-foreground/80 mt-1 leading-relaxed">
                                        {lastAISummary}
                                    </p>
                                </div>
                            </div>
                        )}

                        {lastSolverWarnings.length > 0 && (
                            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-3 items-start">
                                <X className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-semibold text-amber-500">Ajustes Automáticos</h4>
                                    <ul className="mt-1 space-y-1">
                                        {lastSolverWarnings.map((warning, i) => (
                                            <li key={i} className="text-sm text-amber-200/80">• {warning}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Blocks list with timeline */}
            {
                todayPlan && !isLoading && (
                    <div className="space-y-6">
                        {/* Mini timeline progress bar */}
                        <div className="relative">
                            <div className="flex justify-between text-[10px] text-muted/50 mb-1">
                                <span>06:00</span>
                                <span>10:00</span>
                                <span>14:00</span>
                                <span>18:00</span>
                                <span>22:00</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-foreground/5 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${timelineProgress}%` }}
                                    transition={{ duration: 1, ease: 'easeOut' }}
                                    className="h-full rounded-full bg-gradient-to-r from-brand-primary to-purple-500"
                                />
                            </div>
                            {/* Block dots on timeline */}
                            <div className="relative h-2 mt-0.5">
                                {todayBlocks.map(block => {
                                    const start = new Date(block.start_datetime);
                                    const startH = start.getHours() + start.getMinutes() / 60;
                                    const left = Math.max(0, Math.min(100, ((startH - 6) / 16) * 100));
                                    return (
                                        <div
                                            key={block.id}
                                            className={`absolute w-1.5 h-1.5 rounded-full -translate-x-0.5 ${block.is_done ? 'bg-green-400' :
                                                block.is_skipped ? 'bg-red-400/50' :
                                                    block.status === 'current' ? 'bg-brand-primary' :
                                                        'bg-white/30'
                                                }`}
                                            style={{ left: `${left}%` }}
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        {/* Delayed blocks warning */}
                        {delayedBlocks.length > 0 && (
                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                <p className="text-amber-400 text-sm font-medium">
                                    {delayedBlocks.length} bloco(s) atrasado(s)
                                </p>
                            </div>
                        )}

                        {/* Current block */}
                        {currentBlock && (
                            <div>
                                <h3 className="text-sm font-medium text-muted mb-3 uppercase tracking-wider">
                                    Agora
                                </h3>
                                <BlockCard block={currentBlock} />
                            </div>
                        )}

                        {/* Upcoming blocks */}
                        {upcomingBlocks.length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium text-muted mb-3 uppercase tracking-wider">
                                    Próximos
                                </h3>
                                <div className="space-y-3">
                                    <AnimatePresence>
                                        {upcomingBlocks.map(block => (
                                            <BlockCard key={block.id} block={block} />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )}

                        {/* Completed blocks */}
                        {pastBlocks.length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium text-muted mb-3 uppercase tracking-wider">
                                    Concluídos
                                </h3>
                                <div className="space-y-3">
                                    <AnimatePresence>
                                        {pastBlocks.map(block => (
                                            <BlockCard key={block.id} block={block} />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )}
                    </div>
                )
            }

            {/* Modals */}
            <AnimatePresence>
                {showAddModal && (
                    <AddBlockModal
                        isOpen={showAddModal}
                        onClose={() => setShowAddModal(false)}
                        onAdd={addBlock}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                <GenerateModePicker
                    isOpen={showGenerateModal}
                    onClose={() => setShowGenerateModal(false)}
                    onGenerate={() => generatePlan()}
                    onGenerateAB={() => generateABPlan()}
                    isLoading={isLoading}
                    isABLoading={isABLoading}
                    selectedDate={selectedDate}
                />
            </AnimatePresence>

            <AnimatePresence>
                <ABPlanComparison />
            </AnimatePresence>
        </div >
    );
}
