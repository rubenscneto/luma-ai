"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Download, Upload, FileJson, FileText, Check,
    AlertCircle, Loader2, X, Calendar, Dumbbell,
    BookOpen, FolderKanban
} from 'lucide-react';
import { useAuth } from '@/context/authContext';
import { supabase } from '@/lib/supabase';

type ExportFormat = 'json' | 'csv';
type DataType = 'fixed_blocks' | 'health_profile' | 'daily_blocks' | 'all';

interface ExportOption {
    id: DataType;
    label: string;
    icon: React.ElementType;
    description: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
    { id: 'fixed_blocks', label: 'Blocos Fixos', icon: Calendar, description: 'Sua rotina semanal' },
    { id: 'health_profile', label: 'Perfil de Saúde', icon: Dumbbell, description: 'Configurações e metas' },
    { id: 'daily_blocks', label: 'Plano Diário', icon: FolderKanban, description: 'Histórico de blocos' },
    { id: 'all', label: 'Exportar Tudo', icon: FileJson, description: 'Backup completo' },
];

export default function DataExportImport() {
    const { user } = useAuth();
    const [selectedExport, setSelectedExport] = useState<DataType>('all');
    const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [exportSuccess, setExportSuccess] = useState(false);
    const [importSuccess, setImportSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async (type: DataType) => {
        if (!user) return null;

        const data: Record<string, any> = {};
        const userId = user.id;

        try {
            if (type === 'fixed_blocks' || type === 'all') {
                const { data: fixedBlocks } = await supabase
                    .from('fixed_blocks')
                    .select('*')
                    .eq('user_id', userId);
                data.fixed_blocks = fixedBlocks || [];
            }

            if (type === 'health_profile' || type === 'all') {
                const { data: healthProfile } = await supabase
                    .from('health_profile')
                    .select('*')
                    .eq('user_id', userId)
                    .single();
                data.health_profile = healthProfile;
            }

            if (type === 'daily_blocks' || type === 'all') {
                const { data: dailyBlocks } = await supabase
                    .from('daily_blocks')
                    .select('*')
                    .eq('user_id', userId)
                    .order('start_datetime', { ascending: false })
                    .limit(500);
                data.daily_blocks = dailyBlocks || [];
            }

            return data;
        } catch (err) {
            console.error('Error fetching data:', err);
            throw err;
        }
    };

    const convertToCSV = (data: Record<string, any>): string => {
        const lines: string[] = [];

        Object.entries(data).forEach(([key, value]) => {
            if (Array.isArray(value) && value.length > 0) {
                lines.push(`\n--- ${key.toUpperCase()} ---`);
                const headers = Object.keys(value[0]);
                lines.push(headers.join(','));
                value.forEach(row => {
                    const values = headers.map(h => {
                        const val = row[h];
                        if (typeof val === 'object') return JSON.stringify(val);
                        if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
                        return val ?? '';
                    });
                    lines.push(values.join(','));
                });
            } else if (value && typeof value === 'object' && !Array.isArray(value)) {
                lines.push(`\n--- ${key.toUpperCase()} ---`);
                const headers = Object.keys(value);
                lines.push(headers.join(','));
                const values = headers.map(h => {
                    const val = value[h];
                    if (typeof val === 'object') return JSON.stringify(val);
                    if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
                    return val ?? '';
                });
                lines.push(values.join(','));
            }
        });

        return lines.join('\n');
    };

    const handleExport = async () => {
        if (!user) {
            setError('Você precisa estar logado para exportar dados');
            return;
        }

        setIsExporting(true);
        setError(null);

        try {
            const data = await fetchData(selectedExport);
            if (!data) throw new Error('Nenhum dado encontrado');

            const exportData = {
                exported_at: new Date().toISOString(),
                user_email: user.email,
                version: '1.0',
                data
            };

            let content: string;
            let filename: string;
            let mimeType: string;

            if (exportFormat === 'json') {
                content = JSON.stringify(exportData, null, 2);
                filename = `lumaai-backup-${new Date().toISOString().split('T')[0]}.json`;
                mimeType = 'application/json';
            } else {
                content = convertToCSV(data);
                filename = `lumaai-backup-${new Date().toISOString().split('T')[0]}.csv`;
                mimeType = 'text/csv';
            }

            // Download file
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setExportSuccess(true);
            setTimeout(() => setExportSuccess(false), 3000);
        } catch (err: any) {
            setError(err.message || 'Erro ao exportar dados');
        } finally {
            setIsExporting(false);
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setIsImporting(true);
        setError(null);

        try {
            const content = await file.text();
            const importedData = JSON.parse(content);

            if (!importedData.data) {
                throw new Error('Formato de arquivo inválido');
            }

            const { data } = importedData;

            // Import fixed blocks
            if (data.fixed_blocks && Array.isArray(data.fixed_blocks)) {
                for (const block of data.fixed_blocks) {
                    const { id, ...blockData } = block;
                    await supabase
                        .from('fixed_blocks')
                        .upsert({ ...blockData, user_id: user.id }, { onConflict: 'id' });
                }
            }

            // Import health profile
            if (data.health_profile) {
                const { id, ...profileData } = data.health_profile;
                await supabase
                    .from('health_profile')
                    .upsert({ ...profileData, user_id: user.id }, { onConflict: 'user_id' });
            }

            setImportSuccess(true);
            setTimeout(() => setImportSuccess(false), 3000);
        } catch (err: any) {
            setError(err.message || 'Erro ao importar dados');
        } finally {
            setIsImporting(false);
            // Reset file input
            e.target.value = '';
        }
    };

    return (
        <div className="space-y-6">
            {/* Export Section */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Download className="w-5 h-5 text-purple-400" />
                    Exportar Dados
                </h3>

                {/* Data Type Selection */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    {EXPORT_OPTIONS.map(option => {
                        const Icon = option.icon;
                        const isSelected = selectedExport === option.id;
                        return (
                            <button
                                key={option.id}
                                onClick={() => setSelectedExport(option.id)}
                                className={`p-4 rounded-xl border text-left transition-all ${isSelected
                                        ? 'bg-purple-500/20 border-purple-500/50'
                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                    }`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <Icon className={`w-4 h-4 ${isSelected ? 'text-purple-400' : 'text-white/60'}`} />
                                    <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-white/80'}`}>
                                        {option.label}
                                    </span>
                                </div>
                                <p className="text-xs text-white/50">{option.description}</p>
                            </button>
                        );
                    })}
                </div>

                {/* Format Selection */}
                <div className="flex items-center gap-3 mb-4">
                    <span className="text-sm text-white/60">Formato:</span>
                    <div className="flex p-1 rounded-lg bg-white/5">
                        <button
                            onClick={() => setExportFormat('json')}
                            className={`px-3 py-1.5 rounded-md text-sm transition-all ${exportFormat === 'json'
                                    ? 'bg-purple-500 text-white'
                                    : 'text-white/60 hover:text-white'
                                }`}
                        >
                            JSON
                        </button>
                        <button
                            onClick={() => setExportFormat('csv')}
                            className={`px-3 py-1.5 rounded-md text-sm transition-all ${exportFormat === 'csv'
                                    ? 'bg-purple-500 text-white'
                                    : 'text-white/60 hover:text-white'
                                }`}
                        >
                            CSV
                        </button>
                    </div>
                </div>

                {/* Export Button */}
                <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={handleExport}
                    disabled={isExporting}
                    className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${exportSuccess
                            ? 'bg-green-500 text-white'
                            : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        }`}
                >
                    {isExporting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : exportSuccess ? (
                        <>
                            <Check className="w-5 h-5" />
                            Exportado!
                        </>
                    ) : (
                        <>
                            <Download className="w-5 h-5" />
                            Exportar {exportFormat.toUpperCase()}
                        </>
                    )}
                </motion.button>
            </div>

            {/* Import Section */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-green-400" />
                    Importar Dados
                </h3>

                <p className="text-sm text-white/60 mb-4">
                    Restaure seus dados a partir de um arquivo JSON exportado anteriormente.
                </p>

                <label className={`flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${importSuccess
                        ? 'border-green-500/50 bg-green-500/10'
                        : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                    }`}>
                    <input
                        type="file"
                        accept=".json"
                        onChange={handleImport}
                        className="hidden"
                        disabled={isImporting}
                    />
                    {isImporting ? (
                        <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
                    ) : importSuccess ? (
                        <>
                            <Check className="w-8 h-8 text-green-400 mb-2" />
                            <span className="text-sm text-green-400">Dados importados!</span>
                        </>
                    ) : (
                        <>
                            <FileJson className="w-8 h-8 text-white/40 mb-2" />
                            <span className="text-sm text-white/60">Clique para selecionar arquivo</span>
                            <span className="text-xs text-white/40 mt-1">Apenas arquivos .json</span>
                        </>
                    )}
                </label>
            </div>

            {/* Error Display */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-3 p-4 bg-red-500/20 border border-red-500/30 rounded-xl"
                    >
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <p className="text-sm text-red-300">{error}</p>
                        <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-white/10 rounded">
                            <X className="w-4 h-4 text-red-300" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
