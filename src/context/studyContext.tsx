"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { StudySession } from '@/types';

interface StudyContextType {
    sessions: StudySession[];
    addSession: (session: StudySession) => void;
    subjects: string[];
    addSubject: (subject: string) => void;
}

const StudyContext = createContext<StudyContextType | undefined>(undefined);

export function StudyProvider({ children }: { children: React.ReactNode }) {
    const [sessions, setSessionsState] = useState<StudySession[]>([]);
    const [subjects, setSubjectsState] = useState<string[]>([]);

    useEffect(() => {
        const savedSessions = localStorage.getItem('luma_study_sessions');
        const savedSubjects = localStorage.getItem('luma_subjects');
        if (savedSessions) setSessionsState(JSON.parse(savedSessions));
        if (savedSubjects) setSubjectsState(JSON.parse(savedSubjects));
    }, []);

    const addSession = (session: StudySession) => {
        const updated = [...sessions, session];
        setSessionsState(updated);
        localStorage.setItem('luma_study_sessions', JSON.stringify(updated));
    };

    const addSubject = (subject: string) => {
        if (!subjects.includes(subject)) {
            const updated = [...subjects, subject];
            setSubjectsState(updated);
            localStorage.setItem('luma_subjects', JSON.stringify(updated));
        }
    };

    return (
        <StudyContext.Provider value={{ sessions, addSession, subjects, addSubject }}>
            {children}
        </StudyContext.Provider>
    );
}

export const useStudy = () => {
    const context = useContext(StudyContext);
    if (!context) throw new Error('useStudy must be used within a StudyProvider');
    return context;
};
