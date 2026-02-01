"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Calendar, Compass, GraduationCap, FolderKanban, Library, LogOut, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/authContext";

const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/agenda", label: "Agenda", icon: Calendar },
    { href: "/dashboard/routine", label: "Rotina", icon: Compass }, // Changed from /perdidao to /dashboard/routine
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/estudos", label: "Estudos", icon: GraduationCap },
    { href: "/projetos", label: "Projetos", icon: FolderKanban },
    { href: "/dashboard/assistant", label: "Assistente", icon: Bot }, // Added assistant
    { href: "/biblioteca", label: "Biblioteca", icon: Library },
];

import { Bot } from "lucide-react"; // Make sure Bot is imported from lucide-react if not already

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { signOut } = useAuth();

    const handleSignOut = async () => {
        await signOut();
    };

    return (
        <aside className="h-full w-full md:w-64 bg-zinc-50 dark:bg-black border-r border-zinc-200 dark:border-zinc-800 p-6 flex flex-col md:fixed md:left-0 md:top-0 z-40">
            <div className="mb-10 flex items-center gap-3">
                <div className="w-8 h-8 relative">
                    <img src="/brand/Logo.png" alt="LumaAI" className="object-contain w-full h-full" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-[var(--luma-black)] dark:text-[var(--luma-mint)]">LumaAI</h1>
            </div>

            <nav className="space-y-2 flex-1">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
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
