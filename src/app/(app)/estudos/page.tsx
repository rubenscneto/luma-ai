"use client";

import React, { useState } from "react";
import { useStudy } from "@/context/studyContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, BookOpen, Clock, BrainCircuit } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export default function EstudosPage() {
    const { subjects, addSubject, sessions, addSession } = useStudy();
    const [newSubject, setNewSubject] = useState("");

    const handleAddSubject = () => {
        if (newSubject.trim()) {
            addSubject(newSubject);
            setNewSubject("");
        }
    };

    const startSession = (subject: string) => {
        // Simplified session log
        addSession({
            id: uuidv4(),
            subject,
            topic: "Revisão Geral",
            date: new Date().toISOString(),
            duration: 60,
            notes: ""
        });
        alert("Sessão de estudo registrada (Simulação)");
    };

    return (
        <div className="space-y-8">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Estudos</h1>
                    <p className="text-zinc-500">Acompanhe seu progresso acadêmico.</p>
                </div>
                <div className="flex gap-2">
                    <Input
                        placeholder="Nova Matéria"
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        className="w-48"
                    />
                    <Button onClick={handleAddSubject}><Plus size={20} /></Button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subjects.map(subject => {
                    const subjectSessions = sessions.filter(s => s.subject === subject);
                    const totalHours = subjectSessions.reduce((acc, curr) => acc + curr.duration, 0) / 60;

                    return (
                        <Card key={subject} className="p-6 hover:border-violet-500/50 transition-colors group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-5 text-violet-500 group-hover:scale-110 transition-transform">
                                <BookOpen size={100} />
                            </div>

                            <h3 className="text-xl font-bold mb-4 z-10 relative">{subject}</h3>

                            <div className="flex gap-4 mb-6 z-10 relative">
                                <div className="flex items-center gap-2 text-sm text-zinc-500">
                                    <Clock size={16} />
                                    <span>{totalHours.toFixed(1)}h</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-zinc-500">
                                    <BookOpen size={16} />
                                    <span>{subjectSessions.length} sessões</span>
                                </div>
                            </div>

                            <Button className="w-full z-10 relative" onClick={() => startSession(subject)}>
                                <Clock size={16} className="mr-2" /> Iniciar Sessão
                            </Button>
                        </Card>
                    );
                })}

                {subjects.length === 0 && (
                    <div className="col-span-full py-10 text-center text-zinc-400 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                        Nenhuma matéria cadastrada.
                    </div>
                )}
            </div>

            {/* AI Suggestions Area */}
            <Card className="p-6 bg-gradient-to-r from-zinc-900 to-zinc-800 text-white border-none">
                <div className="flex items-center gap-3 mb-4">
                    <BrainCircuit className="text-violet-400" />
                    <h2 className="text-lg font-semibold">Sugestão de Revisão (IA)</h2>
                </div>
                <p className="text-zinc-300">
                    Com base no seu histórico, recomenda-se revisar <strong>Matemática</strong> hoje, focando em exercícios práticos por 45 minutos.
                </p>
            </Card>
        </div>
    );
}
