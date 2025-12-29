"use client";

import React from "react";
import { useRoutine } from "@/context/routineContext";
import { Reorder } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Clock, GripVertical, CheckCircle2 } from "lucide-react";

export default function AgendaPage() {
    const { routine, setRoutine, updateBlock } = useRoutine();

    const handleToggle = (id: string, completed: boolean) => {
        updateBlock(id, { completed: !completed });
    };

    if (routine.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <h2 className="text-2xl font-bold mb-2">Agenda vazia</h2>
                <p className="text-zinc-500 mb-4">Use o "Perdidão" para gerar sua rotina ideal.</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-8">
            <h1 className="text-3xl font-bold mb-8">Agenda Inteligente</h1>

            <Reorder.Group axis="y" values={routine} onReorder={setRoutine} className="space-y-4">
                {routine.map((block) => (
                    <Reorder.Item key={block.id} value={block}>
                        <Card className={`flex items-center gap-4 p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${block.completed ? 'opacity-50' : ''}`}>
                            <div className="text-zinc-400 cursor-grab">
                                <GripVertical size={20} />
                            </div>

                            <div className="w-16 text-center font-mono font-bold text-lg text-zinc-500">
                                {block.startTime}
                            </div>

                            <div className={`h-12 w-1 rounded-full ${block.type === 'work' ? 'bg-blue-500' :
                                    block.type === 'study' ? 'bg-violet-500' :
                                        block.type === 'health' ? 'bg-green-500' :
                                            block.type === 'leisure' ? 'bg-yellow-500' : 'bg-zinc-500'
                                }`} />

                            <div className="flex-1">
                                <h3 className={`font-semibold text-lg ${block.completed ? 'line-through decoration-zinc-500' : ''}`}>
                                    {block.title}
                                </h3>
                                <p className="text-sm text-zinc-500 capitalize">{block.type} • {block.duration} min</p>
                            </div>

                            <button
                                onClick={() => handleToggle(block.id, block.completed)}
                                className={`p-2 rounded-full transition-colors ${block.completed ? 'text-green-500 bg-green-500/10' : 'text-zinc-300 hover:text-zinc-500'}`}
                            >
                                <CheckCircle2 size={24} />
                            </button>
                        </Card>
                    </Reorder.Item>
                ))}
            </Reorder.Group>
        </div>
    );
}
