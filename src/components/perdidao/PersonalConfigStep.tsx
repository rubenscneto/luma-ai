import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Clock, ArrowRight } from 'lucide-react';
import { FixedTaskInput } from './FixedTaskInput';
import { FixedTask, UserSettings } from '@/types';
import { Card } from '@/components/ui/card';

interface PersonalConfigStepProps {
    onNext: (settings: UserSettings, tasks: FixedTask[]) => void;
    initialSettings?: UserSettings;
    initialTasks?: FixedTask[];
}

export function PersonalConfigStep({ onNext, initialSettings, initialTasks }: PersonalConfigStepProps) {
    const [wakeUpTime, setWakeUpTime] = useState(initialSettings?.wake_up_time || '07:00');
    const [bedTime, setBedTime] = useState(initialSettings?.bed_time || '23:00');
    const [tasks, setTasks] = useState<FixedTask[]>(initialTasks || []);

    const handleNext = () => {
        // Validation could go here
        onNext(
            { user_id: '', wake_up_time: wakeUpTime, bed_time: bedTime },
            tasks
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                    Configuração Pessoal
                </h2>
                <p className="text-zinc-400">
                    Para criar uma rotina perfeita, a IA precisa saber seus limites reais.
                </p>
            </div>

            <Card className="p-6 bg-zinc-900/50 border-zinc-800 space-y-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-violet-500" />
                        <h3 className="font-semibold text-lg">Ciclo de Sono</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Horário de Acordar</Label>
                            <Input
                                type="time"
                                value={wakeUpTime}
                                onChange={(e) => setWakeUpTime(e.target.value)}
                                className="bg-zinc-950 border-zinc-800 focus:border-violet-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Horário de Dormir</Label>
                            <Input
                                type="time"
                                value={bedTime}
                                onChange={(e) => setBedTime(e.target.value)}
                                className="bg-zinc-950 border-zinc-800 focus:border-violet-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="h-px bg-zinc-800" />

                <FixedTaskInput tasks={tasks} onChange={setTasks} />
            </Card>

            <Button onClick={handleNext} className="w-full h-12 text-lg bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-600/20">
                Próximo <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
        </div>
    );
}
