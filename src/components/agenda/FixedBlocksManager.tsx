"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Edit2, Trash2, Calendar, Clock,
    Briefcase, GraduationCap, Dumbbell, Utensils,
    Moon, Heart, Users, Sparkles, X, Check
} from 'lucide-react';
import { useAuth } from '@/context/authContext';
import { supabase } from '@/lib/supabase';

interface FixedBlock {
    id: string;
    user_id: string;
    title: string;
    category: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_active: boolean;
    created_at: string;
}

const DAYS = [
    { value: 0, label: 'Dom', full: 'Domingo' },
    { value: 1, label: 'Seg', full: 'Segunda' },
    { value: 2, label: 'Ter', full: 'Terça' },
    { value: 3, label: 'Qua', full: 'Quarta' },
    { value: 4, label: 'Qui', full: 'Quinta' },
    { value: 5, label: 'Sex', full: 'Sexta' },
    { value: 6, label: 'Sáb', full: 'Sábado' },
];

const CATEGORIES = [
    { value: 'trabalho', label: 'Trabalho', icon: Briefcase, color: 'from-blue-500 to-blue-600' },
    { value: 'estudo', label: 'Estudo', icon: GraduationCap, color: 'from-purple-500 to-purple-600' },
    { value: 'treino', label: 'Treino', icon: Dumbbell, color: 'from-green-500 to-green-600' },
    { value: 'alimentacao', label: 'Alimentação', icon: Utensils, color: 'from-orange-500 to-orange-600' },
    { value: 'descanso', label: 'Descanso', icon: Moon, color: 'from-indigo-500 to-indigo-600' },
    { value: 'saude', label: 'Saúde', icon: Heart, color: 'from-red-500 to-red-600' },
    { value: 'social', label: 'Social', icon: Users, color: 'from-pink-500 to-pink-600' },
    { value: 'outro', label: 'Outro', icon: Sparkles, color: 'from-gray-500 to-gray-600' },
];

interface FixedBlockFormData {
    title: string;
    category: string;
    day_of_week: number[];
    start_time: string;
    end_time: string;
}

export default function FixedBlocksManager() {
    const { user } = useAuth();
    const [blocks, setBlocks] = useState<FixedBlock[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingBlock, setEditingBlock] = useState<FixedBlock | null>(null);
    const [formData, setFormData] = useState<FixedBlockFormData>({
        title: '',
        category: 'trabalho',
        day_of_week: [],
        start_time: '09:00',
        end_time: '10:00',
    });

    const loadBlocks = useCallback(async () => {
        if (!user) return;

        setIsLoading(true);
        const { data } = await supabase
            .from('fixed_blocks')
            .select('*')
            .eq('user_id', user.id)
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true });

        setBlocks(data || []);
        setIsLoading(false);
    }, [user]);

    useEffect(() => {
        loadBlocks();
    }, [loadBlocks]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || formData.day_of_week.length === 0) return;

        setIsLoading(true);

        try {
            if (editingBlock) {
                // Update existing block
                await supabase
                    .from('fixed_blocks')
                    .update({
                        title: formData.title,
                        category: formData.category,
                        day_of_week: formData.day_of_week[0],
                        start_time: formData.start_time,
                        end_time: formData.end_time,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', editingBlock.id);
            } else {
                // Create new blocks for each selected day
                const newBlocks = formData.day_of_week.map(day => ({
                    user_id: user.id,
                    title: formData.title,
                    category: formData.category,
                    day_of_week: day,
                    start_time: formData.start_time,
                    end_time: formData.end_time,
                    is_active: true,
                }));

                await supabase.from('fixed_blocks').insert(newBlocks);
            }

            await loadBlocks();
            resetForm();
        } catch (error) {
            console.error('Error saving block:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (blockId: string) => {
        if (!confirm('Remover este bloco fixo?')) return;

        await supabase
            .from('fixed_blocks')
            .delete()
            .eq('id', blockId);

        await loadBlocks();
    };

    const handleToggleActive = async (block: FixedBlock) => {
        await supabase
            .from('fixed_blocks')
            .update({ is_active: !block.is_active })
            .eq('id', block.id);

        await loadBlocks();
    };

    const handleEdit = (block: FixedBlock) => {
        setEditingBlock(block);
        setFormData({
            title: block.title,
            category: block.category,
            day_of_week: [block.day_of_week],
            start_time: block.start_time,
            end_time: block.end_time,
        });
        setShowForm(true);
    };

    const resetForm = () => {
        setFormData({
            title: '',
            category: 'trabalho',
            day_of_week: [],
            start_time: '09:00',
            end_time: '10:00',
        });
        setEditingBlock(null);
        setShowForm(false);
    };

    const toggleDay = (day: number) => {
        if (editingBlock) {
            // When editing, only allow single day
            setFormData(prev => ({ ...prev, day_of_week: [day] }));
        } else {
            setFormData(prev => ({
                ...prev,
                day_of_week: prev.day_of_week.includes(day)
                    ? prev.day_of_week.filter(d => d !== day)
                    : [...prev.day_of_week, day]
            }));
        }
    };

    const getCategoryInfo = (category: string) => {
        return CATEGORIES.find(c => c.value === category) || CATEGORIES[CATEGORIES.length - 1];
    };

    const blocksByDay = DAYS.map(day => ({
        ...day,
        blocks: blocks.filter(b => b.day_of_week === day.value)
    }));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-white">Blocos Fixos</h2>
                    <p className="text-sm text-white/60">
                        Configure atividades que se repetem toda semana
                    </p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white text-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Novo Bloco
                </motion.button>
            </div>

            {/* Week Grid */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {blocksByDay.map(day => (
                    <div
                        key={day.value}
                        className="bg-white/5 rounded-2xl p-4 border border-white/10"
                    >
                        <h3 className="text-sm font-medium text-white/80 mb-3">{day.full}</h3>

                        <div className="space-y-2 min-h-[100px]">
                            {day.blocks.length === 0 ? (
                                <p className="text-xs text-white/40 text-center py-4">
                                    Sem blocos
                                </p>
                            ) : (
                                day.blocks.map(block => {
                                    const cat = getCategoryInfo(block.category);
                                    const Icon = cat.icon;

                                    return (
                                        <motion.div
                                            key={block.id}
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{
                                                opacity: block.is_active ? 1 : 0.5,
                                                y: 0
                                            }}
                                            className={`group relative p-3 rounded-xl bg-gradient-to-r ${cat.color} ${!block.is_active ? 'grayscale' : ''
                                                }`}
                                        >
                                            <div className="flex items-start gap-2">
                                                <Icon className="w-4 h-4 text-white/80 mt-0.5" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-white truncate">
                                                        {block.title}
                                                    </p>
                                                    <p className="text-[10px] text-white/70">
                                                        {block.start_time} - {block.end_time}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleToggleActive(block)}
                                                    className="p-1 rounded bg-black/20 hover:bg-black/40"
                                                    title={block.is_active ? 'Desativar' : 'Ativar'}
                                                >
                                                    {block.is_active ? (
                                                        <X className="w-3 h-3 text-white" />
                                                    ) : (
                                                        <Check className="w-3 h-3 text-white" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(block)}
                                                    className="p-1 rounded bg-black/20 hover:bg-black/40"
                                                >
                                                    <Edit2 className="w-3 h-3 text-white" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(block.id)}
                                                    className="p-1 rounded bg-black/20 hover:bg-red-500/50"
                                                >
                                                    <Trash2 className="w-3 h-3 text-white" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Form Modal */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={(e) => e.target === e.currentTarget && resetForm()}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-md border border-white/10"
                        >
                            <h3 className="text-lg font-semibold text-white mb-4">
                                {editingBlock ? 'Editar Bloco' : 'Novo Bloco Fixo'}
                            </h3>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Title */}
                                <div>
                                    <label className="block text-sm text-white/60 mb-1">Nome</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder="Ex: Reunião diária"
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
                                        required
                                    />
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="block text-sm text-white/60 mb-2">Categoria</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {CATEGORIES.map(cat => {
                                            const Icon = cat.icon;
                                            const isSelected = formData.category === cat.value;
                                            return (
                                                <button
                                                    key={cat.value}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, category: cat.value }))}
                                                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${isSelected
                                                            ? `bg-gradient-to-r ${cat.color} text-white`
                                                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                                                        }`}
                                                >
                                                    <Icon className="w-4 h-4" />
                                                    <span className="text-[10px]">{cat.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Days */}
                                <div>
                                    <label className="block text-sm text-white/60 mb-2">
                                        {editingBlock ? 'Dia' : 'Dias da Semana'}
                                    </label>
                                    <div className="flex gap-2">
                                        {DAYS.map(day => {
                                            const isSelected = formData.day_of_week.includes(day.value);
                                            return (
                                                <button
                                                    key={day.value}
                                                    type="button"
                                                    onClick={() => toggleDay(day.value)}
                                                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${isSelected
                                                            ? 'bg-purple-500 text-white'
                                                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                                                        }`}
                                                >
                                                    {day.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Time */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-white/60 mb-1">Início</label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                            <input
                                                type="time"
                                                value={formData.start_time}
                                                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                                                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-white/60 mb-1">Fim</label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                            <input
                                                type="time"
                                                value={formData.end_time}
                                                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                                                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading || formData.day_of_week.length === 0}
                                        className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? 'Salvando...' : editingBlock ? 'Salvar' : 'Criar'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
