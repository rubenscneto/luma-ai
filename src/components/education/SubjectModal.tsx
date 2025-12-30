import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, BookOpen, Target, BrainCircuit } from 'lucide-react';
import { useStudy } from '@/context/studyContext';

export function SubjectModal() {
    const { addSubject } = useStudy();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        goal: '',
        difficulty: 3
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Call context function (Need to update context signature first or pass extra data)
        // For now, assuming context update in next step or passing extra payload
        await addSubject(formData.name, formData.goal);
        setLoading(false);
        setOpen(false);
        setFormData({ name: '', goal: '', difficulty: 3 });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                    <Plus className="mr-2 h-4 w-4" /> Nova Matéria
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-violet-500" />
                        Adicionar Nova Matéria
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-zinc-400">Nome da Disciplina</Label>
                        <Input
                            id="name"
                            placeholder="Ex: Matemática, Inglês, Python..."
                            className="bg-zinc-800 border-zinc-700 focus:ring-violet-500"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="goal" className="text-zinc-400 flex items-center gap-2">
                            <Target className="h-4 w-4" /> Meta Principal
                        </Label>
                        <Input
                            id="goal"
                            placeholder="Ex: Passar no ENEM, Fluência B2..."
                            className="bg-zinc-800 border-zinc-700 focus:ring-violet-500"
                            value={formData.goal}
                            onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                        />
                    </div>

                    <div className="space-y-3">
                        <Label className="text-zinc-400 flex items-center gap-2">
                            <BrainCircuit className="h-4 w-4" /> Nível de Dificuldade (1-5)
                        </Label>
                        <div className="flex justify-between px-2">
                            {[1, 2, 3, 4, 5].map((level) => (
                                <button
                                    key={level}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, difficulty: level })}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${formData.difficulty === level
                                            ? 'bg-violet-600 text-white scale-110 shadow-lg shadow-violet-500/20'
                                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                        }`}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-center text-zinc-500 mt-2">
                            {formData.difficulty === 1 && "Muito Fácil"}
                            {formData.difficulty === 2 && "Fácil"}
                            {formData.difficulty === 3 && "Moderado"}
                            {formData.difficulty === 4 && "Difícil"}
                            {formData.difficulty === 5 && "Muito Difícil"}
                        </p>
                    </div>

                    <Button type="submit" disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700">
                        {loading ? 'Salvando...' : 'Criar Matéria'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
