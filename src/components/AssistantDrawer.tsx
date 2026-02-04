"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Send } from "lucide-react";
import { useAuth } from "@/context/authContext";

interface AssistantDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AssistantDrawer({ isOpen, onClose }: AssistantDrawerProps) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const { user } = useAuth(); // Need auth context
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', text: string }[]>([
        { role: 'assistant', text: 'Olá! Como posso ajudar você a ser mais produtivo hoje?' }
    ]);
    const [input, setInput] = useState("");

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput("");
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        try {
            const response = await fetch('/api/ai/assistant-actions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user?.id, // Sent user_id
                    message: userMsg,
                    conversation_history: messages.map(m => ({ role: m.role, content: m.text }))
                })
            });

            if (!response.ok) throw new Error('Falha na comunicação');

            const data = await response.json();

            // Add assistant response
            setMessages(prev => [...prev, { role: 'assistant', text: data.message_to_user }]);

            // Handle actions if needed (e.g. refresh data)
            if (data.executed_actions && data.executed_actions.length > 0) {
                // Ideally trigger a global refresh here
                // for now just log
                console.log("Actions executed:", data.executed_actions);
            }

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'assistant', text: 'Desculpe, tive um erro ao processar. Tente novamente.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-50"
                    />

                    {/* Drawer Panel */}
                    <motion.div
                        initial={isMobile ? { y: "100%" } : { x: "100%" }}
                        animate={isMobile ? { y: 0 } : { x: 0 }}
                        exit={isMobile ? { y: "100%" } : { x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className={`fixed z-50 bg-white dark:bg-black border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden
                            ${isMobile
                                ? "bottom-0 left-0 right-0 h-[85vh] rounded-t-3xl border-t"
                                : "top-0 right-0 h-screen w-[420px]"
                            }
                        `}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[var(--luma-sky)]/20 flex items-center justify-center p-1.5">
                                    <img src="/brand/logo.png" className="w-full h-full object-contain" alt="Logo" />
                                </div>
                                <h2 className="font-semibold text-lg text-[var(--luma-black)] dark:text-white">Assistant</h2>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                                <X size={20} className="text-zinc-500" />
                            </button>
                        </div>

                        {/* Content Area (Placeholder Chat) */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed
                                        ${msg.role === 'user'
                                            ? 'bg-[var(--luma-black)] text-white rounded-br-none'
                                            : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-bl-none'
                                        }
                                    `}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input Area */}
                        <div
                            className="p-4 bg-white dark:bg-black border-t border-zinc-100 dark:border-zinc-800"
                            style={{
                                paddingBottom: isMobile ? "calc(env(safe-area-inset-bottom, 0px) + 16px)" : "16px",
                            }}
                        >
                            <form
                                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                className="relative flex items-center"
                            >
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={isLoading ? "Processando..." : "Digite sua mensagem..."}
                                    disabled={isLoading}
                                    className="w-full bg-zinc-50 dark:bg-zinc-900 border-none rounded-full px-5 py-3 pr-12 text-sm focus:ring-2 focus:ring-[var(--luma-sky)] outline-none min-h-[44px] disabled:opacity-50"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    className="absolute right-2 p-2.5 bg-[var(--luma-black)] text-white rounded-full hover:opacity-90 transition-opacity min-w-[44px] min-h-[44px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
