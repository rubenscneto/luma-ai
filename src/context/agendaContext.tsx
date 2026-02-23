"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export interface AgendaFeedback {
    blockId: string;
    dayKey: string;
    title: string;
    originalTime: string;
    type: 'bad_time' | 'unrealistic' | 'dislike';
}

interface AgendaContextType {
    pendingFeedbacks: AgendaFeedback[];
    addFeedback: (feedback: AgendaFeedback) => void;
    removeFeedback: (blockId: string) => void;
    clearFeedbacks: () => void;
}

const AgendaContext = createContext<AgendaContextType | undefined>(undefined);

export function AgendaProvider({ children }: { children: ReactNode }) {
    const [pendingFeedbacks, setPendingFeedbacks] = useState<AgendaFeedback[]>([]);

    const addFeedback = (feedback: AgendaFeedback) => {
        setPendingFeedbacks(prev => {
            const exists = prev.findIndex(f => f.blockId === feedback.blockId);
            if (exists >= 0) {
                const newArr = [...prev];
                newArr[exists] = feedback;
                return newArr;
            }
            return [...prev, feedback];
        });
    };

    const removeFeedback = (blockId: string) => {
        setPendingFeedbacks(prev => prev.filter(f => f.blockId !== blockId));
    };

    const clearFeedbacks = () => {
        setPendingFeedbacks([]);
    };

    return (
        <AgendaContext.Provider
            value={{
                pendingFeedbacks,
                addFeedback,
                removeFeedback,
                clearFeedbacks,
            }}
        >
            {children}
        </AgendaContext.Provider>
    );
}

export function useAgenda() {
    const context = useContext(AgendaContext);
    if (context === undefined) {
        throw new Error("useAgenda must be used within an AgendaProvider");
    }
    return context;
}
