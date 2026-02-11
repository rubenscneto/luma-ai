"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Calendar, Compass, GraduationCap, FolderKanban, Library, LogOut, BarChart3, Bot, Heart, Settings, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/authContext";
import { motion } from "framer-motion";

const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/agenda", label: "Agenda", icon: Calendar },
    { href: "/saude", label: "Saúde", icon: Heart },
    { href: "/treino", label: "Treino", icon: Dumbbell },
    { href: "/dashboard/routine", label: "Rotina", icon: Compass },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/estudos", label: "Estudos", icon: GraduationCap },
    { href: "/projetos", label: "Projetos", icon: FolderKanban },
    { href: "/dashboard/assistant", label: "Assistente", icon: Bot },
    { href: "/biblioteca", label: "Biblioteca", icon: Library },
    { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { signOut } = useAuth();
    const [hasAnimated, setHasAnimated] = useState(false);

    useEffect(() => {
        // Check if this is a fresh login (first render)
        const animated = sessionStorage.getItem("luma-sidebar-animated");
        if (!animated) {
            setHasAnimated(false);
            sessionStorage.setItem("luma-sidebar-animated", "true");
        } else {
            setHasAnimated(true);
        }
    }, []);

    const handleSignOut = async () => {
        sessionStorage.removeItem("luma-sidebar-animated");
        await signOut();
    };

    return (
        <aside className="h-full w-full md:w-64 bg-white/60 dark:bg-black/60 backdrop-blur-md border-r border-zinc-200 dark:border-zinc-800 p-6 flex flex-col md:fixed md:left-0 md:top-0 z-40 md:h-screen">
            {/* Logo with Animation */}
            <div className="mb-10 flex items-center gap-3 overflow-hidden">
                <motion.div
                    className="w-12 h-12 relative flex-shrink-0"
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                >
                    <img src="/brand/logo.png" alt="LumaAI" className="object-contain w-full h-full drop-shadow-lg" />
                </motion.div>
                <motion.h1
                    className="text-xl font-bold tracking-tight text-[var(--luma-black)] dark:text-[var(--luma-mint)] whitespace-nowrap"
                    initial={hasAnimated ? { x: 0, opacity: 1 } : { x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                >
                    LumaAI
                </motion.h1>
            </div>

            <nav className="space-y-2 flex-1">
                {menuItems.map((item, index) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <motion.div
                            key={item.href}
                            initial={hasAnimated ? { x: 0, opacity: 1 } : { x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.3, delay: hasAnimated ? 0 : 0.4 + index * 0.05 }}
                        >
                            <Link
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm",
                                    isActive
                                        ? "bg-[var(--luma-black)] text-[var(--luma-mint)] dark:bg-[var(--luma-mint)] dark:text-[var(--luma-black)] shadow-sm"
                                        : "text-[var(--luma-slate)] hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-[var(--luma-black)] dark:hover:text-white"
                                )}
                            >
                                <Icon size={20} />
                                {item.label}
                            </Link>
                        </motion.div>
                    );
                })}
            </nav>

            <div className="mt-auto space-y-4">
                <div className="bg-gradient-to-br from-[var(--luma-sky)]/10 to-transparent p-4 rounded-xl border border-[var(--luma-sky)]/20">
                    <p className="text-xs text-[var(--luma-slate)] font-semibold mb-1">Status da IA</p>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs text-[var(--luma-slate)]">Online & Ready</span>
                    </div>
                </div>

                <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-[var(--luma-slate)] hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-red-500 transition-colors text-sm font-medium"
                >
                    <LogOut size={20} />
                    Sair
                </button>
            </div>
        </aside>
    );
}

