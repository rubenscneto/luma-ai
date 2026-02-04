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
                    if (parsed && parsed.author && parsed.author !== "Luma AI") {
                        setMotivationState(parsed);
                    } else {
                        // Force refresh if generic or old format
                        setMotivationState(null);
                    }
                } catch (e) {
                    setMotivationState(null);
                }
            }

            if (user) {
                // Load Routines (Legacy)
                const { data: routinesData, error: routinesError } = await supabase
                    .from('routines')
                    .select('*')
                    .order('start_time', { ascending: true });

                if (routinesData && !routinesError && routinesData.length > 0) {
                    const dbRoutines: RoutineBlock[] = routinesData.map(r => ({
                        id: r.id,
                        title: r.title,
                        startTime: r.start_time.slice(0, 5),
                        duration: r.duration,
                        type: r.type as any,
                        completed: false
                    }));
                    setRoutineState(dbRoutines);
                }

                // Load Profile and Fixed Tasks
                try {
                    const [profileRes, fixedRes] = await Promise.all([
                        supabase.from('profiles').select('*').eq('id', user.id).single(),
                        supabase.from('fixed_blocks').select('*').eq('user_id', user.id)
                    ]);

                    if (profileRes.data) {
                        const p = profileRes.data;
                        const loadedProfile: RoutineProfile = {
                            occupation: p.occupation || '',
                            peakProductivity: p.peak_productivity || '',
                            energyLevel: p.energy_level || '',
                            style: p.style || 'balanced',
                            userSettings: {
                                user_id: user.id,
                                wake_up_time: p.wake_up_time || '07:00',
                                bed_time: p.bed_time || '22:00'
                            },
                            fixedTasks: (fixedRes.data || []).map((f: any) => ({
                                id: f.id,
                                user_id: f.user_id,
                                title: f.title,
                                start_time: f.start_time?.slice(0, 5) || '00:00',
                                end_time: f.end_time?.slice(0, 5) || '00:00',
                                days_of_week: [f.day_of_week]
                            }))
                        };
                        setProfileState(loadedProfile);
                        // Update local storage
                        localStorage.setItem('luma_profile', JSON.stringify(loadedProfile));
                    }
                } catch (e) {
                    console.error("Error loading profile:", e);
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

    const setProfile = async (newProfile: RoutineProfile) => {
        setProfileState(newProfile);
        localStorage.setItem('luma_profile', JSON.stringify(newProfile));

        if (user) {
            try {
                // Update specific profile fields
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        occupation: newProfile.occupation,
                        peak_productivity: newProfile.peakProductivity,
                        energy_level: newProfile.energyLevel,
                        style: newProfile.style,
                        wake_up_time: newProfile.userSettings?.wake_up_time,
                        bed_time: newProfile.userSettings?.bed_time
                    })
                    .eq('id', user.id);

                if (error) console.error("Failed to sync profile:", error);
            } catch (e) {
                console.error(e);
            }
        }
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
