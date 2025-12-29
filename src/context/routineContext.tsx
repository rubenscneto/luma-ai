"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { RoutineBlock, RoutineProfile } from '@/types';
import { useAuth } from './authContext';
import { supabase } from '@/lib/supabase';

interface RoutineContextType {
    routine: RoutineBlock[];
    addBlock: (block: RoutineBlock) => void;
    updateBlock: (id: string, updates: Partial<RoutineBlock>) => void;
    removeBlock: (id: string) => void;
    setRoutine: (routine: RoutineBlock[]) => void;
    profile: RoutineProfile | null;
    setProfile: (profile: RoutineProfile) => void;
    motivation: { text: string; author: string } | null;
    setMotivation: (data: { text: string; author: string }) => void;
}

const RoutineContext = createContext<RoutineContextType | undefined>(undefined);

export function RoutineProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [routine, setRoutineState] = useState<RoutineBlock[]>([]);
    const [profile, setProfileState] = useState<RoutineProfile | null>(null);
    const [motivation, setMotivationState] = useState<{ text: string; author: string } | null>(null);

    // Load Data (Local or Supabase)
    useEffect(() => {
        const loadData = async () => {
            // Always load profile/motivation from local for speed/fallback, 
            // but routines we prefer Supabase if logged in.
            const savedProfile = localStorage.getItem('luma_profile');
            const savedMotivation = localStorage.getItem('luma_motivation');
            if (savedProfile) setProfileState(JSON.parse(savedProfile));
            if (savedMotivation) {
                try {
                    const parsed = JSON.parse(savedMotivation);
                    if (typeof parsed === 'object' && parsed.text) {
                        setMotivationState(parsed);
                    } else {
                        // Migration: Old string format
                        setMotivationState({ text: savedMotivation, author: "Luma AI" });
                    }
                } catch (e) {
                    setMotivationState({ text: savedMotivation, author: "Luma AI" });
                }
            }

            if (user) {
                const { data, error } = await supabase
                    .from('routines')
                    .select('*')
                    .order('start_time', { ascending: true });

                if (data && !error && data.length > 0) {
                    // Map DB snake_case to TS camelCase
                    const dbRoutines: RoutineBlock[] = data.map(r => ({
                        id: r.id,
                        title: r.title,
                        startTime: r.start_time.slice(0, 5), // '07:00:00' -> '07:00'
                        duration: r.duration,
                        type: r.type as any,
                        completed: false // DB doesn't track daily completion yet
                    }));
                    setRoutineState(dbRoutines);
                    return;
                }
            }

            // Fallback to LocalStorage if no user or empty DB
            const savedRoutine = localStorage.getItem('luma_routine');
            if (savedRoutine) setRoutineState(JSON.parse(savedRoutine));
        };

        loadData();
    }, [user]);

    const saveToSupabase = async (newRoutine: RoutineBlock[]) => {
        if (!user) return;

        // Strategy: Replace all routines for user (Simple Template Sync)
        // 1. Delete all
        await supabase.from('routines').delete().eq('user_id', user.id);

        // 2. Insert new
        const rows = newRoutine.map(b => ({
            user_id: user.id,
            title: b.title,
            type: b.type,
            start_time: b.startTime,
            duration: b.duration
        }));

        await supabase.from('routines').insert(rows);
    };

    const setRoutine = (newRoutine: RoutineBlock[]) => {
        setRoutineState(newRoutine);
        localStorage.setItem('luma_routine', JSON.stringify(newRoutine));
        if (user) saveToSupabase(newRoutine);
    };

    const setProfile = (newProfile: RoutineProfile) => {
        setProfileState(newProfile);
        localStorage.setItem('luma_profile', JSON.stringify(newProfile));
        // TODO: Sync profile to DB too if needed
    };

    const setMotivation = (data: { text: string; author: string }) => {
        setMotivationState(data);
        localStorage.setItem('luma_motivation', JSON.stringify(data));
    };

    const addBlock = (block: RoutineBlock) => {
        const updated = [...routine, block];
        setRoutine(updated);
    };

    const updateBlock = (id: string, updates: Partial<RoutineBlock>) => {
        const updated = routine.map(b => b.id === id ? { ...b, ...updates } : b);
        setRoutine(updated);
    };

    const removeBlock = (id: string) => {
        const updated = routine.filter(b => b.id !== id);
        setRoutine(updated);
    };

    return (
        <RoutineContext.Provider value={{ routine, addBlock, updateBlock, removeBlock, setRoutine, profile, setProfile, motivation, setMotivation }}>
            {children}
        </RoutineContext.Provider>
    );
}

export const useRoutine = () => {
    const context = useContext(RoutineContext);
    if (!context) throw new Error('useRoutine must be used within a RoutineProvider');
    return context;
};
