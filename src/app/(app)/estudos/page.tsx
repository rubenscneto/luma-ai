"use client";

import React, { useState } from "react";
import { useStudy } from "@/context/studyContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, BookOpen, Clock, BrainCircuit } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export default function EstudosPage() {
    const { subjects, addSubject, removeSubject, sessions, addSession, loading } = useStudy();
    const [newSubject, setNewSubject] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    const handleAddSubject = async () => {
        if (newSubject.trim()) {
            setIsAdding(true);
            await addSubject(newSubject.trim());
            setNewSubject("");
            setIsAdding(false);
        }
    };

    const startSession = (subjectName: string) => {
        // Simplified session log for now (Simulation)
        addSession({
            id: uuidv4(),
            subject: subjectName,
            topic: "Revisão Geral",
            date: new Date().toISOString(),
            duration: 60,
            notes: ""
        });
        alert(`Sessão iniciada para ${subjectName}! (Cronômetro em breve)`);
    };

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Estudos</h1>
                    <p className="text-zinc-500">Gerencie suas matérias e acompanhe seu progresso.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Input
                        placeholder="Nova Matéria (Ex: Matemática)"
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        className="w-full md:w-64"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
                    />
                    <Button onClick={handleAddSubject} disabled={isAdding}>
                        {isAdding ? <div className="animate-spin w-4 h-4 border-2 border-white/50 border-t-white rounded-full" /> : <Plus size={20} />}
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subjects.map(subject => {
                    const subjectSessions = sessions.filter(s => s.subject === subject.name);
                    const totalHours = subjectSessions.reduce((acc, curr) => acc + curr.duration, 0) / 60;

                    return (
                        <Card key={subject.id} className="p-6 hover:border-violet-500/50 transition-colors group relative overflow-hidden bg-white dark:bg-zinc-900">
                            {/* Trash Icon for Deletion */}
                            <button
                                onClick={(e) => { e.stopPropagation(); if (confirm('Deletar matéria?')) removeSubject(subject.id); }}
                                className="absolute top-4 right-4 text-zinc-300 hover:text-red-500 transition-colors z-20"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                            </button>

                            <div className="absolute top-0 right-0 p-3 opacity-5 text-violet-500 group-hover:scale-110 transition-transform pointer-events-none">
                                <BookOpen size={100} />
                            </div>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 flex items-center justify-center font-bold">
                                    {subject.name.substring(0, 2).toUpperCase()}
                                </div>
                                <h3 className="text-xl font-bold z-10 relative truncate">{subject.name}</h3>
                            </div>

                            <p className="text-sm text-zinc-400 mb-6 h-5 truncate">{subject.goal || "Sem meta definida"}</p>

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

                            <Button className="w-full z-10 relative" onClick={() => startSession(subject.name)}>
                                <Clock size={16} className="mr-2" /> Iniciar Sessão
                            </Button>
                        </Card>
                    );
                })}

                {loading && (
                    <div className="col-span-full py-20 flex justify-center text-violet-500">
                        <div className="animate-spin w-8 h-8 border-4 border-current border-t-transparent rounded-full" />
                    </div>
                )}

                {!loading && subjects.length === 0 && (
                    <div className="col-span-full py-10 text-center text-zinc-400 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                        Nenhuma matéria cadastrada. Adicione acima!
                    </div>
                )}
            </div>

            {/* AI Suggestions Area */}
            <Card className="p-6 bg-gradient-to-r from-zinc-900 to-zinc-800 text-white border-none">
                <div className="flex items-center gap-3 mb-4">
                    <BrainCircuit className="text-violet-400" />
                    <h2 className="text-lg font-semibold">Tutor IA</h2>
                </div>
                <p className="text-zinc-300">
                    Otimize seus estudos! Adicione matérias e metas para receber planos personalizados.
                </p>
            </Card>
        </div>
    );
}
