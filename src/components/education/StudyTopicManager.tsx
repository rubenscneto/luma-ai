"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus, Check, ChevronRight, BookOpen,
    Trash2, GripVertical, Circle, CheckCircle2,
    Sparkles
} from "lucide-react";

export interface StudyTopic {
    id: string;
    title: string;
    status: 'pending' | 'in_progress' | 'done';
    notes?: string;
    estimatedHours?: number;
    order: number;
}

interface StudyTopicManagerProps {
    topics: StudyTopic[];
    onChange: (topics: StudyTopic[]) => void;
    subjectName: string;
}

export function StudyTopicManager({ topics, onChange, subjectName }: StudyTopicManagerProps) {
    const [newTopicTitle, setNewTopicTitle] = useState("");
    const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

    const addTopic = () => {
        if (!newTopicTitle.trim()) return;
        const newTopic: StudyTopic = {
            id: crypto.randomUUID(),
            title: newTopicTitle.trim(),
            status: 'pending',
            order: topics.length,
        };
        onChange([...topics, newTopic]);
        setNewTopicTitle("");
    };

    const removeTopic = (id: string) => {
        onChange(topics.filter(t => t.id !== id));
    };

    const toggleStatus = (id: string) => {
        onChange(topics.map(t => {
            if (t.id !== id) return t;
            const next = t.status === 'pending' ? 'in_progress' : t.status === 'in_progress' ? 'done' : 'pending';
            return { ...t, status: next };
        }));
    };

    const updateNotes = (id: string, notes: string) => {
        onChange(topics.map(t => t.id === id ? { ...t, notes } : t));
    };

    const completedCount = topics.filter(t => t.status === 'done').length;
    const inProgressCount = topics.filter(t => t.status === 'in_progress').length;
    const progressPercent = topics.length > 0 ? Math.round((completedCount / topics.length) * 100) : 0;

    return (
        <div className="space-y-6">
            {/* Progress Overview */}
            {topics.length > 0 && (
                <div className="bg-white/5 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-white/60">Progresso dos Tópicos</h3>
                        <span className="text-sm font-bold text-purple-400">{progressPercent}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                    <div className="flex gap-4 text-xs text-white/40">
                        <span className="flex items-center gap-1">
                            <Circle className="w-3 h-3 text-zinc-500" /> {topics.length - completedCount - inProgressCount} pendentes
                        </span>
                        <span className="flex items-center gap-1">
                            <ChevronRight className="w-3 h-3 text-blue-400" /> {inProgressCount} em andamento
                        </span>
                        <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-400" /> {completedCount} concluídos
                        </span>
                    </div>
                </div>
            )}

            {/* Add Topic Input */}
            <div className="flex gap-2">
                <input
                    value={newTopicTitle}
                    onChange={(e) => setNewTopicTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTopic()}
                    placeholder="Novo tópico..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                />
                <button
                    onClick={addTopic}
                    disabled={!newTopicTitle.trim()}
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white rounded-xl transition-colors flex items-center gap-1.5 text-sm font-medium"
                >
                    <Plus className="w-4 h-4" /> Adicionar
                </button>
            </div>

            {/* Topics List */}
            <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                    {topics
                        .sort((a, b) => {
                            // Sort: in_progress first, then pending, then done
                            const order = { in_progress: 0, pending: 1, done: 2 };
                            return order[a.status] - order[b.status];
                        })
                        .map((topic) => (
                            <motion.div
                                key={topic.id}
                                layout
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="group"
                            >
                                <div
                                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${topic.status === 'done'
                                            ? 'bg-green-500/5 border-green-500/20'
                                            : topic.status === 'in_progress'
                                                ? 'bg-blue-500/5 border-blue-500/20'
                                                : 'bg-white/5 border-white/10 hover:border-white/20'
                                        }`}
                                    onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
                                >
                                    {/* Status Toggle */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleStatus(topic.id); }}
                                        className="shrink-0"
                                    >
                                        {topic.status === 'done' ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                                        ) : topic.status === 'in_progress' ? (
                                            <div className="w-5 h-5 rounded-full border-2 border-blue-400 bg-blue-400/30" />
                                        ) : (
                                            <Circle className="w-5 h-5 text-white/20" />
                                        )}
                                    </button>

                                    {/* Title */}
                                    <span className={`flex-1 text-sm font-medium ${topic.status === 'done' ? 'line-through text-white/30' : 'text-white'
                                        }`}>
                                        {topic.title}
                                    </span>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeTopic(topic.id); }}
                                            className="p-1 text-white/20 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <ChevronRight className={`w-4 h-4 text-white/20 transition-transform ${expandedTopic === topic.id ? 'rotate-90' : ''
                                        }`} />
                                </div>

                                {/* Expanded Notes */}
                                <AnimatePresence>
                                    {expandedTopic === topic.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-4 py-3 ml-8">
                                                <textarea
                                                    value={topic.notes || ''}
                                                    onChange={(e) => updateNotes(topic.id, e.target.value)}
                                                    placeholder="Anotações sobre este tópico..."
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white/70 placeholder:text-white/20 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                                    rows={3}
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                </AnimatePresence>
            </div>

            {/* Empty State */}
            {topics.length === 0 && (
                <div className="text-center py-12 space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-500/10 flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-purple-400/60" />
                    </div>
                    <h3 className="text-white/60 font-medium">Nenhum tópico ainda</h3>
                    <p className="text-sm text-white/30 max-w-sm mx-auto">
                        Adicione tópicos para organizar seus estudos de {subjectName}.
                    </p>
                </div>
            )}
        </div>
    );
}
