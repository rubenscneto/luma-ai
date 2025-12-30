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


import { AddMaterialModal } from '@/components/education/AddMaterialModal';
import { ExternalLink, FileText as FileIcon, Trash2 } from 'lucide-react';

export default function SubjectDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [subject, setSubject] = useState<Subject | null>(null);
    const [materials, setMaterials] = useState<StudyMaterial[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!params.subjectId) return;

        // Fetch Subject
        const { data: subData, error: subError } = await supabase
            .from('subjects')
            .select('*')
            .eq('id', params.subjectId)
            .single();

        if (subData) setSubject(subData as Subject);

        // Fetch Materials
        const { data: matData, error: matError } = await supabase
            .from('study_materials')
            .select('*')
            .eq('subject_id', params.subjectId)
            .order('created_at', { ascending: false });

        if (matData) setMaterials(matData as StudyMaterial[]);

        setLoading(false);
    };

    const [activeTab, setActiveTab] = useState("overview");

    useEffect(() => {
        fetchData();
    }, [params.subjectId]);

    const handleDeleteMaterial = async (id: string) => {
        if (!confirm("Remover este material?")) return;

        await supabase.from('study_materials').delete().eq('id', id);
        setMaterials(prev => prev.filter(m => m.id !== id));
    };

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
                            value="0"
                            isActive={false}
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
                    <Card className="p-12 text-center border-dashed border-zinc-800 bg-zinc-900/30">
                        <div className="mx-auto w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                            <Layers className="h-6 w-6 text-zinc-500" />
                        </div>
                        <h3 className="text-lg font-semibold">Deck Vazio</h3>
                        <p className="text-zinc-500 mb-6">Crie flashcards manualmente ou peça para a IA gerar.</p>
                        <div className="flex justify-center gap-4">
                            <Button variant="outline">Criar Manualmente</Button>
                            <Button className="bg-violet-600 hover:bg-violet-700">Gerar com IA ✨</Button>
                        </div>
                    </Card>
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
