import React from 'react';
import { Button } from "@/components/ui/button";

interface WeekdaySelectorProps {
    selectedDays: number[];
    onChange: (days: number[]) => void;
}

const DAYS = [
    { label: 'D', value: 7 }, // Dom
    { label: 'S', value: 1 }, // Seg
    { label: 'T', value: 2 },
    { label: 'Q', value: 3 },
    { label: 'Q', value: 4 },
    { label: 'S', value: 5 },
    { label: 'S', value: 6 }, // Sab
];

export function WeekdaySelector({ selectedDays, onChange }: WeekdaySelectorProps) {
    const toggleDay = (day: number) => {
        if (selectedDays.includes(day)) {
            onChange(selectedDays.filter(d => d !== day));
        } else {
            onChange([...selectedDays, day].sort());
        }
    };

    return (
        <div className="flex gap-2">
            {DAYS.map((day) => {
                const isSelected = selectedDays.includes(day.value);
                return (
                    <Button
                        key={`${day.value}-${day.label}`} // Unique key
                        type="button"
                        variant={isSelected ? "primary" : "outline"}
                        size="icon"
                        className={`w-8 h-8 rounded-full text-xs transition-all ${isSelected
                            ? "bg-violet-600 hover:bg-violet-700 text-white border-violet-500"
                            : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white"
                            }`}
                        onClick={() => toggleDay(day.value)}
                    >
                        {day.label}
                    </Button>
                );
            })}
        </div>
    );
}
