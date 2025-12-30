import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, RotateCw, ThumbsUp, ThumbsDown, Trophy } from 'lucide-react';
import { Flashcard } from '@/types';
import { calculateNextReview, Rating } from '@/lib/srs';
import { supabase } from '@/lib/supabase';

interface FlashcardReviewProps {
    cards: Flashcard[];
    onSessionComplete: () => void;
}

export function FlashcardReview({ cards, onSessionComplete }: FlashcardReviewProps) {
    const [queue, setQueue] = useState<Flashcard[]>(cards);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 });

    const currentCard = queue[currentIndex];

    const handleRate = async (rating: Rating) => {
        if (!currentCard) return;

        // Calculate SRS
        const { interval, easeFactor, nextReview } = calculateNextReview(
            currentCard.interval || 0,
            currentCard.ease_factor || 2.5,
            rating
        );

        // Update DB
        const { error } = await supabase
            .from('flashcards')
            .update({
                interval,
                ease_factor: easeFactor,
                next_review: nextReview.toISOString()
            })
            .eq('id', currentCard.id);

        if (error) console.error("Error updating card SRS:", error);

        // Update Stats
        setSessionStats(prev => ({
            reviewed: prev.reviewed + 1,
            correct: rating !== 'again' ? prev.correct + 1 : prev.correct
        }));

        // Move to next
        if (currentIndex < queue.length - 1) {
            setIsFlipped(false);
            setCurrentIndex(prev => prev + 1);
        } else {
            onSessionComplete();
        }
    };

    if (!currentCard) {
        return (
            <div className="text-center py-20">
                <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Sessão Concluída!</h3>
                <p className="text-zinc-500 mb-6">Você revisou {sessionStats.reviewed} cartas.</p>
                <Button onClick={onSessionComplete}>Voltar</Button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="flex justify-between text-sm text-zinc-500">
                <span>Progresso: {currentIndex + 1} / {queue.length}</span>
                <span>Restantes: {queue.length - currentIndex}</span>
            </div>

            <div className="relative h-[400px] w-full perspective-1000 cursor-pointer" onClick={() => !isFlipped && setIsFlipped(true)}>
                <motion.div
                    className="w-full h-full relative preserve-3d transition-all duration-500"
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6, type: "spring" }}
                    style={{ transformStyle: 'preserve-3d' }}
                >
                    {/* FRONT */}
                    <Card className="absolute inset-0 w-full h-full backface-hidden p-8 flex flex-col items-center justify-center text-center bg-zinc-900 border-zinc-800 shadow-xl">
                        <div className="text-zinc-500 text-sm uppercase tracking-wider mb-4 font-bold">Pergunta</div>
                        <h2 className="text-2xl font-bold text-white">{currentCard.front}</h2>
                        <p className="absolute bottom-6 text-zinc-500 text-sm animate-pulse">Clique para ver a resposta</p>
                    </Card>

                    {/* BACK */}
                    <Card
                        className="absolute inset-0 w-full h-full backface-hidden p-8 flex flex-col items-center justify-center text-center bg-violet-900/20 border-violet-500/50 shadow-xl"
                        style={{ transform: "rotateY(180deg)" }}
                    >
                        <div className="text-violet-400 text-sm uppercase tracking-wider mb-4 font-bold">Resposta</div>
                        <p className="text-xl text-zinc-200">{currentCard.back}</p>
                    </Card>
                </motion.div>
            </div>

            {/* CONTROLS */}
            <div className={`grid grid-cols-4 gap-4 transition-opacity duration-300 ${isFlipped ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <Button
                    variant="outline"
                    className="border-red-500/50 text-red-500 hover:bg-red-500/10 flex flex-col h-auto py-3"
                    onClick={() => handleRate('again')}
                >
                    <span className="font-bold text-lg">Errei</span>
                    <span className="text-[10px] opacity-70">1 min</span>
                </Button>
                <Button
                    variant="outline"
                    className="border-orange-500/50 text-orange-500 hover:bg-orange-500/10 flex flex-col h-auto py-3"
                    onClick={() => handleRate('hard')}
                >
                    <span className="font-bold text-lg">Difícil</span>
                    <span className="text-[10px] opacity-70">1 dia</span>
                </Button>
                <Button
                    variant="outline"
                    className="border-blue-500/50 text-blue-500 hover:bg-blue-500/10 flex flex-col h-auto py-3"
                    onClick={() => handleRate('good')}
                >
                    <span className="font-bold text-lg">Bom</span>
                    <span className="text-[10px] opacity-70">3 dias</span>
                </Button>
                <Button
                    variant="outline"
                    className="border-green-500/50 text-green-500 hover:bg-green-500/10 flex flex-col h-auto py-3"
                    onClick={() => handleRate('easy')}
                >
                    <span className="font-bold text-lg">Fácil</span>
                    <span className="text-[10px] opacity-70">7 dias</span>
                </Button>
            </div>
        </div>
    );
}
