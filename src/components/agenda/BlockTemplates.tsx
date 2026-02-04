"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Briefcase, GraduationCap, Dumbbell, Utensils,
    Moon, Heart, Users, Sparkles, Trash2, Clock, Copy, Check, X
} from 'lucide-react';
import { useAuth } from '@/context/authContext';
import { supabase } from '@/lib/supabase';

interface BlockTemplate {
    id: string;
    title: string;
    category: string;
    duration_minutes: number;
    description?: string;
    is_preset: boolean;
}

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

// Default presets
const DEFAULT_PRESETS: Omit<BlockTemplate, 'id'>[] = [
    { title: 'Reunião rápida', category: 'trabalho', duration_minutes: 30, description: 'Reunião de alinhamento', is_preset: true },
    { title: 'Deep Work', category: 'trabalho', duration_minutes: 90, description: 'Foco intenso sem interrupções', is_preset: true },
    { title: 'Sessão de estudo', category: 'estudo', duration_minutes: 45, description: 'Estudo com técnica Pomodoro', is_preset: true },
    { title: 'Revisão de flashcards', category: 'estudo', duration_minutes: 20, description: 'Revisão espaçada', is_preset: true },
    { title: 'Treino HIIT', category: 'treino', duration_minutes: 30, description: 'Treino intervalado', is_preset: true },
    { title: 'Alongamento', category: 'treino', duration_minutes: 15, description: 'Flexibilidade e relaxamento', is_preset: true },
    { title: 'Almoço', category: 'alimentacao', duration_minutes: 60, description: 'Refeição e descanso', is_preset: true },
    { title: 'Meditação', category: 'descanso', duration_minutes: 15, description: 'Mindfulness', is_preset: true },
    { title: 'Power nap', category: 'descanso', duration_minutes: 20, description: 'Cochilo restaurador', is_preset: true },
];

interface BlockTemplatesProps {
    onUseTemplate?: (template: BlockTemplate) => void;
}

export default function BlockTemplates({ onUseTemplate }: BlockTemplatesProps) {
    const { user } = useAuth();
    const [templates, setTemplates] = useState<BlockTemplate[]>(() =>
        DEFAULT_PRESETS.map((p, i) => ({ ...p, id: `preset-${i}` }))
    );
    const [showForm, setShowForm] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        category: 'trabalho',
        duration_minutes: 30,
        description: '',
    });

    const getCategoryInfo = (category: string) => {
        return CATEGORIES.find(c => c.value === category) || CATEGORIES[CATEGORIES.length - 1];
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const newTemplate: BlockTemplate = {
            id: `template-${Date.now()}`,
            ...formData,
            is_preset: false,
        };

        setTemplates(prev => [...prev, newTemplate]);
        setFormData({ title: '', category: 'trabalho', duration_minutes: 30, description: '' });
        setShowForm(false);
    };

    const handleDelete = (id: string) => {
        setTemplates(prev => prev.filter(t => t.id !== id));
    };

    const handleUseTemplate = (template: BlockTemplate) => {
        if (onUseTemplate) {
            onUseTemplate(template);
        }
        setCopiedId(template.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Use Template State
    const [selectedTemplate, setSelectedTemplate] = useState<BlockTemplate | null>(null);
    const [useFormData, setUseFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00'
    });


    const handleConfirmUse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTemplate || !user) return;

        // Calculate end time
        const [hours, minutes] = useFormData.startTime.split(':').map(Number);
        const start = new Date(`${useFormData.date}T${useFormData.startTime}:00`);
        const end = new Date(start.getTime() + selectedTemplate.duration_minutes * 60000);

        const start_datetime = start.toISOString();
        const end_datetime = end.toISOString();

        try {
            const { error } = await supabase.from('daily_blocks').insert({
                user_id: user.id,
                title: selectedTemplate.title,
                category: selectedTemplate.category,
                start_datetime: start_datetime, // Use full ISO datetime
                end_datetime: end_datetime,
                is_done: false,
                source: 'template'
            });

            if (error) throw error;

            setSelectedTemplate(null);
            // Optional: trigger refresh or notify user
            // toast.success("Bloco agendado!");
        } catch (error) {
            console.error("Error using template:", error);
            // toast.error("Erro ao agendar.");
        }
    };

    const openUseModal = (template: BlockTemplate) => {
        // Default time to next hour
        const nextHour = new Date();
        nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
        const timeStr = nextHour.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        setUseFormData({
            date: new Date().toISOString().split('T')[0],
            startTime: timeStr
        });
        setSelectedTemplate(template);
    };

    // Original handleUseTemplate adjusted
    const handleUseTemplate = (template: BlockTemplate) => {
        if (onUseTemplate) {
            onUseTemplate(template);
        } else {
            openUseModal(template);
        }
        setCopiedId(template.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const presets = templates.filter(t => t.is_preset);
    const customTemplates = templates.filter(t => !t.is_preset);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">

                <div>
                    <h2 className="text-xl font-semibold text-white">Templates de Blocos</h2>
                    <p className="text-sm text-white/60">
                        Use templates prontos ou crie os seus
                    </p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white text-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Criar Template
                </motion.button>
            </div>

            {/* Presets */}
            <div>
                <h3 className="text-sm font-medium text-white/60 mb-3">Templates Padrão</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {presets.map(template => {
                        const cat = getCategoryInfo(template.category);
                        const Icon = cat.icon;
                        const isCopied = copiedId === template.id;

                        return (
                            <motion.div
                                key={template.id}
                                layout
                                className={`p-4 rounded-xl bg-gradient-to-br ${cat.color} group cursor-pointer`}
                                onClick={() => handleUseTemplate(template)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <Icon className="w-4 h-4 text-white/80" />
                                        <h4 className="text-sm font-medium text-white">{template.title}</h4>
                                    </div>
                                    <div className="p-1.5 rounded bg-black/20">
                                        {isCopied ? (
                                            <Check className="w-3.5 h-3.5 text-green-300" />
                                        ) : (
                                            <Copy className="w-3.5 h-3.5 text-white/60 group-hover:text-white" />
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-2 text-xs text-white/70">
                                    <Clock className="w-3 h-3" />
                                    <span>{template.duration_minutes} min</span>
                                </div>
                                {template.description && (
                                    <p className="text-xs text-white/60 mt-1 truncate">{template.description}</p>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Custom Templates */}
            {customTemplates.length > 0 && (
                <div>
                    <h3 className="text-sm font-medium text-white/60 mb-3">Meus Templates</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {customTemplates.map(template => {
                            const cat = getCategoryInfo(template.category);
                            const Icon = cat.icon;
                            const isCopied = copiedId === template.id;

                            return (
                                <motion.div
                                    key={template.id}
                                    layout
                                    className="p-4 rounded-xl bg-white/5 border border-white/10 group"
                                >
                                    <div className="flex items-start justify-between">
                                        <div
                                            className="flex items-center gap-2 cursor-pointer flex-1"
                                            onClick={() => handleUseTemplate(template)}
                                        >
                                            <div className={`p-1.5 rounded bg-gradient-to-br ${cat.color}`}>
                                                <Icon className="w-3.5 h-3.5 text-white" />
                                            </div>
                                            <h4 className="text-sm font-medium text-white">{template.title}</h4>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleUseTemplate(template)}
                                                className="p-1.5 rounded bg-white/5 hover:bg-white/10"
                                            >
                                                {isCopied ? (
                                                    <Check className="w-3.5 h-3.5 text-green-400" />
                                                ) : (
                                                    <Copy className="w-3.5 h-3.5 text-white/40" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(template.id)}
                                                className="p-1.5 rounded bg-white/5 hover:bg-red-500/20"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 text-white/40 hover:text-red-400" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 text-xs text-white/60">
                                        <Clock className="w-3 h-3" />
                                        <span>{template.duration_minutes} min</span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}


            {/* Use Template Modal */}
            <AnimatePresence>
                {selectedTemplate && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedTemplate(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-sm border border-white/10"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-white">Usar Template</h3>
                                <button onClick={() => setSelectedTemplate(null)} className="p-2 rounded-lg hover:bg-white/10">
                                    <X className="w-5 h-5 text-white/60" />
                                </button>
                            </div>

                            <div className="mb-6 p-3 bg-white/5 rounded-xl border border-white/10">
                                <h4 className="font-medium text-white">{selectedTemplate.title}</h4>
                                <div className="flex items-center gap-2 mt-1 text-xs text-white/60">
                                    <Clock className="w-3 h-3" />
                                    <span>{selectedTemplate.duration_minutes} min</span>
                                    <span>•</span>
                                    <span className="capitalize">{getCategoryInfo(selectedTemplate.category).label}</span>
                                </div>
                            </div>

                            <form onSubmit={handleConfirmUse} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-white/60 mb-1">Data</label>
                                    <input
                                        type="date"
                                        value={useFormData.date}
                                        onChange={e => setUseFormData(prev => ({ ...prev, date: e.target.value }))}
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-white/60 mb-1">Horário de Início</label>
                                    <input
                                        type="time"
                                        value={useFormData.startTime}
                                        onChange={e => setUseFormData(prev => ({ ...prev, startTime: e.target.value }))}
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
                                        required
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTemplate(null)}
                                        className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/60 hover:bg-white/10 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
                                    >
                                        Agendar
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Create Form Modal */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowForm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-md border border-white/10"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-white">Novo Template</h3>
                                <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-white/10">
                                    <X className="w-5 h-5 text-white/60" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-white/60 mb-1">Nome</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder="Ex: Reunião semanal"
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
                                        required
                                    />
                                </div>

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

                                <div>
                                    <label className="block text-sm text-white/60 mb-1">Duração (minutos)</label>
                                    <input
                                        type="number"
                                        min="5"
                                        max="480"
                                        step="5"
                                        value={formData.duration_minutes}
                                        onChange={e => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-white/60 mb-1">Descrição (opcional)</label>
                                    <input
                                        type="text"
                                        value={formData.description}
                                        onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Uma breve descrição"
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/60"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-medium"
                                    >
                                        Criar Template
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
