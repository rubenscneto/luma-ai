"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BlockCategory, DailyBlock } from '@/types';

interface BlockEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (block: Partial<DailyBlock>) => void;
    initialData?: Partial<DailyBlock>; // If provided, it's Edit mode. If not, Add mode.
}

export function BlockEditorModal({ isOpen, onClose, onSave, initialData }: BlockEditorModalProps) {
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

    if (!isOpen) return null;

    const isEdit = !!initialData?.id;

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
                className="w-full max-w-md p-6 rounded-2xl bg-surface border border-card-border/50"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-lg font-semibold text-foreground mb-4">
                    {isEdit ? 'Editar Bloco' : 'Adicionar Bloco'}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-muted mb-1">Título</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg bg-foreground/5 border border-card-border/50 text-foreground focus:outline-none focus:border-brand-primary"
                            placeholder="Ex: Reunião com equipe"
                            required
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
                            <option value="sleep">Sono</option>
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
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-muted mb-1">Fim</label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={e => setEndTime(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-foreground/5 border border-card-border/50 text-foreground focus:outline-none focus:border-brand-primary"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 rounded-lg bg-foreground/10 text-muted hover:bg-foreground/20 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-2 rounded-lg bg-brand-primary text-white font-medium hover:bg-brand-primary/90 transition-colors"
                        >
                            Salvar
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}
