"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { StudySession, Subject } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from './authContext';

interface StudyContextType {
    sessions: StudySession[];
    addSession: (session: StudySession) => void;
    subjects: Subject[];
    addSubject: (name: string, goal?: string) => Promise<void>;
    removeSubject: (id: string) => Promise<void>;
    loading: boolean;
}

const StudyContext = createContext<StudyContextType | undefined>(undefined);

export function StudyProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [sessions, setSessionsState] = useState<StudySession[]>([]);
    const [subjects, setSubjectsState] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchSubjects = async () => {
            const { data, error } = await supabase
                .from('subjects')
                .select('*')
                .order('created_at', { ascending: true });

            if (data && !error) {
                setSubjectsState(data as Subject[]);
            }
            setLoading(false);
        };

        fetchSubjects();

        // TODO: Load sessions from DB when table exists
        const savedSessions = localStorage.getItem('luma_study_sessions');
        if (savedSessions) setSessionsState(JSON.parse(savedSessions));

    }, [user]);

    const addSession = (session: StudySession) => {
        const updated = [...sessions, session];
        setSessionsState(updated);
        localStorage.setItem('luma_study_sessions', JSON.stringify(updated));
    };

    const addSubject = async (name: string, goal: string = "", difficulty: number = 3) => {
        if (!user) return;

        // Optimistic UI
        const tempId = crypto.randomUUID();
        const newSubject: Subject = {
            id: tempId,
            user_id: user.id,
            name,
            goal,
            color: '#6366f1',
            difficulty,
            created_at: new Date().toISOString()
        };

        setSubjectsState([...subjects, newSubject]);

        const { data, error } = await supabase
            .from('subjects')
            .insert([{ user_id: user.id, name, goal, difficulty }])
            .select()
            .single();

        if (error) {
            console.error("Error creating subject:", error);
            // Revert optimistic update
            setSubjectsState(prev => prev.filter(s => s.id !== tempId));
        } else if (data) {
            // Replace temp ID with real ID
            setSubjectsState(prev => prev.map(s => s.id === tempId ? (data as Subject) : s));
        }
    };

    const removeSubject = async (id: string) => {
        setSubjectsState(prev => prev.filter(s => s.id !== id));
        if (user) {
            await supabase.from('subjects').delete().eq('id', id);
        }
    };

    return (
        <StudyContext.Provider value={{ sessions, addSession, subjects, addSubject, removeSubject, loading }}>
            {children}
        </StudyContext.Provider>
    );
}

export const useStudy = () => {
    const context = useContext(StudyContext);
    if (!context) throw new Error('useStudy must be used within a StudyProvider');
    return context;
};
