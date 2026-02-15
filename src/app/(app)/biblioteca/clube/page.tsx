"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    BookOpen, Plus, X, Check, Trash2, ChevronRight, Clock,
    Star, TrendingUp, Bookmark, Calendar, Target, Sparkles,
    Loader2, BrainCircuit, Link2
} from "lucide-react";
import { useAuth } from "@/context/authContext";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface Book {
    id: string;
    title: string;
    author: string;
    type: "fiction" | "non-fiction" | "technical" | "self-help";
    totalPages: number;
    currentPage: number;
    startDate: string;
    targetDate?: string;
    status: "reading" | "finished" | "paused" | "wishlist";
    rating?: number;
    notes: string;
    linkedSubjectId?: string;
    sessions: ReadingSession[];
}

interface ReadingSession {
    id: string;
    date: string;
    pagesRead: number;
    minutesSpent: number;
    notes?: string;
}

interface QuizQuestion {
    question: string;
    options: string[];
    correct_index: number;
    explanation: string;
}

interface BookQuiz {
    quiz_title: string;
    questions: QuizQuestion[];
    discussion_prompts: string[];
}

const BOOK_TYPES: Record<string, { label: string; emoji: string; color: string }> = {
    fiction: { label: "Ficção", emoji: "📖", color: "text-blue-400" },
    "non-fiction": { label: "Não-Ficção", emoji: "📚", color: "text-green-400" },
    technical: { label: "Técnico", emoji: "💻", color: "text-purple-400" },
    "self-help": { label: "Autoajuda", emoji: "🧠", color: "text-orange-400" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    reading: { label: "Lendo", color: "text-green-400", bg: "bg-green-500/20" },
    finished: { label: "Finalizado", color: "text-blue-400", bg: "bg-blue-500/20" },
    paused: { label: "Pausado", color: "text-yellow-400", bg: "bg-yellow-500/20" },
    wishlist: { label: "Quero Ler", color: "text-purple-400", bg: "bg-purple-500/20" },
};

function getStorageKey(userId: string) {
    return `luma-books-${userId}`;
}

export default function BookClubPage() {
    const { user } = useAuth();
    const [books, setBooks] = useState<Book[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showSessionModal, setShowSessionModal] = useState<string | null>(null);
    const [expandedBook, setExpandedBook] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>("all");

    // Form state
    const [newBook, setNewBook] = useState({
        title: "", author: "", type: "non-fiction" as Book["type"],
        totalPages: 0, targetDate: ""
    });
    const [newSession, setNewSession] = useState({
        pagesRead: 0, minutesSpent: 30, notes: ""
    });
    const [quizLoading, setQuizLoading] = useState<string | null>(null);
    const [activeQuiz, setActiveQuiz] = useState<{ bookId: string; quiz: BookQuiz } | null>(null);
    const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);

    // Load subjects for linking
    useEffect(() => {
        if (!user) return;
        supabase.from('subjects').select('id, name').eq('user_id', user.id).then(({ data }) => {
            if (data) setSubjects(data);
        });
    }, [user]);

    // Load from localStorage
    useEffect(() => {
        if (!user) return;
        const stored = localStorage.getItem(getStorageKey(user.id));
        if (stored) setBooks(JSON.parse(stored));
    }, [user]);

    // Save to localStorage
    useEffect(() => {
        if (!user || books.length === 0) return;
        localStorage.setItem(getStorageKey(user.id), JSON.stringify(books));
    }, [books, user]);

    const addBook = () => {
        if (!newBook.title.trim()) return;
        const book: Book = {
            id: Date.now().toString(),
            title: newBook.title.trim(),
            author: newBook.author.trim(),
            type: newBook.type,
            totalPages: newBook.totalPages || 200,
            currentPage: 0,
            startDate: new Date().toISOString().split('T')[0],
            targetDate: newBook.targetDate || undefined,
            status: "reading",
            notes: "",
            sessions: [],
        };
        setBooks([book, ...books]);
        setNewBook({ title: "", author: "", type: "non-fiction", totalPages: 0, targetDate: "" });
        setShowAddModal(false);
    };

    const addSession = (bookId: string) => {
        setBooks(prev => prev.map(b => {
            if (b.id !== bookId) return b;
            const session: ReadingSession = {
                id: Date.now().toString(),
                date: new Date().toISOString().split('T')[0],
                pagesRead: newSession.pagesRead,
                minutesSpent: newSession.minutesSpent,
                notes: newSession.notes || undefined,
            };
            const newCurrentPage = Math.min(b.currentPage + newSession.pagesRead, b.totalPages);
            return {
                ...b,
                currentPage: newCurrentPage,
                status: newCurrentPage >= b.totalPages ? "finished" : b.status,
                sessions: [...b.sessions, session],
            };
        }));
        setNewSession({ pagesRead: 0, minutesSpent: 30, notes: "" });
        setShowSessionModal(null);
    };

    const deleteBook = (id: string) => {
        setBooks(prev => prev.filter(b => b.id !== id));
    };

    const toggleStatus = (id: string) => {
        setBooks(prev => prev.map(b => {
            if (b.id !== id) return b;
            const statusOrder: Book["status"][] = ["reading", "paused", "finished", "wishlist"];
            const currentIdx = statusOrder.indexOf(b.status);
            const nextStatus = statusOrder[(currentIdx + 1) % statusOrder.length];
            return { ...b, status: nextStatus };
        }));
    };

    const setRating = (id: string, rating: number) => {
        setBooks(prev => prev.map(b => b.id === id ? { ...b, rating } : b));
    };

    const linkToSubject = (bookId: string, subjectId: string) => {
        setBooks(prev => prev.map(b => b.id === bookId ? { ...b, linkedSubjectId: subjectId } : b));
        toast.success('Livro vinculado à matéria!');
    };

    const generateQuiz = async (book: Book) => {
        setQuizLoading(book.id);
        try {
            const lastSession = book.sessions[book.sessions.length - 1];
            const res = await fetch('/api/ai/book/quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    book_title: book.title,
                    book_author: book.author,
                    book_type: book.type,
                    session_notes: lastSession?.notes,
                    pages_range: lastSession ? `${book.currentPage - lastSession.pagesRead}-${book.currentPage}` : undefined,
                }),
            });
            if (!res.ok) throw new Error('Quiz generation failed');
            const quiz = await res.json();
            setActiveQuiz({ bookId: book.id, quiz });
            setQuizAnswers({});
            setQuizSubmitted(false);
            toast.success('Quiz gerado com sucesso!');
        } catch {
            toast.error('Erro ao gerar quiz.');
        } finally {
            setQuizLoading(null);
        }
    };

    // Stats
    const totalBooks = books.length;
    const booksReading = books.filter(b => b.status === "reading").length;
    const booksFinished = books.filter(b => b.status === "finished").length;
    const totalPagesRead = books.reduce((sum, b) => sum + b.currentPage, 0);
    const totalMinutes = books.reduce((sum, b) =>
        sum + b.sessions.reduce((s, sess) => s + sess.minutesSpent, 0), 0
    );

    const filteredBooks = filter === "all" ? books : books.filter(b => b.status === filter);

    return (
        <div className="space-y-8">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">📚 Clube do Livro</h1>
                    <p className="text-zinc-500 dark:text-zinc-400">Acompanhe suas leituras e descubra insights</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-purple-500/20"
                >
                    <Plus size={16} /> Novo Livro
                </button>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total", value: totalBooks, icon: BookOpen, color: "text-blue-400", bg: "bg-blue-500/10" },
                    { label: "Lendo", value: booksReading, icon: Bookmark, color: "text-green-400", bg: "bg-green-500/10" },
                    { label: "Finalizados", value: booksFinished, icon: Check, color: "text-purple-400", bg: "bg-purple-500/10" },
                    { label: "Páginas Lidas", value: totalPagesRead.toLocaleString(), icon: TrendingUp, color: "text-orange-400", bg: "bg-orange-500/10" },
                ].map(stat => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`${stat.bg} border border-white/5 rounded-xl p-4`}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <stat.icon className={`w-4 h-4 ${stat.color}`} />
                            <span className="text-xs text-zinc-500 font-medium">{stat.label}</span>
                        </div>
                        <p className="text-2xl font-bold">{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Reading time stat */}
            {totalMinutes > 0 && (
                <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                    <Clock size={14} />
                    <span>Tempo total de leitura: <strong className="text-white">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}min</strong></span>
                </div>
            )}

            {/* Filter tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {[
                    { id: "all", label: "Todos" },
                    { id: "reading", label: "🟢 Lendo" },
                    { id: "finished", label: "✅ Finalizados" },
                    { id: "paused", label: "⏸️ Pausados" },
                    { id: "wishlist", label: "💜 Quero Ler" },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${filter === tab.id
                            ? "bg-purple-600 text-white"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Books list */}
            {filteredBooks.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-16 text-center"
                >
                    <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
                        <BookOpen className="w-8 h-8 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">
                        {filter === "all" ? "Nenhum livro ainda" : "Nenhum livro nesta categoria"}
                    </h3>
                    <p className="text-sm text-zinc-500 mb-4">
                        {filter === "all" ? "Adicione seu primeiro livro para começar a acompanhar" : "Altere o status dos livros para vê-los aqui"}
                    </p>
                    {filter === "all" && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="text-sm text-purple-400 font-medium hover:underline"
                        >
                            + Adicionar Livro
                        </button>
                    )}
                </motion.div>
            ) : (
                <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                        {filteredBooks.map(book => {
                            const progress = book.totalPages > 0 ? Math.round((book.currentPage / book.totalPages) * 100) : 0;
                            const config = BOOK_TYPES[book.type];
                            const statusConfig = STATUS_CONFIG[book.status];
                            const isExpanded = expandedBook === book.id;

                            return (
                                <motion.div
                                    key={book.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden group"
                                >
                                    <div
                                        className="p-4 cursor-pointer"
                                        onClick={() => setExpandedBook(isExpanded ? null : book.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="text-2xl mt-0.5">{config.emoji}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold truncate">{book.title}</h3>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.color} font-medium`}>
                                                        {statusConfig.label}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-zinc-500 dark:text-zinc-400">{book.author || "Autor desconhecido"}</p>

                                                {/* Progress bar */}
                                                {book.status !== "wishlist" && (
                                                    <div className="mt-3 flex items-center gap-3">
                                                        <div className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${progress}%` }}
                                                                transition={{ duration: 0.8, ease: "easeOut" }}
                                                                className={`h-full rounded-full ${progress === 100
                                                                    ? "bg-gradient-to-r from-green-400 to-emerald-400"
                                                                    : "bg-gradient-to-r from-purple-500 to-indigo-500"
                                                                    }`}
                                                            />
                                                        </div>
                                                        <span className="text-xs text-zinc-500 font-medium min-w-[3rem] text-right">
                                                            {progress}%
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                                                    <span>{book.currentPage}/{book.totalPages} páginas</span>
                                                    {book.sessions.length > 0 && (
                                                        <span>• {book.sessions.length} sessões</span>
                                                    )}
                                                </div>
                                            </div>

                                            <ChevronRight
                                                className={`w-4 h-4 text-zinc-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                                            />
                                        </div>
                                    </div>

                                    {/* Expanded content */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="border-t border-zinc-200 dark:border-zinc-800"
                                            >
                                                <div className="p-4 space-y-4">
                                                    {/* Rating */}
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-zinc-500">Avaliação:</span>
                                                        <div className="flex gap-1">
                                                            {[1, 2, 3, 4, 5].map(star => (
                                                                <button
                                                                    key={star}
                                                                    onClick={(e) => { e.stopPropagation(); setRating(book.id, star); }}
                                                                    className="transition-transform hover:scale-125"
                                                                >
                                                                    <Star
                                                                        size={16}
                                                                        className={star <= (book.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-zinc-400"}
                                                                    />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex flex-wrap gap-2">
                                                        {book.status === "reading" && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setShowSessionModal(book.id); }}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-400 text-xs font-medium rounded-lg hover:bg-green-500/20 transition-colors"
                                                            >
                                                                <Plus size={12} /> Registrar Leitura
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); generateQuiz(book); }}
                                                            disabled={quizLoading === book.id}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 text-purple-400 text-xs font-medium rounded-lg hover:bg-purple-500/20 transition-colors"
                                                        >
                                                            {quizLoading === book.id ? (
                                                                <><Loader2 size={12} className="animate-spin" /> Gerando...</>
                                                            ) : (
                                                                <><BrainCircuit size={12} /> Quiz IA</>
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleStatus(book.id); }}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-medium rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                                        >
                                                            Alterar Status
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); deleteBook(book.id); }}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 text-xs font-medium rounded-lg hover:bg-red-500/20 transition-colors"
                                                        >
                                                            <Trash2 size={12} /> Remover
                                                        </button>
                                                    </div>

                                                    {/* Subject linking for technical books */}
                                                    {book.type === 'technical' && subjects.length > 0 && (
                                                        <div className="flex items-center gap-2">
                                                            <Link2 size={12} className="text-zinc-500" />
                                                            <span className="text-xs text-zinc-500">Vincular à matéria:</span>
                                                            <select
                                                                value={book.linkedSubjectId || ''}
                                                                onChange={(e) => { e.stopPropagation(); linkToSubject(book.id, e.target.value); }}
                                                                className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <option value="">Selecionar...</option>
                                                                {subjects.map(s => (
                                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}

                                                    {/* Quiz display */}
                                                    {activeQuiz?.bookId === book.id && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 5 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className="mt-2 p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-4"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <h4 className="text-sm font-semibold text-purple-300 flex items-center gap-2">
                                                                    <BrainCircuit size={14} /> {activeQuiz.quiz.quiz_title}
                                                                </h4>
                                                                <button onClick={(e) => { e.stopPropagation(); setActiveQuiz(null); }} className="text-zinc-500 hover:text-zinc-300">
                                                                    <X size={14} />
                                                                </button>
                                                            </div>

                                                            {activeQuiz.quiz.questions.map((q, qi) => (
                                                                <div key={qi} className="space-y-2">
                                                                    <p className="text-xs font-medium text-zinc-300">{qi + 1}. {q.question}</p>
                                                                    <div className="grid grid-cols-1 gap-1.5">
                                                                        {q.options.map((opt, oi) => {
                                                                            const selected = quizAnswers[qi] === oi;
                                                                            const correct = quizSubmitted && oi === q.correct_index;
                                                                            const wrong = quizSubmitted && selected && oi !== q.correct_index;
                                                                            return (
                                                                                <button
                                                                                    key={oi}
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        if (!quizSubmitted) setQuizAnswers(p => ({ ...p, [qi]: oi }));
                                                                                    }}
                                                                                    className={`text-left px-3 py-2 rounded-lg text-xs transition-all ${correct ? 'bg-green-500/20 border border-green-500/40 text-green-300' : wrong ? 'bg-red-500/20 border border-red-500/40 text-red-300' : selected ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300' : 'bg-white/5 border border-white/10 text-zinc-400 hover:border-white/20'}`}
                                                                                >
                                                                                    {String.fromCharCode(65 + oi)}) {opt}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    {quizSubmitted && (
                                                                        <p className="text-xs text-emerald-400 pl-1">💡 {q.explanation}</p>
                                                                    )}
                                                                </div>
                                                            ))}

                                                            {!quizSubmitted ? (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setQuizSubmitted(true); }}
                                                                    disabled={Object.keys(quizAnswers).length < activeQuiz.quiz.questions.length}
                                                                    className="w-full px-3 py-2 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-500 transition-colors disabled:opacity-50"
                                                                >
                                                                    Verificar Respostas
                                                                </button>
                                                            ) : (
                                                                <div className="text-center text-xs text-zinc-400">
                                                                    ✅ {activeQuiz.quiz.questions.filter((q, i) => quizAnswers[i] === q.correct_index).length}/{activeQuiz.quiz.questions.length} corretas
                                                                </div>
                                                            )}

                                                            {activeQuiz.quiz.discussion_prompts?.length > 0 && (
                                                                <div className="pt-2 border-t border-purple-500/10 space-y-1">
                                                                    <p className="text-xs font-medium text-zinc-400">💬 Para reflexão:</p>
                                                                    {activeQuiz.quiz.discussion_prompts.map((p, i) => (
                                                                        <p key={i} className="text-xs text-zinc-500 pl-2">• {p}</p>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    )}

                                                    {/* Recent Sessions */}
                                                    {book.sessions.length > 0 && (
                                                        <div>
                                                            <p className="text-xs text-zinc-500 font-medium mb-2">Últimas sessões:</p>
                                                            <div className="space-y-1.5">
                                                                {book.sessions.slice(-3).reverse().map(s => (
                                                                    <div key={s.id} className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2">
                                                                        <Calendar size={12} />
                                                                        <span>{new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                                                                        <span>•</span>
                                                                        <span>{s.pagesRead} páginas</span>
                                                                        <span>•</span>
                                                                        <span>{s.minutesSpent}min</span>
                                                                        {s.notes && <span className="truncate text-zinc-400">— {s.notes}</span>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Add Book Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowAddModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-zinc-200 dark:border-zinc-800"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold">📖 Novo Livro</h3>
                                <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-zinc-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={(e) => { e.preventDefault(); addBook(); }} className="space-y-4">
                                <div>
                                    <label className="text-xs text-zinc-500 mb-1 block">Título *</label>
                                    <input
                                        value={newBook.title}
                                        onChange={e => setNewBook(p => ({ ...p, title: e.target.value }))}
                                        placeholder="Ex: O Programador Pragmático"
                                        className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-zinc-500 mb-1 block">Autor</label>
                                    <input
                                        value={newBook.author}
                                        onChange={e => setNewBook(p => ({ ...p, author: e.target.value }))}
                                        placeholder="Ex: Andrew Hunt & David Thomas"
                                        className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-zinc-500 mb-1 block">Tipo</label>
                                        <select
                                            value={newBook.type}
                                            onChange={e => setNewBook(p => ({ ...p, type: e.target.value as Book["type"] }))}
                                            className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                        >
                                            {Object.entries(BOOK_TYPES).map(([key, { label, emoji }]) => (
                                                <option key={key} value={key}>{emoji} {label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-zinc-500 mb-1 block">Total de páginas</label>
                                        <input
                                            type="number"
                                            value={newBook.totalPages || ""}
                                            onChange={e => setNewBook(p => ({ ...p, totalPages: parseInt(e.target.value) || 0 }))}
                                            placeholder="200"
                                            className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-zinc-500 mb-1 block">Meta para terminar (opcional)</label>
                                    <input
                                        type="date"
                                        value={newBook.targetDate}
                                        onChange={e => setNewBook(p => ({ ...p, targetDate: e.target.value }))}
                                        className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!newBook.title.trim()}
                                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-medium hover:from-purple-500 hover:to-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Adicionar
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add Session Modal */}
            <AnimatePresence>
                {showSessionModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowSessionModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-zinc-200 dark:border-zinc-800"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold">📝 Registrar Leitura</h3>
                                <button onClick={() => setShowSessionModal(null)} className="text-zinc-400 hover:text-zinc-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={(e) => { e.preventDefault(); addSession(showSessionModal); }} className="space-y-4">
                                <div>
                                    <label className="text-xs text-zinc-500 mb-1 block">Páginas lidas</label>
                                    <input
                                        type="number"
                                        value={newSession.pagesRead || ""}
                                        onChange={e => setNewSession(p => ({ ...p, pagesRead: parseInt(e.target.value) || 0 }))}
                                        placeholder="20"
                                        className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-zinc-500 mb-1 block">Tempo (minutos)</label>
                                    <input
                                        type="number"
                                        value={newSession.minutesSpent || ""}
                                        onChange={e => setNewSession(p => ({ ...p, minutesSpent: parseInt(e.target.value) || 0 }))}
                                        placeholder="30"
                                        className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-zinc-500 mb-1 block">Notas (opcional)</label>
                                    <textarea
                                        value={newSession.notes}
                                        onChange={e => setNewSession(p => ({ ...p, notes: e.target.value }))}
                                        placeholder="O que achou deste trecho?"
                                        rows={2}
                                        className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={!newSession.pagesRead}
                                    className="w-full px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-sm font-medium hover:from-green-500 hover:to-emerald-500 transition-all disabled:opacity-50"
                                >
                                    Salvar Sessão
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
