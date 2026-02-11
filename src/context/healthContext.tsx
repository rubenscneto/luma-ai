"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { HealthProfile, ShoppingList, ShoppingItem } from '@/types';
import { useAuth } from './authContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────
export interface PlannedMealDB {
    id: string;
    user_id: string;
    date: string;
    meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    name: string;
    description?: string;
    prep_time_min?: number;
    ingredients?: any[];
    instructions?: string[];
    nutrition?: { calories?: number; protein?: number; carbs?: number; fat?: number };
    why_fits_user?: string;
    alternatives?: { mealTitle: string; keyChange: string }[];
    created_at?: string;
}

export interface PantryItem {
    id: string;
    user_id: string;
    name: string;
    category?: string;
    unit: string;
    qty_current: number;
    qty_min: number;
    last_updated?: string;
}

export interface UserPreference {
    id: string;
    user_id: string;
    category: string;
    item_name: string;
    preference_type: 'like' | 'dislike' | 'never';
    created_at?: string;
}

interface HealthContextType {
    // State
    healthProfile: HealthProfile | null;
    shoppingLists: ShoppingList[];
    plannedMeals: PlannedMealDB[];
    pantryItems: PantryItem[];
    isLoading: boolean;
    hasCompletedOnboarding: boolean;

    // Health Profile
    loadHealthProfile: () => Promise<void>;
    saveHealthProfile: (profile: Partial<HealthProfile>) => Promise<void>;

    // Planned Meals
    loadPlannedMeals: (startDate?: string, endDate?: string) => Promise<void>;
    generateMealSuggestion: (mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => Promise<any>;

    // Shopping
    loadShoppingLists: () => Promise<void>;
    createShoppingList: (title: string, items: ShoppingItem[]) => Promise<void>;
    toggleShoppingItem: (listId: string, itemIndex: number) => Promise<void>;
    deleteShoppingList: (listId: string) => Promise<void>;
    generateShoppingList: (forWhat: string, days: number) => Promise<void>;

    // Pantry
    loadPantryItems: () => Promise<void>;
    addPantryItem: (item: Omit<PantryItem, 'id' | 'user_id'>) => Promise<void>;
    updatePantryItem: (id: string, updates: Partial<PantryItem>) => Promise<void>;
    deletePantryItem: (id: string) => Promise<void>;

    // User Preferences / Feedback
    saveFeedback: (category: string, itemName: string, type: 'like' | 'dislike' | 'never') => Promise<void>;
}

const HealthContext = createContext<HealthContextType | undefined>(undefined);

export function HealthProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [healthProfile, setHealthProfile] = useState<HealthProfile | null>(null);
    const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
    const [plannedMeals, setPlannedMeals] = useState<PlannedMealDB[]>([]);
    const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // ─── Health Profile ─────────────────────────────────────
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
                toast.success('Perfil de saúde salvo com sucesso!');
            } else {
                throw error;
            }
        } catch (error) {
            console.error('Save health profile error:', error);
            toast.error('Erro ao salvar perfil. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Planned Meals ──────────────────────────────────────
    const loadPlannedMeals = useCallback(async (startDate?: string, endDate?: string) => {
        if (!user) return;

        let query = supabase
            .from('planned_meals')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: true });

        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);

        const { data } = await query;
        setPlannedMeals(data || []);
    }, [user]);

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

            if (data.success) {
                // Refresh planned meals to show new one
                await loadPlannedMeals();
                return data.suggestion;
            } else {
                throw new Error(data.errorMessage || 'Erro ao gerar sugestão');
            }
        } catch (error: any) {
            console.error('Generate meal suggestion error:', error);
            toast.error(error.message || 'Erro ao gerar sugestão de refeição.');
            return null;
        }
    };

    // ─── Shopping Lists ─────────────────────────────────────
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

        // Optimistic update
        setShoppingLists(prev => prev.map(l =>
            l.id === listId ? { ...l, items: updatedItems } : l
        ));

        const { error } = await supabase
            .from('shopping_list')
            .update({ items: updatedItems })
            .eq('id', listId)
            .eq('user_id', user.id);

        if (error) {
            // Revert on error
            setShoppingLists(prev => prev.map(l =>
                l.id === listId ? list : l
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
                toast.success('Lista de compras gerada!');
            } else {
                toast.error(data.errorMessage || 'Erro ao gerar lista.');
            }
        } catch (error) {
            console.error('Generate shopping list error:', error);
            toast.error('Erro ao gerar lista de compras.');
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Pantry ─────────────────────────────────────────────
    const loadPantryItems = useCallback(async () => {
        if (!user) return;

        const { data } = await supabase
            .from('pantry_items')
            .select('*')
            .eq('user_id', user.id)
            .order('category', { ascending: true });

        setPantryItems(data || []);
    }, [user]);

    const addPantryItem = async (item: Omit<PantryItem, 'id' | 'user_id'>) => {
        if (!user) return;

        const { error } = await supabase
            .from('pantry_items')
            .insert({ ...item, user_id: user.id });

        if (!error) {
            await loadPantryItems();
            toast.success(`${item.name} adicionado à despensa!`);
        } else {
            toast.error('Erro ao adicionar item.');
        }
    };

    const updatePantryItem = async (id: string, updates: Partial<PantryItem>) => {
        if (!user) return;

        const { error } = await supabase
            .from('pantry_items')
            .update({ ...updates, last_updated: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', user.id);

        if (!error) {
            setPantryItems(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
        }
    };

    const deletePantryItem = async (id: string) => {
        if (!user) return;

        const { error } = await supabase
            .from('pantry_items')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (!error) {
            setPantryItems(prev => prev.filter(p => p.id !== id));
            toast.success('Item removido da despensa.');
        }
    };

    // ─── User Preferences / Feedback ────────────────────────
    const saveFeedback = async (category: string, itemName: string, type: 'like' | 'dislike' | 'never') => {
        if (!user) return;

        const { error } = await supabase
            .from('user_preferences')
            .upsert({
                user_id: user.id,
                category,
                item_name: itemName,
                preference_type: type,
            });

        if (!error) {
            const emoji = type === 'like' ? '👍' : type === 'dislike' ? '👎' : '🚫';
            toast.success(`${emoji} Preferência salva para "${itemName}"`);
        }
    };

    // ─── Load on mount ──────────────────────────────────────
    useEffect(() => {
        loadHealthProfile();
        loadShoppingLists();
        loadPlannedMeals();
        loadPantryItems();
    }, [loadHealthProfile, loadShoppingLists, loadPlannedMeals, loadPantryItems]);

    const hasCompletedOnboarding = Boolean(healthProfile?.goal);

    return (
        <HealthContext.Provider value={{
            healthProfile,
            shoppingLists,
            plannedMeals,
            pantryItems,
            isLoading,
            hasCompletedOnboarding,
            loadHealthProfile,
            saveHealthProfile,
            loadPlannedMeals,
            generateMealSuggestion,
            loadShoppingLists,
            createShoppingList,
            toggleShoppingItem,
            deleteShoppingList,
            generateShoppingList,
            loadPantryItems,
            addPantryItem,
            updatePantryItem,
            deletePantryItem,
            saveFeedback,
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
