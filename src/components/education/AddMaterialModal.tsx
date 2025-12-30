import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Link as LinkIcon, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AddMaterialModalProps {
    subjectId: string;
    onMaterialAdded: () => void;
}

export function AddMaterialModal({ subjectId, onMaterialAdded }: AddMaterialModalProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [type, setType] = useState<'link' | 'text'>('link');
    const [content, setContent] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('study_materials')
            .insert([{
                subject_id: subjectId,
                user_id: user.id,
                title,
                type,
                content
            }]);

        if (error) {
            console.error('Error adding material:', error);
            alert('Erro ao adicionar material');
        } else {
            onMaterialAdded();
            setOpen(false);
            setTitle('');
            setContent('');
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Adicionar Material</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-zinc-900 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-violet-500" />
                        Adicionar Material de Estudo
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={type} onValueChange={(v) => setType(v as 'link' | 'text')} className="w-full mt-4">
                    <TabsList className="grid w-full grid-cols-2 bg-zinc-800">
                        <TabsTrigger value="link">Link / PDF Web</TabsTrigger>
                        <TabsTrigger value="text">Colar Texto</TabsTrigger>
                    </TabsList>

                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Título do Material</Label>
                            <Input
                                id="title"
                                placeholder="Ex: Artigo sobre Geometria"
                                className="bg-zinc-800 border-zinc-700"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                required
                            />
                        </div>

                        <TabsContent value="link" className="space-y-2">
                            <Label htmlFor="link">URL do Material</Label>
                            <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-md px-3">
                                <LinkIcon className="h-4 w-4 text-zinc-500" />
                                <input
                                    id="link"
                                    type="url"
                                    placeholder="https://..."
                                    className="flex-1 bg-transparent border-none py-2 text-sm focus:outline-none placeholder:text-zinc-600"
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    required={type === 'link'}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="text" className="space-y-2">
                            <Label htmlFor="text">Conteúdo (Texto)</Label>
                            <textarea
                                id="text"
                                placeholder="Cole o texto aqui..."
                                className="w-full h-32 bg-zinc-800 border-zinc-700 rounded-md p-3 text-sm focus:ring-violet-500 focus:outline-none"
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                required={type === 'text'}
                            />
                        </TabsContent>

                        <Button type="submit" disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700 mt-4">
                            {loading ? 'Salvando...' : 'Salvar Material'}
                        </Button>
                    </form>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
