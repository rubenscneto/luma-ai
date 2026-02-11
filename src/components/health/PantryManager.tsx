"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package, Plus, Minus, Trash2, AlertTriangle,
    Search, X, Edit2, Check
} from 'lucide-react';
import { useHealth, PantryItem } from '@/context/healthContext';
import { cn } from '@/lib/utils';

const CATEGORIES = [
    { value: 'frutas', label: 'Frutas', color: 'bg-green-500/20 text-green-400' },
    { value: 'verduras', label: 'Verduras', color: 'bg-emerald-500/20 text-emerald-400' },
    { value: 'proteinas', label: 'Proteínas', color: 'bg-red-500/20 text-red-400' },
    { value: 'graos', label: 'Grãos', color: 'bg-amber-500/20 text-amber-400' },
    { value: 'laticinios', label: 'Laticínios', color: 'bg-blue-500/20 text-blue-400' },
    { value: 'temperos', label: 'Temperos', color: 'bg-yellow-500/20 text-yellow-400' },
    { value: 'bebidas', label: 'Bebidas', color: 'bg-cyan-500/20 text-cyan-400' },
    { value: 'outros', label: 'Outros', color: 'bg-gray-500/20 text-gray-400' },
];

const UNITS = ['un', 'kg', 'g', 'L', 'ml', 'pacote', 'maço', 'dz'];

export default function PantryManager() {
    const { pantryItems, addPantryItem, updatePantryItem, deletePantryItem } = useHealth();
    const [showAdd, setShowAdd] = useState(false);
    const [search, setSearch] = useState('');
    const [newItem, setNewItem] = useState({
        name: '', category: 'outros', unit: 'un', qty_current: 1, qty_min: 0,
    });

    const filtered = pantryItems.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.category || '').toLowerCase().includes(search.toLowerCase())
    );

    const lowStockItems = pantryItems.filter(i => i.qty_current < i.qty_min);
    const grouped = filtered.reduce((acc, item) => {
        const cat = item.category || 'outros';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {} as Record<string, PantryItem[]>);

    const handleAdd = async () => {
        if (!newItem.name.trim()) return;
        await addPantryItem({
            name: newItem.name.trim(),
            category: newItem.category,
            unit: newItem.unit,
            qty_current: newItem.qty_current,
            qty_min: newItem.qty_min,
        });
        setNewItem({ name: '', category: 'outros', unit: 'un', qty_current: 1, qty_min: 0 });
        setShowAdd(false);
    };

    const handleQtyChange = async (item: PantryItem, delta: number) => {
        const newQty = Math.max(0, item.qty_current + delta);
        await updatePantryItem(item.id, { qty_current: newQty });
    };

    const getCategoryColor = (cat?: string) => {
        return CATEGORIES.find(c => c.value === cat)?.color || 'bg-gray-500/20 text-gray-400';
    };

    return (
        <div className="space-y-6">
            {/* Low stock alert */}
            {lowStockItems.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-medium text-amber-400">
                            {lowStockItems.length} {lowStockItems.length === 1 ? 'item' : 'itens'} abaixo do mínimo
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {lowStockItems.map(item => (
                            <span key={item.id} className="text-xs px-2 py-1 bg-amber-500/20 rounded-lg text-amber-300">
                                {item.name} ({item.qty_current}/{item.qty_min} {item.unit})
                            </span>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                        type="text"
                        placeholder="Buscar na despensa..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
                    />
                </div>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowAdd(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white text-sm font-medium shrink-0"
                >
                    <Plus className="w-4 h-4" />
                    Adicionar
                </motion.button>
            </div>

            {/* Add item form */}
            <AnimatePresence>
                {showAdd && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-white">Novo item</h4>
                                <button onClick={() => setShowAdd(false)}>
                                    <X className="w-4 h-4 text-white/40" />
                                </button>
                            </div>

                            <input
                                type="text"
                                placeholder="Nome do item"
                                value={newItem.name}
                                onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
                                autoFocus
                            />

                            <div className="grid grid-cols-2 gap-3">
                                <select
                                    value={newItem.category}
                                    onChange={e => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none"
                                >
                                    {CATEGORIES.map(c => (
                                        <option key={c.value} value={c.value} className="bg-[#1a1a2e]">{c.label}</option>
                                    ))}
                                </select>
                                <select
                                    value={newItem.unit}
                                    onChange={e => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none"
                                >
                                    {UNITS.map(u => (
                                        <option key={u} value={u} className="bg-[#1a1a2e]">{u}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-white/40 mb-1 block">Quantidade atual</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={newItem.qty_current}
                                        onChange={e => setNewItem(prev => ({ ...prev, qty_current: parseFloat(e.target.value) || 0 }))}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-white/40 mb-1 block">Mínimo desejado</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={newItem.qty_min}
                                        onChange={e => setNewItem(prev => ({ ...prev, qty_min: parseFloat(e.target.value) || 0 }))}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleAdd}
                                disabled={!newItem.name.trim()}
                                className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                            >
                                Adicionar à despensa
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Empty state */}
            {pantryItems.length === 0 && (
                <div className="text-center py-16">
                    <Package className="w-12 h-12 text-white/20 mx-auto mb-4" />
                    <p className="text-white/60 mb-2">Sua despensa está vazia</p>
                    <p className="text-sm text-white/40">
                        Adicione itens para que a IA considere o que você já tem ao gerar listas de compras.
                    </p>
                </div>
            )}

            {/* Items by category */}
            <div className="space-y-4">
                {Object.entries(grouped).map(([category, items]) => (
                    <div key={category}>
                        <span className={cn(
                            "inline-block text-xs px-2 py-0.5 rounded mb-2 capitalize",
                            getCategoryColor(category)
                        )}>
                            {CATEGORIES.find(c => c.value === category)?.label || category}
                        </span>

                        <div className="space-y-1">
                            {items.map(item => {
                                const isLow = item.qty_current < item.qty_min;
                                return (
                                    <motion.div
                                        key={item.id}
                                        layout
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-xl bg-white/5 border transition-colors",
                                            isLow ? "border-amber-500/20" : "border-white/5"
                                        )}
                                    >
                                        {/* Qty controls */}
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => handleQtyChange(item, -1)}
                                                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className={cn(
                                                "text-sm font-medium min-w-[2rem] text-center",
                                                isLow ? "text-amber-400" : "text-white"
                                            )}>
                                                {item.qty_current}
                                            </span>
                                            <button
                                                onClick={() => handleQtyChange(item, 1)}
                                                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>

                                        {/* Name & info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white truncate">{item.name}</p>
                                            <p className="text-xs text-white/40">
                                                {item.unit} • mín: {item.qty_min}
                                            </p>
                                        </div>

                                        {/* Low stock indicator */}
                                        {isLow && (
                                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                                        )}

                                        {/* Delete */}
                                        <button
                                            onClick={() => deletePantryItem(item.id)}
                                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors shrink-0"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
