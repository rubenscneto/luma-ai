"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Calendar, Zap, ArrowRight, BrainCircuit } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function WelcomePage() {
    const router = useRouter();

    return (
        <div className="relative min-h-[100dvh] bg-bg dark:bg-zinc-950 flex flex-col justify-center overflow-hidden font-sans">
            {/* Premium Blurred Background Elements */}
            <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
                <motion.div
                    className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    style={{
                        background: "radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 40%, transparent 70%)",
                        filter: "blur(100px)",
                    }}
                />
                <motion.div
                    className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                    style={{
                        background: "radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0.04) 40%, transparent 70%)",
                        filter: "blur(120px)",
                    }}
                />
            </div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-2xl mx-auto px-6 py-12 flex flex-col items-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="mb-8 p-3 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 backdrop-blur-md"
                >
                    <BrainCircuit className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-4xl md:text-5xl font-bold text-center text-zinc-900 dark:text-white tracking-tight mb-4"
                >
                    Organize sua vida com o <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-500">Luma AI</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="text-lg text-zinc-600 dark:text-zinc-400 text-center max-w-lg mb-12 leading-relaxed"
                >
                    Pare de lutar contra listas de tarefas irreais. O Luma aprende o seu ritmo e desenha uma agenda semanal viva para você.
                </motion.p>

                {/* Features Highlights */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="w-full grid gap-4 mb-12"
                >
                    <FeatureCard
                        icon={<Calendar className="w-5 h-5 text-blue-500" />}
                        title="Agenda Inteligente"
                        description="Crie tempo para estudos, treino e lazer sem sobreposições."
                    />
                    <FeatureCard
                        icon={<Zap className="w-5 h-5 text-amber-500" />}
                        title="Adaptação Contínua"
                        description="Errou o horário? Remarque e a IA remolda o resto do dia."
                    />
                    <FeatureCard
                        icon={<Sparkles className="w-5 h-5 text-purple-500" />}
                        title="Foco e Performance"
                        description="Priorize blocos com base nos seus picos naturais de energia."
                    />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    className="w-full flex flex-col gap-3"
                >
                    <button
                        onClick={() => router.push('/onboarding-rotina')}
                        className="group relative w-full flex items-center justify-center gap-2 py-4 px-8 rounded-2xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-lg transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
                    >
                        <span>Montar minha rotina ideal</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        <div className="absolute inset-0 rounded-2xl ring-2 ring-purple-500/50 opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 pointer-events-none" />
                    </button>

                    <button
                        onClick={() => window.open('https://github.com/rubenscneto/luma-ai', '_blank')}
                        className="w-full py-4 text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-medium text-sm transition-colors"
                    >
                        Entender como o Luma funciona
                    </button>
                </motion.div>
            </div>
        </div>
    );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-sm shadow-sm">
            <div className="mt-1 p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                {icon}
            </div>
            <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">{description}</p>
            </div>
        </div>
    );
}
