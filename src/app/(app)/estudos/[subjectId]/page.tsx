"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Subject, StudyMaterial, Flashcard } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, BookOpen, Layers, Target, Clock, FileText, BrainCircuit } from 'lucide-react';

export default function SubjectDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [subject, setSubject] = useState<Subject | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSubject = async () => {
            if (!params.subjectId) return;

            const { data, error } = await supabase
                .from('subjects')
                .select('*')
                .eq('id', params.subjectId)
                .single();

            if (data && !error) {
                setSubject(data as Subject);
            } else {
                console.error("Subject not found", error);
                // router.push('/estudos');
            }
            setLoading(false);
        };

        fetchSubject();
    }, [params.subjectId, router]);

    if (loading) {
        return <div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" /></div>;
    }

    if (!subject) {
        return <div className="p-8 text-center">Matéria não encontrada.</div>;
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
                        <span className="text-sm font-normal px-2 py-1 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                            Nível {subject.difficulty}/5
                        </span>
                    </h1>
                    <p className="text-zinc-500 flex items-center gap-2 mt-1">
                        <Target className="h-4 w-4" /> Meta: {subject.goal || "Não definida"}
                    </p>
                </div>
            </header>

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="bg-zinc-900 border border-zinc-800">
                    <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                    <TabsTrigger value="materials">Materiais</TabsTrigger>
                    <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
                    <TabsTrigger value="mindmap">Mapa Mental</TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="mt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="p-6 bg-zinc-900/50 border-zinc-800">
                            <h3 className="text-zinc-400 mb-2 flex items-center gap-2"><Clock className="h-4 w-4" /> Tempo Estudado</h3>
                            <p className="text-2xl font-bold">0h</p>
                        </Card>
                        <Card className="p-6 bg-zinc-900/50 border-zinc-800">
                            <h3 className="text-zinc-400 mb-2 flex items-center gap-2"><Layers className="h-4 w-4" /> Flashcards</h3>
                            <p className="text-2xl font-bold">0</p>
                        </Card>
                        <Card className="p-6 bg-zinc-900/50 border-zinc-800">
                            <h3 className="text-zinc-400 mb-2 flex items-center gap-2"><FileText className="h-4 w-4" /> Materiais</h3>
                            <p className="text-2xl font-bold">0</p>
                        </Card>
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
                    <Card className="p-12 text-center border-dashed border-zinc-800 bg-zinc-900/30">
                        <div className="mx-auto w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                            <FileText className="h-6 w-6 text-zinc-500" />
                        </div>
                        <h3 className="text-lg font-semibold">Nenhum material ainda</h3>
                        <p className="text-zinc-500 mb-6">Faça upload de PDFs ou cole textos para estudar.</p>
                        <Button>Adicionar Material</Button>
                    </Card>
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
