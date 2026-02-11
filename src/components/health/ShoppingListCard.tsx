"use client";

import React from 'react';
import { motion } from 'framer-motion';
import {
    Check, Trash2, ShoppingCart, Package, Ban,
    RefreshCw
} from 'lucide-react';
import { ShoppingList, ShoppingItem } from '@/types';
import { useHealth } from '@/context/healthContext';
import { cn } from '@/lib/utils';

interface ShoppingListCardProps {
    list: ShoppingList;
}

const categoryColors: Record<string, string> = {
    frutas: 'bg-green-500/20 text-green-400',
    verduras: 'bg-emerald-500/20 text-emerald-400',
    proteinas: 'bg-red-500/20 text-red-400',
    graos: 'bg-amber-500/20 text-amber-400',
    laticinios: 'bg-blue-500/20 text-blue-400',
    temperos: 'bg-yellow-500/20 text-yellow-400',
    bebidas: 'bg-cyan-500/20 text-cyan-400',
    outros: 'bg-gray-500/20 text-gray-400',
};

export function ShoppingListCard({ list }: ShoppingListCardProps) {
    const { toggleShoppingItem, deleteShoppingList, addPantryItem, saveFeedback } = useHealth();

    const checkedCount = list.items.filter(i => i.checked).length;
    const progress = list.items.length > 0
        ? (checkedCount / list.items.length) * 100
        : 0;

    // Group items by category
    const groupedItems = list.items.reduce((acc, item, index) => {
        const cat = item.category || 'outros';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push({ ...item, originalIndex: index });
        return acc;
    }, {} as Record<string, (ShoppingItem & { originalIndex: number })[]>);

    const handleAlreadyHave = async (item: ShoppingItem & { originalIndex: number }) => {
        // Mark as checked + add to pantry
        await toggleShoppingItem(list.id, item.originalIndex);
        await addPantryItem({
            name: item.name,
            category: item.category || 'outros',
            unit: item.unit || 'un',
            qty_current: item.qty ? parseFloat(String(item.qty)) : 1,
            qty_min: 0,
        });
    };

    const handleDontConsume = async (item: ShoppingItem & { originalIndex: number }) => {
        // Mark as checked (remove from visible list) + save dislike
        await toggleShoppingItem(list.id, item.originalIndex);
        await saveFeedback('food', item.name, 'never');
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-primary/20 flex items-center justify-center">
                        <ShoppingCart className="w-5 h-5 text-brand-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">{list.title}</h3>
                        <p className="text-sm text-white/60">
                            {checkedCount}/{list.items.length} itens
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => deleteShoppingList(list.id)}
                    className="p-2 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-4">
                <motion.div
                    className="h-full bg-brand-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                />
            </div>

            {/* Items grouped by category */}
            <div className="space-y-4">
                {Object.entries(groupedItems).map(([category, items]) => (
                    <div key={category}>
                        <span className={cn(
                            "inline-block text-xs px-2 py-0.5 rounded mb-2 capitalize",
                            categoryColors[category] || categoryColors.outros
                        )}>
                            {category}
                        </span>

                        <div className="space-y-1">
                            {items.map((item) => (
                                <div
                                    key={item.originalIndex}
                                    className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                                >
                                    {/* Checkbox */}
                                    <button
                                        onClick={() => toggleShoppingItem(list.id, item.originalIndex)}
                                        className="shrink-0"
                                    >
                                        <div className={cn(
                                            "w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors",
                                            item.checked
                                                ? "bg-brand-primary border-brand-primary"
                                                : "border-white/20"
                                        )}>
                                            {item.checked && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                    </button>

                                    {/* Name */}
                                    <span className={cn(
                                        "flex-1 text-sm",
                                        item.checked ? "line-through text-white/40" : "text-white"
                                    )}>
                                        {item.name}
                                    </span>

                                    {/* Quantity */}
                                    {item.qty && (
                                        <span className="text-sm text-white/50 shrink-0">
                                            {item.qty} {item.unit || ''}
                                        </span>
                                    )}

                                    {/* Quick actions (visible on hover) */}
                                    {!item.checked && (
                                        <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => handleAlreadyHave(item)}
                                                title="Já tenho"
                                                className="p-1 rounded hover:bg-green-500/20 text-white/30 hover:text-green-400 transition-colors"
                                            >
                                                <Package className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDontConsume(item)}
                                                title="Não consumo"
                                                className="p-1 rounded hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors"
                                            >
                                                <Ban className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Source indicator */}
            {list.source === 'ai' && (
                <div className="mt-4 pt-3 border-t border-white/10">
                    <p className="text-xs text-white/40">Gerado por IA</p>
                </div>
            )}
        </motion.div>
    );
}
