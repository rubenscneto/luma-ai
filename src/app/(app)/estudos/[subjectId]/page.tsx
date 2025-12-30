"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Subject, StudyMaterial, Flashcard } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, BookOpen, Layers, Target, Clock, FileText, BrainCircuit } from 'lucide-react';
import { motion } from "framer-motion";


import { AddFlashcardModal } from '@/components/education/AddFlashcardModal';
import { FlashcardReview } from '@/components/education/FlashcardReview';

import { AddMaterialModal } from '@/components/education/AddMaterialModal';
import { ExternalLink, FileText as FileIcon, Trash2 } from 'lucide-react';

export default function SubjectDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [subject, setSubject] = useState<Subject | null>(null);
    const [materials, setMaterials] = useState<StudyMaterial[]>([]);
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [loading, setLoading] = useState(true);
    const [isReviewing, setIsReviewing] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");

    const fetchData = async () => {
        if (!params.subjectId) return;

        // Fetch Subject
        const { data: subData } = await supabase
            .from('subjects')
            .select('*')
            .eq('id', params.subjectId)
            .single();

        if (subData) setSubject(subData as Subject);

        // Fetch Materials
        const { data: matData } = await supabase
            .from('study_materials')
            .select('*')
            .eq('subject_id', params.subjectId)
            .order('created_at', { ascending: false });

        if (matData) setMaterials(matData as StudyMaterial[]);

        // Fetch Flashcards (All, but we will filter for review)
        const { data: fcData } = await supabase
            .from('flashcards')
            .select('*')
            .eq('subject_id', params.subjectId)
            .order('next_review', { ascending: true });

        if (fcData) setFlashcards(fcData as Flashcard[]);

        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [params.subjectId]);

    const handleDeleteMaterial = async (id: string) => {
        if (!confirm("Remover este material?")) return;

        await supabase.from('study_materials').delete().eq('id', id);
        setMaterials(prev => prev.filter(m => m.id !== id));
    };

    const handleDeleteCard = async (id: string) => {
        if (!confirm("Deletar este card?")) return;
        await supabase.from('flashcards').delete().eq('id', id);
        setFlashcards(prev => prev.filter(c => c.id !== id));
    }

    // Filter cards due for review (next_review <= now) or new cards
    const cardsDue = flashcards.filter(c => new Date(c.next_review || '') <= new Date());

    if (loading) {
        return <div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" /></div>;
    }

    if (!subject) {
        return <div className="p-8 text-center">Matéria não encontrada.</div>;
    }

    const tabs = [
        { id: "overview", label: "Visão Geral" },
        { id: "materials", label: "Materiais" },
        { id: "flashcards", label: "Flashcards" },
        { id: "mindmap", label: "Mapa Mental" },
    ];

    if (isReviewing) {
        return (
            <div className="space-y-6">
                <Button variant="ghost" onClick={() => { setIsReviewing(false); fetchData(); }} className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Sair da Revisão
                </Button>
                <FlashcardReview cards={cardsDue} onSessionComplete={() => { setIsReviewing(false); fetchData(); }} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/estudos')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        {subject.name}
                        <span className="text-sm font-bold px-3 py-1 rounded-full bg-zinc-100 text-zinc-900 border border-zinc-200 shadow-sm">
                            Nível {subject.difficulty}/5
                        </span>
                    </h1>
                    <p className="text-zinc-500 flex items-center gap-2 mt-1">
                        <Target className="h-4 w-4" /> Meta: {subject.goal || "Não definida"}
                    </p>
                </div>
            </header>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-transparent border-b border-zinc-200 dark:border-zinc-800 w-full justify-start h-auto p-0 rounded-none space-x-6">
                    {tabs.map((tab) => (
                        <TabsTrigger
                            key={tab.id}
                            value={tab.id}
                            className={`relative px-4 py-3 rounded-none bg-transparent border-b-2 border-transparent data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:text-violet-600 dark:data-[state=active]:text-violet-400 transition-colors ${activeTab === tab.id ? "font-semibold" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                }`}
                        >
                            <span className="relative z-10">{tab.label}</span>
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-violet-600 shadow-[0_0_10px_rgba(124,58,237,0.5)]"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            )}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="mt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard
                            icon={<Clock className="h-4 w-4" />}
                            label="Tempo Estudado"
                            value="0h"
                            isActive={false}
                        />
                        <StatCard
                            icon={<Layers className="h-4 w-4" />}
                            label="Flashcards"
                            value={flashcards.length.toString()}
                            isActive={flashcards.length > 0}
                        />
                        <StatCard
                            icon={<FileText className="h-4 w-4" />}
                            label="Materiais"
                            value={materials.length.toString()}
                            isActive={materials.length > 0}
                        />
                    </div>

                    <Card className="p-8 text-center border-dashed border-zinc-800 bg-transparent">
                        <h3 className="text-lg font-semibold mb-2">Plano de Estudos (IA)</h3>
                        <p className="text-zinc-500 mb-4">Adicione materiais para que a IA gere um plano personalizado.</p>
                        <Button variant="outline" className="gap-2">
                            <BrainCircuit className="h-4 w-4" /> Gerar Plano
                        </Button>
                    </Card>
                </TabsContent>

                {/* MATERIALS TAB */}
                <TabsContent value="materials" className="mt-6">
                    {materials.length === 0 ? (
                        <Card className="p-12 text-center border-dashed border-zinc-800 bg-zinc-900/30">
                            <div className="mx-auto w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                                <FileText className="h-6 w-6 text-zinc-500" />
                            </div>
                            <h3 className="text-lg font-semibold">Nenhum material ainda</h3>
                            <p className="text-zinc-500 mb-6">Faça upload de links ou cole textos para estudar.</p>
                            <AddMaterialModal subjectId={subject.id} onMaterialAdded={fetchData} />
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-lg">Seus Materiais ({materials.length})</h3>
                                <AddMaterialModal subjectId={subject.id} onMaterialAdded={fetchData} />
                            </div>
                            <div className="grid gap-4">
                                {materials.map(material => (
                                    <div key={material.id} className="flex items-center justify-between p-4 rounded-lg border border-zinc-800 bg-zinc-900 hover:border-violet-500/50 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center text-violet-400">
                                                {material.type === 'link' ? <ExternalLink size={20} /> : <FileIcon size={20} />}
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-white">{material.title}</h4>
                                                <p className="text-xs text-zinc-500 truncate max-w-[300px]">
                                                    {material.content || 'Conteúdo de texto'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {material.type === 'link' && (
                                                <a href={material.content} target='_blank' rel='noreferrer'>
                                                    <Button size="sm" variant="ghost">Abrir</Button>
                                                </a>
                                            )}
                                            <Button size="sm" variant="ghost" onClick={() => handleDeleteMaterial(material.id)}>
                                                <Trash2 size={16} className="text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </TabsContent>

                {/* FLASHCARDS TAB */}
                <TabsContent value="flashcards" className="mt-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold">Deck de Revisão</h3>
                        <AddFlashcardModal subjectId={subject.id} onCardAdded={fetchData} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Status Card */}
                        <Card className="p-6 bg-gradient-to-br from-violet-900/50 to-zinc-900 border-violet-500/30">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/20">
                                    <BrainCircuit className="text-white" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">Revisão Espaçada</h4>
                                    <p className="text-zinc-400 text-sm">Algoritmo inteligente ativo</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg">
                                    <span className="text-zinc-300">Total de Cartas</span>
                                    <span className="font-mono font-bold text-xl">{flashcards.length}</span>
                                </div>
                                <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-violet-500/30">
                                    <span className="text-violet-200">Para Revisar Hoje</span>
                                    <span className="font-mono font-bold text-xl text-violet-400">{cardsDue.length}</span>
                                </div>
                                <Button
                                    className="w-full bg-violet-600 hover:bg-violet-700 font-bold"
                                    disabled={cardsDue.length === 0}
                                    onClick={() => setIsReviewing(true)}
                                >
                                    {cardsDue.length > 0 ? `Iniciar Revisão (${cardsDue.length})` : "Tudo em dia! 🎉"}
                                </Button>
                            </div>
                        </Card>

                        {/* Recent Cards List */}
                        <div className="space-y-3">
                            <h4 className="text-sm text-zinc-500 font-medium">Últimas Cartas Adicionadas</h4>
                            {flashcards.slice(0, 5).map(card => (
                                <div key={card.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex justify-between items-center group">
                                    <span className="text-sm truncate max-w-[80%]">{card.front}</span>
                                    <button onClick={() => handleDeleteCard(card.id)} className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            {flashcards.length === 0 && (
                                <div className="text-center py-10 text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                                    Nenhuma carta criada.
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>


                {/* MINDMAP TAB */}
                <TabsContent value="mindmap" className="mt-6">
                    <div className="h-[400px] rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-center text-zinc-500">
                        Editor de Mapa Mental (Em Breve)
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function StatCard({ icon, label, value, isActive }: { icon: React.ReactNode, label: string, value: string, isActive: boolean }) {
    return (
        <Card className={`p-6 border transition-all ${isActive
            ? "bg-violet-600 border-violet-500 text-white"
            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
            }`}>
            <h3 className={`text-sm mb-2 flex items-center gap-2 ${isActive ? "text-violet-100" : "text-zinc-500 dark:text-zinc-400"}`}>
                {icon} {label}
            </h3>
            <p className="text-2xl font-bold">{value}</p>
        </Card>
    );
}
