"use client";

import FixedBlocksManager from "@/components/agenda/FixedBlocksManager";

export default function RotinaPage() {
    return (
        <div className="container max-w-4xl mx-auto py-8 px-4 pb-24">
            <h1 className="text-3xl font-bold text-white mb-2">Minha Rotina</h1>
            <p className="text-white/60 mb-8">Gerencie seus compromissos fixos e horários base.</p>

            <FixedBlocksManager />
        </div>
    );
}
