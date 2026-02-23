"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Compass, Settings, CheckCircle2, Loader2 } from "lucide-react";
import { RoutineManualForm } from "@/components/routine/RoutineManualForm";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/context/authContext";
import { supabase } from "@/lib/supabase";

interface RoutineProfile {
    occupation?: string;
    peak_productivity?: string;
    wake_up_time?: string;
    bed_time?: string;
    style?: string;
}

export default function RoutineCentralPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [profile, setProfile] = useState<RoutineProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProfile() {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const { data } = await supabase
                    .from("routine_profiles")
                    .select("*")
                    .eq("user_id", user.id)
                    .single();

                setProfile(data);
            } catch (error) {
                console.error("Error loading profile:", error);
            } finally {
                setLoading(false);
            }
        }

        loadProfile();
    }, [user]);

    const translateOccupation = (occ?: string) => {
        if (!occ) return "Não definido";
        return occ; // Already user-entered text
    };

    const translateFocusPeak = (peak?: string) => {
        const map: Record<string, string> = {
            morning: "Manhã",
            manha: "Manhã",
            afternoon: "Tarde",
            tarde: "Tarde",
            night: "Noite",
            noite: "Noite",
        };
        return peak ? map[peak.toLowerCase()] || peak : "Não definido";
    };

    const formatSleep = () => {
        if (!profile?.wake_up_time && !profile?.bed_time) return "Não definido";
        return `${profile?.wake_up_time || "?"} - ${profile?.bed_time || "?"}`;
    };

    return (
        <div className="space-y-8 p-6 pb-24">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold tracking-tight">Central de Rotina</h1>
                <p className="text-zinc-500">Gerencie como a IA entende e organiza seu dia.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Option A: Meu Planejador */}
                <Card className="p-6 space-y-4 border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-violet-500/50 transition-colors group cursor-pointer relative overflow-hidden"
                    onClick={() => router.push("/onboarding-rotina")}>
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Compass size={120} />
                    </div>

                    <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 text-violet-600 rounded-xl flex items-center justify-center mb-4">
                        <Compass size={24} />
                    </div>

                    <div>
                        <h2 className="text-xl font-semibold mb-2">Estou Perdido</h2>
                        <p className="text-zinc-500 text-sm leading-relaxed">
                            Não tenho uma rotina definida. Quero que a IA analise meu perfil, sono e objetivos para criar um cronograma do zero.
                        </p>
                    </div>

                    <Button variant="outline" className="w-full">Iniciar 'O Perdidão'</Button>
                </Card>

                {/* Option B: Manual / Fixed */}
                <Dialog>
                    <DialogTrigger asChild>
                        <Card className="p-6 space-y-4 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 transition-colors cursor-pointer">
                            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                                <Settings size={24} />
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold mb-2">Já tenho Rotina</h2>
                                <p className="text-zinc-500 text-sm leading-relaxed">
                                    Quero apenas cadastrar meus horários fixos (Trabalho, Treino) e deixar a IA preencher as lacunas com foco.
                                </p>
                            </div>
                            <Button variant="outline" className="w-full">Editar Manualmente</Button>
                        </Card>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Configuração Manual de Rotina</DialogTitle>
                        </DialogHeader>
                        <RoutineManualForm />
                    </DialogContent>
                </Dialog>

            </div>

            <div className="mt-8 p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3 mb-4">
                    <CheckCircle2 className="text-green-500" size={20} />
                    <h3 className="font-semibold">Status da Configuração Atual</h3>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="animate-spin text-zinc-400" size={24} />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                            <p className="text-zinc-400 text-xs uppercase font-bold mb-1">Perfil</p>
                            <p className="font-medium">{translateOccupation(profile?.occupation)}</p>
                        </div>
                        <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                            <p className="text-zinc-400 text-xs uppercase font-bold mb-1">Sono</p>
                            <p className="font-medium">{formatSleep()}</p>
                        </div>
                        <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                            <p className="text-zinc-400 text-xs uppercase font-bold mb-1">Foco</p>
                            <p className="font-medium">{translateFocusPeak(profile?.peak_productivity)}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
