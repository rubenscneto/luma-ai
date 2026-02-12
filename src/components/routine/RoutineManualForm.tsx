"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { Loader2, Save } from "lucide-react";
import { FixedTaskInput } from "@/components/perdidao/FixedTaskInput";
import { useAuth } from "@/context/authContext";

export function RoutineManualForm() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState({
        occupation: "",
        wake_up_time: "07:00",
        bed_time: "23:00",
        goal: ""
    });
    const [fixedTasks, setFixedTasks] = useState<any[]>([]);

    useEffect(() => {
        if (!user) return;
        fetchData();
    }, [user]);

    const fetchData = async () => {
        try {
            const { data: p } = await supabase.from("routine_profiles").select("*").eq("user_id", user?.id).single();
            if (p) {
                setProfile({
                    occupation: p.occupation,
                    wake_up_time: p.wake_up_time,
                    bed_time: p.bed_time,
                    goal: p.goal || ""
                });
            }

            // fixed_blocks stores one row per day_of_week — group by title+start_time+end_time
            const { data: f } = await supabase.from("fixed_blocks").select("*").eq("user_id", user?.id).eq("is_active", true);
            if (f && f.length > 0) {
                const grouped: Record<string, any> = {};
                for (const block of f) {
                    const key = `${block.title}|${block.start_time}|${block.end_time}`;
                    if (!grouped[key]) {
                        grouped[key] = {
                            title: block.title,
                            start_time: block.start_time,
                            end_time: block.end_time,
                            days_of_week: [],
                        };
                    }
                    grouped[key].days_of_week.push(block.day_of_week);
                }
                setFixedTasks(Object.values(grouped));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // Save Profile
            const { error: pErr } = await supabase.from("routine_profiles").upsert({
                user_id: user?.id,
                ...profile
            });
            if (pErr) throw pErr;

            // Save Fixed Blocks — delete existing and re-insert
            // fixed_blocks has one row per day, so we expand days_of_week arrays
            await supabase.from("fixed_blocks").delete().eq("user_id", user?.id);

            const fixedToInsert: any[] = [];
            for (const t of fixedTasks) {
                const days = t.days_of_week || t.days || [];
                for (const day of days) {
                    fixedToInsert.push({
                        user_id: user?.id,
                        title: t.title,
                        start_time: t.start_time,
                        end_time: t.end_time,
                        day_of_week: day,
                        category: 'fixed',
                        is_active: true,
                    });
                }
            }

            if (fixedToInsert.length > 0) {
                const { error: fErr } = await supabase.from("fixed_blocks").insert(fixedToInsert);
                if (fErr) throw fErr;
            }

            alert("Rotina salva com sucesso!");

        } catch (error: any) {
            alert("Erro ao salvar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Ocupação / Cargo</label>
                    <Input
                        value={profile.occupation}
                        onChange={e => setProfile({ ...profile, occupation: e.target.value })}
                        placeholder="Ex: Estudante de Medicina"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Objetivo Principal</label>
                    <Input
                        value={profile.goal}
                        onChange={e => setProfile({ ...profile, goal: e.target.value })}
                        placeholder="Ex: Passar na Residência"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Horário de Acordar</label>
                    <Input
                        type="time"
                        value={profile.wake_up_time}
                        onChange={e => setProfile({ ...profile, wake_up_time: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Horário de Dormir</label>
                    <Input
                        type="time"
                        value={profile.bed_time}
                        onChange={e => setProfile({ ...profile, bed_time: e.target.value })}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Compromissos Fixos (Trabalho, Aulas)</label>
                <FixedTaskInput tasks={fixedTasks} onChange={setFixedTasks} />
            </div>

            <Button onClick={handleSave} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={18} />}
                Salvar Configuração
            </Button>
        </div>
    );
}
