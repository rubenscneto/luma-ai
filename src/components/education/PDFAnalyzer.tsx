"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, FileText, Loader2, Sparkles, BookOpen, CheckCircle,
    AlertCircle, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AnalysisResult {
    summary: string;
    keyTopics: string[];
    flashcards: { question: string; answer: string }[];
    studyTips: string[];
}

interface PDFAnalyzerProps {
    subjectName: string;
    onTopicsExtracted?: (topics: string[]) => void;
    onFlashcardsGenerated?: (cards: { question: string; answer: string }[]) => void;
}

export function PDFAnalyzer({ subjectName, onTopicsExtracted, onFlashcardsGenerated }: PDFAnalyzerProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showFlashcards, setShowFlashcards] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            if (selected.type !== 'application/pdf') {
                toast.error('Apenas arquivos PDF são aceitos.');
                return;
            }
            if (selected.size > 10 * 1024 * 1024) {
                toast.error('O arquivo deve ter no máximo 10MB.');
                return;
            }
            setFile(selected);
            setResult(null);
            setError(null);
        }
    };

    const handleAnalyze = async () => {
        if (!file) return;

        setIsAnalyzing(true);
        setError(null);
        try {
            // Read file as base64
            const buffer = await file.arrayBuffer();
            const base64 = btoa(
                new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
            );

            const res = await fetch('/api/ai/study/analyze-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pdf_base64: base64,
                    subject_name: subjectName,
                    filename: file.name,
                }),
            });

            if (!res.ok) throw new Error('Falha na análise');

            const data = await res.json();
            setResult(data);

            if (data.keyTopics?.length && onTopicsExtracted) {
                onTopicsExtracted(data.keyTopics);
            }
            if (data.flashcards?.length && onFlashcardsGenerated) {
                onFlashcardsGenerated(data.flashcards);
            }

            toast.success('PDF analisado com sucesso!');
        } catch (err) {
            console.error('PDF analysis error:', err);
            setError('Erro ao analisar o PDF. Tente novamente.');
            toast.error('Erro na análise do PDF.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Upload Zone */}
            <div
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${file
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : 'border-white/10 hover:border-white/20 bg-white/5'
                    }`}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                />
                {file ? (
                    <div className="flex items-center justify-center gap-3">
                        <FileText className="w-5 h-5 text-emerald-400" />
                        <div className="text-left">
                            <p className="text-sm font-medium text-white">{file.name}</p>
                            <p className="text-xs text-zinc-400">{(file.size / 1024).toFixed(0)} KB</p>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
                            className="ml-2 p-1 rounded hover:bg-white/10"
                        >
                            <X className="w-4 h-4 text-zinc-400" />
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <Upload className="w-8 h-8 mx-auto text-zinc-500" />
                        <p className="text-sm text-zinc-400">Clique para enviar um PDF</p>
                        <p className="text-xs text-zinc-500">Máximo 10MB</p>
                    </div>
                )}
            </div>

            {/* Analyze Button */}
            {file && !result && (
                <Button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-0"
                >
                    {isAnalyzing ? (
                        <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Analisando com IA...</>
                    ) : (
                        <><Sparkles className="w-4 h-4 mr-2" /> Analisar com IA</>
                    )}
                </Button>
            )}

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {/* Results */}
            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        {/* Summary */}
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                                <BookOpen className="w-4 h-4 text-emerald-400" />
                                Resumo
                            </h4>
                            <p className="text-sm text-zinc-300 leading-relaxed">{result.summary}</p>
                        </div>

                        {/* Key Topics */}
                        {result.keyTopics?.length > 0 && (
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                                    <CheckCircle className="w-4 h-4 text-blue-400" />
                                    Tópicos Extraídos ({result.keyTopics.length})
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {result.keyTopics.map((topic, i) => (
                                        <span key={i} className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300 text-xs border border-blue-500/20">
                                            {topic}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Flashcards */}
                        {result.flashcards?.length > 0 && (
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <button
                                    onClick={() => setShowFlashcards(!showFlashcards)}
                                    className="w-full flex items-center justify-between text-sm font-medium"
                                >
                                    <span className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-purple-400" />
                                        {result.flashcards.length} Flashcards Gerados
                                    </span>
                                    {showFlashcards ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>

                                <AnimatePresence>
                                    {showFlashcards && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="mt-3 space-y-2 max-h-[200px] overflow-y-auto">
                                                {result.flashcards.map((card, i) => (
                                                    <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/5">
                                                        <p className="text-xs text-purple-300 font-medium mb-1">P: {card.question}</p>
                                                        <p className="text-xs text-zinc-400">R: {card.answer}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Study Tips */}
                        {result.studyTips?.length > 0 && (
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                                    💡 Dicas de Estudo
                                </h4>
                                <ul className="space-y-1.5">
                                    {result.studyTips.map((tip, i) => (
                                        <li key={i} className="text-xs text-zinc-400 flex items-start gap-2">
                                            <span className="text-emerald-400 mt-0.5">•</span>
                                            {tip}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
