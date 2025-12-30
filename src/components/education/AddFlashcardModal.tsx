import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Layers, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AddFlashcardModalProps {
    subjectId: string;
    onCardAdded: () => void;
}

export function AddFlashcardModal({ subjectId, onCardAdded }: AddFlashcardModalProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [front, setFront] = useState('');
    const [back, setBack] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('flashcards')
            .insert([{
                subject_id: subjectId,
                user_id: user.id,
                front,
                back,
                next_review: new Date().toISOString(), // Ready to review immediately
                interval: 0,
                ease_factor: 2.5
            }]);

        if (error) {
            console.error('Error adding flashcard:', error);
            alert('Erro ao adicionar flashcard');
        } else {
            onCardAdded();
            setOpen(false);
            setFront('');
            setBack('');
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                    <Plus className="mr-2 h-4 w-4" /> Novo Flashcard
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-zinc-900 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-violet-500" />
                        Criar Flashcard
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="front">Frente (Pergunta)</Label>
                        <Input
                            id="front"
                            placeholder="Ex: Qual a fórmula de Bhaskara?"
                            className="bg-zinc-800 border-zinc-700"
                            value={front}
                            onChange={e => setFront(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="back">Verso (Resposta)</Label>
                        <textarea
                            id="back"
                            placeholder="Ex: x = (-b ± √(b² - 4ac)) / 2a"
                            className="w-full h-32 bg-zinc-800 border-zinc-700 rounded-md p-3 text-sm focus:ring-violet-500 focus:outline-none"
                            value={back}
                            onChange={e => setBack(e.target.value)}
                            required
                        />
                    </div>

                    <Button type="submit" disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700 mt-4">
                        {loading ? 'Salvando...' : 'Criar Carta'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
