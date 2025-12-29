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
    { href: "/perdidao", label: "Perdidão", icon: Compass },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/estudos", label: "Estudos", icon: GraduationCap },
    { href: "/projetos", label: "Projetos", icon: FolderKanban },
    { href: "/biblioteca", label: "Biblioteca", icon: Library },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { signOut } = useAuth();

    const handleSignOut = async () => {
        await signOut();
    };

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-6 flex flex-col">
            <div className="mb-10">
                <h1 className="text-2xl font-bold tracking-tight">LumaAI</h1>
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
                                    ? "bg-black text-white dark:bg-white dark:text-black shadow-md"
                                    : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white"
                            )}
                        >
                            <Icon size={20} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto space-y-4">
                <div className="bg-gradient-to-br from-violet-500/10 to-transparent p-4 rounded-xl border border-violet-500/20">
                    <p className="text-xs text-violet-600 dark:text-violet-400 font-semibold mb-1">Status da IA</p>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs text-zinc-500">Online & Ready</span>
                    </div>
                </div>

                <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-red-500 transition-colors text-sm font-medium"
                >
                    <LogOut size={20} />
                    Sair
                </button>
            </div>
        </aside>
    );
}
