"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/authContext';
import { supabase } from '@/lib/supabase';
import { FileUp, File as FileIcon, Trash2, Loader2, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Script from 'next/script';

declare global {
    interface Window {
        google: any;
        gapi: any;
    }
}

interface Material {
    id: string; // The file name in storage essentially
    name: string;
    size: number;
    created_at: string;
    url?: string;
}

export default function MateriaisPage() {
    const { user } = useAuth();
    const [files, setFiles] = useState<Material[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [pickerApiLoaded, setPickerApiLoaded] = useState(false);
    const [gsiLoaded, setGsiLoaded] = useState(false);

    useEffect(() => {
        if (user) {
            loadFiles();
        }
    }, [user]);

    const loadFiles = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            // Path based on RLS: user_materials/{user_id}/
            const { data, error } = await supabase
                .storage
                .from('user_materials')
                .list(user.id + '/', {
                    limit: 100,
                    offset: 0,
                    sortBy: { column: 'created_at', order: 'desc' }
                });

            if (error) throw error;

            // Filter out empty placeholders
            const validFiles = data?.filter(f => f.name !== '.emptyFolderPlaceholder') || [];

            // Get public URLs
            const filesWithUrls = await Promise.all(
                validFiles.map(async (file) => {
                    const path = `${user.id}/${file.name}`;
                    const { data: urlData } = supabase.storage.from('user_materials').getPublicUrl(path);
                    return {
                        id: file.id || file.name,
                        name: file.name,
                        size: file.metadata?.size || 0,
                        created_at: file.created_at,
                        url: urlData.publicUrl
                    };
                })
            );

            setFiles(filesWithUrls);
        } catch (error: any) {
            console.error('Error loading files:', error);
            toast.error('Erro ao carregar materiais: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        // Validate size (30MB max)
        if (file.size > 30 * 1024 * 1024) {
            toast.error("O arquivo excede o limite de 30MB.");
            return;
        }

        // Validate type
        const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
        if (!validTypes.includes(file.type)) {
            toast.error("Formato não suportado. Use PDF, DOC/DOCX ou TXT.");
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading(`Enviando ${file.name}...`);

        try {
            // Create clean filename
            const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const filePath = `${user.id}/${Date.now()}_${cleanName}`;

            const { error } = await supabase.storage
                .from('user_materials')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                throw error;
            }

            toast.success('Material enviado com sucesso!', { id: toastId });

            // Refresh list
            await loadFiles();

            // Trigger AI Extraction (Backend)
            toast.info('IA analisando o material para sugestões de blocos...');
            await fetch('/api/ai/extract-insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, filePath })
            }).catch(err => console.log('Background extraction triggered but failed locally:', err)); // Fire and forget for UX

        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(`Falha no upload: ${error.message}`, { id: toastId });
        } finally {
            setIsUploading(false);
            // Reset input
            event.target.value = '';
        }
    };

    const handleDelete = async (fileName: string) => {
        if (!user || !confirm(`Tem certeza que deseja deletar ${fileName}?`)) return;

        try {
            const { error } = await supabase.storage
                .from('user_materials')
                .remove([`${user.id}/${fileName}`]);

            if (error) throw error;

            toast.success('Material removido.');
            setFiles(files.filter(f => f.name !== fileName));
        } catch (error: any) {
            console.error('Delete error:', error);
            toast.error(`Falha ao deletar: ${error.message}`);
        }
    };

    // --- Google Drive Integration ---
    const loadPickerApi = () => {
        window.gapi.load('picker', () => {
            setPickerApiLoaded(true);
        });
    };

    const handleDriveAuth = () => {
        if (!window.google || !window.gapi) {
            toast.error("Serviços do Google não carregaram. Verifique a sua conexão.");
            return;
        }

        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        if (!clientId) {
            toast.error("Aviso: Configuração do Google Client ID ausente.");
            return;
        }

        const tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/drive.readonly',
            callback: (response: any) => {
                if (response.error !== undefined) {
                    toast.error("Erro na autorização do Google Drive.");
                    return;
                }
                showPicker(response.access_token);
            },
        });
        tokenClient.requestAccessToken();
    };

    const showPicker = (accessToken: string) => {
        const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
        view.setMimeTypes('application/pdf,application/vnd.google-apps.document,text/plain');

        let builder = new window.google.picker.PickerBuilder()
            .addView(view)
            .setOAuthToken(accessToken)
            .setCallback((data: any) => pickerCallback(data, accessToken));

        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
        if (apiKey) {
            builder = builder.setDeveloperKey(apiKey);
        }

        const picker = builder.build();
        picker.setVisible(true);
    };

    const pickerCallback = async (data: any, accessToken: string) => {
        if (data.action === window.google.picker.Action.PICKED) {
            const document = data.docs[0];
            const fileId = document.id;
            const fileName = document.name;
            const mimeType = document.mimeType;

            await importFromDrive(fileId, fileName, mimeType, accessToken);
        }
    };

    const importFromDrive = async (fileId: string, fileName: string, mimeType: string, accessToken: string) => {
        if (!user) return;
        setIsUploading(true);
        const toastId = toast.loading(`Importando ${fileName} do Google Drive...`);

        try {
            const res = await fetch('/api/drive/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileId,
                    fileName,
                    mimeType,
                    accessToken,
                    userId: user.id
                })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Falha ao importar arquivo do drive.');
            }

            toast.success(`Material "${fileName}" processado com sucesso! Flashcards prontos.`, { id: toastId });
            await loadFiles();
        } catch (error: any) {
            toast.error(`Erro: ${error.message}`, { id: toastId });
        } finally {
            setIsUploading(false);
        }
    };
    // ---------------------------------

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-bg">
            <Script src="https://apis.google.com/js/api.js" onLoad={loadPickerApi} />
            <Script src="https://accounts.google.com/gsi/client" onLoad={() => setGsiLoaded(true)} />

            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400">
                        Seus Materiais
                    </h1>
                    <p className="text-muted mt-2">
                        Faça upload de PDFs, apostilas ou conecte seu Google Drive. A inteligência artificial usará esses documentos para extrair insights e sugerir blocos de estudo altamente personalizados na sua Agenda Semanal.
                    </p>
                </div>

                {/* Upload Action */}
                <div className="bg-surface dark:bg-zinc-900 border border-card-border/50 rounded-2xl p-6 sm:p-8 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-purple-500/10 text-purple-600 flex items-center justify-center rounded-2xl mb-4">
                        <FileUp className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Enviar novo documento</h3>
                    <p className="text-sm text-muted max-w-sm mb-6">
                        Arraste um arquivo ou clique para procurar. Suporta PDF, DOCX e TXT até 30MB.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                        {/* File Input */}
                        <div className="relative flex-1">
                            <input
                                type="file"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                onChange={handleFileUpload}
                                accept=".pdf,.doc,.docx,.txt"
                                disabled={isUploading}
                            />
                            <button
                                disabled={isUploading}
                                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-xl transition-all disabled:opacity-50"
                            >
                                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileUp className="w-5 h-5" />}
                                {isUploading ? 'Enviando...' : 'Procurar Arquivo'}
                            </button>
                        </div>

                        {/* Google Drive Button */}
                        <button
                            onClick={handleDriveAuth}
                            disabled={!pickerApiLoaded || !gsiLoaded || isUploading}
                            className={`flex-1 flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium py-3 px-6 rounded-xl transition-all ${(!pickerApiLoaded || !gsiLoaded || isUploading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                        >
                            <LinkIcon className="w-5 h-5" />
                            {(!pickerApiLoaded || !gsiLoaded) ? 'Carregando UI...' : 'Google Drive'}
                        </button>
                    </div>

                    <div className="mt-6 flex items-start gap-2 text-left bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 p-4 rounded-xl max-w-lg">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p className="text-sm">
                            A segurança dos seus dados é prioridade. Todos os arquivos são isolados no seu perfil e lidos pela IA unicamente para a geração de resumos através do Gemini.
                        </p>
                    </div>
                </div>

                {/* Files List */}
                <div>
                    <h2 className="text-xl font-semibold border-b border-card-border/50 pb-4 mb-4 text-foreground">
                        Documentos Armazenados
                    </h2>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted">
                            <Loader2 className="w-8 h-8 animate-spin mb-4" />
                            <p>Carregando materiais...</p>
                        </div>
                    ) : files.length === 0 ? (
                        <div className="text-center py-12 px-4 bg-foreground/[0.02] border border-dashed border-card-border/50 rounded-2xl">
                            <FileIcon className="w-12 h-12 text-muted mx-auto mb-3 opacity-50" />
                            <h3 className="text-foreground font-medium mb-1">Nenhum material encontrado</h3>
                            <p className="text-sm text-muted">Faça seu primeiro upload acima para desbloquear as aulas da IA.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {files.map((file) => (
                                <div key={file.id} className="bg-surface dark:bg-zinc-900 border border-card-border/50 p-4 rounded-xl hover:shadow-md transition-shadow group flex flex-col">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                                            <FileIcon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-foreground truncate" title={file.name}>
                                                {file.name.split('_').slice(1).join('_') || file.name} {/* Hide timestamp prefix if present */}
                                            </p>
                                            <p className="text-xs text-muted mt-0.5">
                                                {new Date(file.created_at).toLocaleDateString()} &middot; {formatSize(file.size)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-4 flex items-center justify-between border-t border-card-border/30">
                                        <a
                                            href={file.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline"
                                        >
                                            Visualizar
                                        </a>

                                        <button
                                            onClick={() => handleDelete(file.name)}
                                            className="p-1.5 text-red-500/70 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-all"
                                            title="Deletar material"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}