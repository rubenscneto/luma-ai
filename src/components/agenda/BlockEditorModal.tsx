"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BlockCategory, DailyBlock } from '@/types';

interface BlockEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (block: Partial<DailyBlock>) => void;
    onRemove?: (blockId: string) => void;
    initialData?: Partial<DailyBlock>; // If provided, it's Edit mode. If not, Add mode.
}

export function BlockEditorModal({ isOpen, onClose, onSave, onRemove, initialData }: BlockEditorModalProps) {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState<string>('work');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setTitle(initialData.title || '');
                setCategory(initialData.category || 'work');

                if (initialData.start_datetime) {
                    const startDt = new Date(initialData.start_datetime);
                    setStartTime(`${String(startDt.getHours()).padStart(2, '0')}:${String(startDt.getMinutes()).padStart(2, '0')}`);
                }

                if (initialData.end_datetime) {
                    const endDt = new Date(initialData.end_datetime);
                    setEndTime(`${String(endDt.getHours()).padStart(2, '0')}:${String(endDt.getMinutes()).padStart(2, '0')}`);
                }
            } else {
                setTitle('');
                setCategory('work');
                setStartTime('');
                setEndTime('');
            }
        }
    }, [isOpen, initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !startTime || !endTime) return;

        // Ensure we maintain the same date
        const baseDate = initialData?.start_datetime
            ? new Date(initialData.start_datetime).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];

        onSave({
            ...(initialData || {}),
            title,
            category: category as BlockCategory,
            start_datetime: `${baseDate}T${startTime}:00-03:00`,
            end_datetime: `${baseDate}T${endTime}:00-03:00`,
        });

        onClose();
    };

    const handleRemove = () => {
        if (initialData?.id && onRemove) {
            onRemove(initialData.id);
            onClose();
        }
    };

    if (!isOpen) return null;

    const isEdit = !!initialData?.id;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                className="w-full max-w-sm p-6 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-6">
                    {isEdit ? 'Editar Bloco' : 'Adicionar Bloco'}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Título</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border border-transparent focus:border-purple-500/50 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-purple-500/20 text-zinc-900 dark:text-white transition-all text-sm font-medium outline-none"
                            placeholder="Ex: Reunião com equipe"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Categoria</label>
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border border-transparent focus:border-purple-500/50 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-purple-500/20 text-zinc-900 dark:text-white transition-all text-sm font-medium outline-none appearance-none"
                        >
                            <option value="work">Trabalho</option>
                            <option value="study">Estudo</option>
                            <option value="health">Saúde / Treino</option>
                            <option value="leisure">Lazer</option>
                            <option value="admin">Administrativo</option>
                            <option value="meal">Refeição</option>
                            <option value="sleep">Sono / Descanso</option>
                            <option value="commute">Deslocamento</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Início</label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={e => setStartTime(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border border-transparent focus:border-purple-500/50 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-purple-500/20 text-zinc-900 dark:text-white transition-all text-sm font-medium outline-none cursor-text"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Fim</label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={e => setEndTime(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border border-transparent focus:border-purple-500/50 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-purple-500/20 text-zinc-900 dark:text-white transition-all text-sm font-medium outline-none cursor-text"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-6">
                        {isEdit && onRemove && (
                            <button
                                type="button"
                                onClick={handleRemove}
                                className="py-3 px-4 rounded-xl bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 font-semibold transition-colors text-sm"
                            >
                                Remover
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold transition-colors text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold transition-all shadow-md hover:shadow-lg text-sm"
                        >
                            Salvar
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}
