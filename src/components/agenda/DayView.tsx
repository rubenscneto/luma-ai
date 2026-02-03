"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles, Loader2, Calendar, RefreshCw, Heart } from 'lucide-react';
import { useDailyPlan } from '@/context/dailyPlanContext';
import { BlockCard } from './BlockCard';

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
                className="w-full max-w-md p-6 rounded-2xl bg-[#1a1a2e] border border-white/10"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-lg font-semibold text-white mb-4">Adicionar Bloco</h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-white/60 mb-1">Título</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-brand-primary"
                            placeholder="Ex: Reunião com equipe"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-white/60 mb-1">Categoria</label>
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-brand-primary"
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
                            <label className="block text-sm text-white/60 mb-1">Início</label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={e => setStartTime(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-brand-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-white/60 mb-1">Fim</label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={e => setEndTime(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-brand-primary"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-colors"
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

export function DayView() {
    const { todayBlocks, todayPlan, isLoading, generatePlan, generateHealthBlocks, addBlock, replanDay } = useDailyPlan();
    const [showAddModal, setShowAddModal] = useState(false);
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white capitalize">{formattedDate}</h2>
                    <p className="text-white/60 text-sm mt-1">
                        {todayBlocks.length} blocos • {pastBlocks.length} concluídos
                        {delayedBlocks.length > 0 && (
                            <span className="text-amber-400"> • {delayedBlocks.length} atrasado(s)</span>
                        )}
                    </p>
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

                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Adicionar</span>
                    </button>

                    <button
                        onClick={() => generatePlan()}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white transition-colors disabled:opacity-50"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Sparkles className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">Gerar com IA</span>
                    </button>
                </div>
            </div>

            {/* No plan state */}
            {!todayPlan && !isLoading && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-16 text-center"
                >
                    <div className="w-20 h-20 rounded-2xl bg-brand-primary/20 flex items-center justify-center mb-4">
                        <Calendar className="w-10 h-10 text-brand-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Nenhum plano para hoje</h3>
                    <p className="text-white/60 max-w-sm mb-6">
                        Gere um plano com IA baseado nos seus compromissos fixos e objetivos, ou adicione blocos manualmente.
                    </p>
                    <button
                        onClick={() => generatePlan()}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-medium transition-colors"
                    >
                        <Sparkles className="w-5 h-5" />
                        Gerar Plano do Dia
                    </button>
                </motion.div>
            )}

            {/* Loading state */}
            {isLoading && (
                <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="w-10 h-10 text-brand-primary animate-spin mb-4" />
                    <p className="text-white/60">Gerando seu plano...</p>
                </div>
            )}

            {/* Blocks list */}
            {todayPlan && !isLoading && (
                <div className="space-y-6">
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
                            <h3 className="text-sm font-medium text-white/50 mb-3 uppercase tracking-wider">
                                Agora
                            </h3>
                            <BlockCard block={currentBlock} />
                        </div>
                    )}

                    {/* Upcoming blocks */}
                    {upcomingBlocks.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium text-white/50 mb-3 uppercase tracking-wider">
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
                            <h3 className="text-sm font-medium text-white/50 mb-3 uppercase tracking-wider">
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
            )}

            {/* Add block modal */}
            <AnimatePresence>
                {showAddModal && (
                    <AddBlockModal
                        isOpen={showAddModal}
                        onClose={() => setShowAddModal(false)}
                        onAdd={addBlock}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
