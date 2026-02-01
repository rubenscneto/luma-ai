"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { HealthProfile, ShoppingList, ShoppingItem } from '@/types';
import { useAuth } from './authContext';
import { supabase } from '@/lib/supabase';

interface HealthContextType {
    // State
    healthProfile: HealthProfile | null;
    shoppingLists: ShoppingList[];
    isLoading: boolean;
    hasCompletedOnboarding: boolean;

    // Actions
    loadHealthProfile: () => Promise<void>;
    saveHealthProfile: (profile: Partial<HealthProfile>) => Promise<void>;
    loadShoppingLists: () => Promise<void>;
    createShoppingList: (title: string, items: ShoppingItem[]) => Promise<void>;
    toggleShoppingItem: (listId: string, itemIndex: number) => Promise<void>;
    deleteShoppingList: (listId: string) => Promise<void>;
    generateMealSuggestion: (mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => Promise<any>;
    generateShoppingList: (forWhat: string, days: number) => Promise<void>;
}

const HealthContext = createContext<HealthContextType | undefined>(undefined);

export function HealthProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [healthProfile, setHealthProfile] = useState<HealthProfile | null>(null);
    const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const loadHealthProfile = useCallback(async () => {
        if (!user) return;

        const { data } = await supabase
            .from('health_profile')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (data) {
            setHealthProfile({
                ...data,
                dietary_preferences: data.dietary_preferences || [],
                allergies_restrictions: data.allergies_restrictions || [],
                equipment: data.equipment || [],
            });
        }
    }, [user]);

    const saveHealthProfile = async (profile: Partial<HealthProfile>) => {
        if (!user) return;

        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('health_profile')
                .upsert({
                    user_id: user.id,
                    ...profile,
                    updated_at: new Date().toISOString(),
                });

            if (!error) {
                await loadHealthProfile();
            }
        } catch (error) {
            console.error('Save health profile error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadShoppingLists = useCallback(async () => {
        if (!user) return;

        const { data } = await supabase
            .from('shopping_list')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        setShoppingLists(data || []);
    }, [user]);

    const createShoppingList = async (title: string, items: ShoppingItem[]) => {
        if (!user) return;

        const { error } = await supabase
            .from('shopping_list')
            .insert({
                user_id: user.id,
                title,
                items,
                source: 'manual',
            });

        if (!error) {
            await loadShoppingLists();
        }
    };

    const toggleShoppingItem = async (listId: string, itemIndex: number) => {
        if (!user) return;

        const list = shoppingLists.find(l => l.id === listId);
        if (!list) return;

        const updatedItems = [...list.items];
        updatedItems[itemIndex] = {
            ...updatedItems[itemIndex],
            checked: !updatedItems[itemIndex].checked,
        };

        const { error } = await supabase
            .from('shopping_list')
            .update({ items: updatedItems })
            .eq('id', listId)
            .eq('user_id', user.id);

        if (!error) {
            setShoppingLists(prev => prev.map(l =>
                l.id === listId ? { ...l, items: updatedItems } : l
            ));
        }
    };

    const deleteShoppingList = async (listId: string) => {
        if (!user) return;

        const { error } = await supabase
            .from('shopping_list')
            .delete()
            .eq('id', listId)
            .eq('user_id', user.id);

        if (!error) {
            setShoppingLists(prev => prev.filter(l => l.id !== listId));
        }
    };

    const generateMealSuggestion = async (mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
        if (!user) return null;

        try {
            const response = await fetch('/api/ai/health/meal-suggestion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    meal_type: mealType,
                }),
            });

            const data = await response.json();
            return data.success ? data.suggestion : data;
        } catch (error) {
            console.error('Generate meal suggestion error:', error);
            return null;
        }
    };

    const generateShoppingList = async (forWhat: string, days: number) => {
        if (!user) return;

        setIsLoading(true);
        try {
            const response = await fetch('/api/ai/health/shopping-list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    focus: forWhat,
                    days: days,
                }),
            });

            const data = await response.json();

            if (data.success) {
                await loadShoppingLists();
            }
        } catch (error) {
            console.error('Generate shopping list error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Load on mount
    useEffect(() => {
        loadHealthProfile();
        loadShoppingLists();
    }, [loadHealthProfile, loadShoppingLists]);

    const hasCompletedOnboarding = Boolean(healthProfile?.goal);

    return (
        <HealthContext.Provider value={{
            healthProfile,
            shoppingLists,
            isLoading,
            hasCompletedOnboarding,
            loadHealthProfile,
            saveHealthProfile,
            loadShoppingLists,
            createShoppingList,
            toggleShoppingItem,
            deleteShoppingList,
            generateMealSuggestion,
            generateShoppingList,
        }}>
            {children}
        </HealthContext.Provider>
    );
}

export const useHealth = () => {
    const context = useContext(HealthContext);
    if (!context) throw new Error('useHealth must be used within a HealthProvider');
    return context;
};
