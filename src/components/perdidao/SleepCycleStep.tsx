import React, { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Moon, Sun } from 'lucide-react';
import { UserSettings } from '@/types';

interface SleepCycleStepProps {
    value: UserSettings;
    onChange: (settings: UserSettings) => void;
}

export function SleepCycleStep({ value, onChange }: SleepCycleStepProps) {
    const handleChange = (key: keyof UserSettings, val: string) => {
        onChange({ ...value, [key]: val });
    };

    return (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm hover:border-violet-300 dark:hover:border-violet-700 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                        <Sun className="w-5 h-5 text-amber-500" />
                        <Label className="text-base font-semibold text-zinc-800 dark:text-zinc-200">Acordar</Label>
                    </div>
                    <div className="relative">
                        <Input
                            type="time"
                            value={value.wake_up_time}
                            onChange={(e) => handleChange('wake_up_time', e.target.value)}
                            className="text-2xl font-bold h-14 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-center focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                    </div>
                    <p className="text-xs text-zinc-500 text-center">Horário que você inicia o dia</p>
                </div>

                <div className="space-y-3 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                        <Moon className="w-5 h-5 text-indigo-500" />
                        <Label className="text-base font-semibold text-zinc-800 dark:text-zinc-200">Dormir</Label>
                    </div>
                    <div className="relative">
                        <Input
                            type="time"
                            value={value.bed_time}
                            onChange={(e) => handleChange('bed_time', e.target.value)}
                            className="text-2xl font-bold h-14 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-center focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                    </div>
                    <p className="text-xs text-zinc-500 text-center">Horário que você encerra o dia</p>
                </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-4 rounded-lg text-sm border border-blue-100 dark:border-blue-900/50">
                💡 <strong>Dica:</strong> A IA usará esses horários para definir o início e o fim da sua rotina diária.
            </div>
        </div>
    );
}
