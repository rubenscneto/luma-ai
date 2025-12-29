"use client";

import React, { useState } from "react";
import { useLibrary } from "@/context/libraryContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileText, Loader2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export default function BibliotecaPage() {
    const { items, addItem } = useLibrary();
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSimulateUpload = async () => {
        // Simulate PDF summary
        setLoading(true);
        try {
            // Mock text content since we can't really upload/parse client side easily without heavier deps
            const mockText = "Este é um texto simulado extraído de um PDF sobre Inteligência Artificial. A IA está transformando o mundo através da automação e análise de dados...";

            const res = await fetch("/api/resumo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: mockText }),
            });
            const data = await res.json();

            addItem({
                id: uuidv4(),
                title: url || "Documento Sem Nome",
                type: "pdf",
                summary: data.summary,
                tags: ["AI", "Uploaded"],
                addedAt: new Date().toISOString(),
            });
            setUrl("");
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold">Biblioteca Inteligente</h1>
                <p className="text-zinc-500">Seus materiais com resumos gerados por IA.</p>
            </header>

            {/* Upload Area */}
            <Card className="p-8 border-dashed border-2 flex flex-col items-center justify-center gap-4 bg-zinc-50/50 dark:bg-zinc-900/20">
                <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                    <Upload size={32} className="text-zinc-400" />
                </div>
                <div className="text-center">
                    <h3 className="font-semibold text-lg">Adicionar Material</h3>
                    <p className="text-sm text-zinc-500 mb-4">Cole o nome do arquivo para simular upload e resumo</p>
                    <div className="flex gap-2 max-w-sm mx-auto">
                        <Input
                            placeholder="Nome do arquivo..."
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                        />
                        <Button onClick={handleSimulateUpload} disabled={loading || !url}>
                            {loading ? <Loader2 className="animate-spin" /> : "Processar"}
                        </Button>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map(item => (
                    <Card key={item.id} className="flex flex-col p-6 h-full">
                        <div className="flex items-start gap-3 mb-4">
                            <FileText className="text-red-500 shrink-0" size={24} />
                            <div>
                                <h3 className="font-bold leading-tight">{item.title}</h3>
                                <span className="text-xs text-zinc-400">{new Date(item.addedAt).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-4 mb-4 flex-1">
                            {item.summary}
                        </p>

                        <div className="flex gap-2">
                            {item.tags.map(tag => (
                                <span key={tag} className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full uppercase tracking-wider font-semibold">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
