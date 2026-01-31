"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { sendChatMessage, ChatMessage } from "@/lib/ai/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

export default function AssistantPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [userName, setUserName] = useState("usuário");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput("");

        // Optimistic UI
        const newHistory: ChatMessage[] = [...messages, { role: "user", content: userMsg }];
        setMessages(newHistory);
        setLoading(true);

        try {
            const { reply, actions, userName: fetchedName } = await sendChatMessage(userMsg, messages);

            setUserName(fetchedName);

            const botMsg: ChatMessage = { role: "assistant", content: reply };
            setMessages((prev) => [...prev, botMsg]);

            // TODO: Handle actions (create tasks, etc)
            if (actions.length > 0) {
                console.log("Actions received:", actions);
            }

        } catch (error) {
            console.error(error);
            setMessages((prev) => [...prev, { role: "assistant", content: "Desculpe, tive um erro ao processar. Tente novamente." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold tracking-tight">Assistente LumaAI</h1>
                <p className="text-zinc-500">
                    {messages.length === 0 ? "Comece uma conversa para planejar sua rotina." : `Conversando com ${userName}`}
                </p>
            </div>

            <Card className="flex-1 flex flex-col overflow-hidden bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border-zinc-200 dark:border-zinc-800">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-4 opacity-50">
                            <Sparkles size={48} strokeWidth={1} />
                            <p>Como posso te ajudar hoje?</p>
                        </div>
                    )}
                    <AnimatePresence>
                        {messages.map((msg, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                            >
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-violet-600 text-white" : "bg-zinc-200 dark:bg-zinc-800"
                                        }`}
                                >
                                    {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                                </div>
                                <div
                                    className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm leading-relaxed ${msg.role === "user"
                                            ? "bg-violet-600 text-white rounded-tr-sm"
                                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-sm border border-zinc-200 dark:border-zinc-700"
                                        }`}
                                >
                                    {msg.content}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {loading && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex gap-3"
                        >
                            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                                <Bot size={16} />
                            </div>
                            <div className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1">
                                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
                            </div>
                        </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSend();
                        }}
                        className="flex gap-2"
                    >
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Digite sua mensagem..."
                            className="flex-1 bg-transparent border-zinc-200 dark:border-zinc-700 focus-visible:ring-violet-500"
                            disabled={loading}
                        />
                        <Button type="submit" size="icon" disabled={loading || !input.trim()} className="shrink-0 bg-violet-600 hover:bg-violet-700 text-white">
                            <Send size={18} />
                        </Button>
                    </form>
                </div>
            </Card>
        </div>
    );
}
