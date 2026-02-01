"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { FloatingAssistantOrb } from "@/components/FloatingAssistantOrb";
import { AssistantDrawer } from "@/components/AssistantDrawer";
import { useState } from "react";

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isAssistantOpen, setIsAssistantOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="flex bg-[#EEF4ED] dark:bg-[#090C08] min-h-screen text-zinc-900 dark:text-zinc-100 relative font-sans">
            {/* Global Glow Background */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
                {/* Top Right Sky Glow */}
                <div
                    className="absolute top-[-15%] right-[-15%] w-[60vw] h-[60vw] rounded-full"
                    style={{
                        background: "radial-gradient(circle, rgba(134, 187, 216, 0.35) 0%, rgba(134, 187, 216, 0.15) 40%, transparent 70%)",
                        filter: "blur(80px)",
                    }}
                />

                {/* Bottom Left Rose Glow */}
                <div
                    className="absolute bottom-[-15%] left-[-15%] w-[55vw] h-[55vw] rounded-full"
                    style={{
                        background: "radial-gradient(circle, rgba(172, 136, 135, 0.30) 0%, rgba(172, 136, 135, 0.12) 40%, transparent 70%)",
                        filter: "blur(90px)",
                    }}
                />
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden md:block z-10">
                <Sidebar />
            </div>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 z-40">
                <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-[var(--luma-black)] dark:text-white">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="6" y2="6" /><line x1="3" x2="21" y1="12" y2="12" /><line x1="3" x2="21" y1="18" y2="18" /></svg>
                </button>
                <div className="flex items-center gap-2 ml-2">
                    <img src="/brand/logo.png" alt="LumaAI" className="w-8 h-8 object-contain" />
                    <span className="font-bold text-lg">LumaAI</span>
                </div>
            </div>

            {/* Mobile Sidebar Drawer */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
                    <div className="absolute top-0 bottom-0 left-0 w-64 bg-white dark:bg-black shadow-2xl animate-in slide-in-from-left duration-200">
                        <Sidebar />
                        <button
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="absolute top-4 right-4 p-2 text-zinc-500"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>
                    </div>
                </div>
            )}

            <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 overflow-y-auto max-h-screen relative z-10">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>

            {/* Assistant Layer */}
            <FloatingAssistantOrb onClick={() => setIsAssistantOpen(true)} />
            <AssistantDrawer isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} />
        </div>
    );
}

