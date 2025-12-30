import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FixedTask } from '@/types';
import { WeekdaySelector } from './WeekdaySelector';
import { Trash2, Plus, Clock } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface FixedTaskInputProps {
    tasks: FixedTask[];
    onChange: (tasks: FixedTask[]) => void;
}

export function FixedTaskInput({ tasks, onChange }: FixedTaskInputProps) {
    const addTask = () => {
        const newTask: FixedTask = {
            id: uuidv4(),
            user_id: '', // Will be set on save
            title: '',
            start_time: '09:00',
            end_time: '10:00',
            days_of_week: [1, 2, 3, 4, 5] // Mon-Fri default
        };
        onChange([...tasks, newTask]);
    };

    const updateTask = (id: string, updates: Partial<FixedTask>) => {
        onChange(tasks.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    const removeTask = (id: string) => {
        onChange(tasks.filter(t => t.id !== id));
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Label className="text-zinc-400">Compromissos Fixos (Trabalho, Aulas, Treinos)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addTask} className="text-violet-400 border-violet-500/30 hover:bg-violet-500/10">
                    <Plus className="w-4 h-4 mr-1" /> Adicionar
                </Button>
            </div>

            {tasks.length === 0 && (
                <div className="text-center p-6 border border-dashed border-zinc-800 rounded-lg text-zinc-500 text-sm">
                    Nenhum compromisso fixo. Sua agenda está totalmente livre?
                </div>
            )}

            <div className="space-y-3">
                {tasks.map((task) => (
                    <div key={task.id} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-3 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <Input
                                    placeholder="Nome (ex: Trabalho)"
                                    value={task.title}
                                    onChange={(e) => updateTask(task.id, { title: e.target.value })}
                                    className="bg-zinc-950 border-zinc-800 focus:border-violet-500"
                                />
                            </div>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeTask(task.id)} className="text-zinc-500 hover:text-red-500">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="flex flex-wrap gap-4 items-center">
                            <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1.5 rounded-md border border-zinc-800">
                                <Clock className="w-3 h-3 text-violet-500" />
                                <input
                                    type="time"
                                    value={task.start_time}
                                    onChange={(e) => updateTask(task.id, { start_time: e.target.value })}
                                    className="bg-transparent text-sm focus:outline-none w-[60px]"
                                />
                                <span className="text-zinc-600">-</span>
                                <input
                                    type="time"
                                    value={task.end_time}
                                    onChange={(e) => updateTask(task.id, { end_time: e.target.value })}
                                    className="bg-transparent text-sm focus:outline-none w-[60px]"
                                />
                            </div>

                            <div className="flex-1 overflow-x-auto pb-1 sm:pb-0">
                                <WeekdaySelector
                                    selectedDays={task.days_of_week}
                                    onChange={(days) => updateTask(task.id, { days_of_week: days })}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
