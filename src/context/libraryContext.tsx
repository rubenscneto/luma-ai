"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { LibraryItem } from '@/types';

interface LibraryContextType {
    items: LibraryItem[];
    addItem: (item: LibraryItem) => void;
    updateItem: (id: string, updates: Partial<LibraryItem>) => void;
    removeItem: (id: string) => void;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
    const [items, setItemsState] = useState<LibraryItem[]>([]);

    useEffect(() => {
        const savedItems = localStorage.getItem('luma_library');
        if (savedItems) setItemsState(JSON.parse(savedItems));
    }, []);

    const saveItems = (newItems: LibraryItem[]) => {
        setItemsState(newItems);
        localStorage.setItem('luma_library', JSON.stringify(newItems));
    };

    const addItem = (item: LibraryItem) => {
        saveItems([...items, item]);
    };

    const updateItem = (id: string, updates: Partial<LibraryItem>) => {
        const updated = items.map(i => i.id === id ? { ...i, ...updates } : i);
        saveItems(updated);
    };

    const removeItem = (id: string) => {
        const updated = items.filter(i => i.id !== id);
        saveItems(updated);
    };

    return (
        <LibraryContext.Provider value={{ items, addItem, updateItem, removeItem }}>
            {children}
        </LibraryContext.Provider>
    );
}

export const useLibrary = () => {
    const context = useContext(LibraryContext);
    if (!context) throw new Error('useLibrary must be used within a LibraryProvider');
    return context;
};
