"use client";

import React, { useState, useEffect } from 'react';
import { useRoutine } from '@/context/routineContext';
import { useAuth } from '@/context/authContext';
import FixedBlocksManager from '@/components/agenda/FixedBlocksManager';
import { SleepCycleStep } from '@/components/perdidao/SleepCycleStep';
import { Save, Loader2, User, Clock, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function RotinaPage() {
    const { profile, setProfile } = useRoutine();
    const { user } = useAuth();

    const [isSaving, setIsSaving] = useState(false);
    const [description, setDescription] = useState("");
    const [peakProductivity, setPeakProductivity] = useState("Constante");
    const [userSettings, setUserSettings] = useState({ wake_up_time: "07:00", bed_time: "23:00" });

    useEffect(() => {
        if (profile) {
            setDescription(profile.description || "");
            setPeakProductivity(profile.peakProductivity || "Constante");
            if (profile.userSettings) {
                setUserSettings({
                    wake_up_time: profile.userSettings.wake_up_time || "07:00",
                    bed_time: profile.userSettings.bed_time || "23:00"
                });
            }
        }
    }, [profile]);

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        const toastId = toast.loading("Salvando preferências...");

        try {
            const payload = {
                ...profile,
                description,
                peakProductivity,
                energyLevel: peakProductivity,
                userSettings: { ...userSettings, user_id: user.id }
            };

            const res = await fetch('/api/ai/onboarding/save-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id, ...payload })
            });

            if (!res.ok) throw new Error("Erro ao salvar perfil");

            setProfile(payload as any);
            toast.success("Preferências atualizadas com sucesso!", { id: toastId });
        } catch (e) {
            console.error(e);
            toast.error("Erro ao salvar", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="container max-w-4xl mx-auto py-8 px-4 pb-24 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Minha Rotina</h1>
                    <p className="text-muted mt-1">Gerencie suas preferências, horários base e compromissos fixos.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary text-white rounded-xl font-medium hover:bg-brand-primary/90 transition-all disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar Alterações
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Preferências Essenciais */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="md:col-span-2 space-y-6">
                    <section className="bg-surface border border-card-border p-6 rounded-2xl relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <User className="w-5 h-5 text-blue-500" />
                            </div>
                            <h2 className="text-xl font-semibold text-foreground">Como é o seu dia?</h2>
                        </div>
                        <p className="text-sm text-muted mb-4">
                            Descreva suas necessidades para que a IA possa planejar de forma personalizada.
                        </p>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Descreva sua rotina ideal ou restrições..."
                            className="w-full h-32 p-4 rounded-xl bg-input border border-input-border text-foreground text-sm resize-none focus:ring-2 focus:ring-brand-primary focus:outline-none placeholder:text-muted/50"
                        />
                    </section>

                    <section className="bg-surface border border-card-border p-6 rounded-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-indigo-500/10 rounded-lg">
                                <Clock className="w-5 h-5 text-indigo-500" />
                            </div>
                            <h2 className="text-xl font-semibold text-foreground">Relógio Biológico</h2>
                        </div>

                        <div className="space-y-6">
                            <SleepCycleStep
                                value={{ user_id: '', ...userSettings }}
                                onChange={(settings) => setUserSettings({
                                    wake_up_time: settings.wake_up_time,
                                    bed_time: settings.bed_time,
                                })}
                            />

                            <div>
                                <label className="text-sm font-medium text-foreground block mb-3">
                                    Pico de Produtividade (Energia)
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { label: "Manhã", emoji: "🌅" },
                                        { label: "Constante", emoji: "⚡" },
                                        { label: "Noite", emoji: "🌙" }
                                    ].map(opt => (
                                        <button
                                            key={opt.label}
                                            onClick={() => setPeakProductivity(opt.label)}
                                            className={`p-3 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 ${peakProductivity === opt.label
                                                    ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                                                    : 'bg-foreground/5 border-card-border hover:bg-foreground/10 text-muted hover:text-foreground'
                                                }`}
                                        >
                                            <span className="text-xl">{opt.emoji}</span>
                                            <span className="text-xs font-medium">{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>
                </motion.div>

                {/* Compromissos Fixos (Sidebar on Desktop) */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="md:col-span-1">
                    <section className="bg-surface border border-card-border p-6 rounded-2xl h-full">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-pink-500/10 rounded-lg">
                                <Calendar className="w-5 h-5 text-pink-500" />
                            </div>
                            <h2 className="text-xl font-semibold text-foreground">Regras Fixas</h2>
                        </div>

                        <div className="relative -mx-2 -mt-2">
                            <FixedBlocksManager />
                        </div>
                    </section>
                </motion.div>
            </div>
        </div>
    );
}
