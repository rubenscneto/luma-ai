"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    LayoutDashboard,
    Calendar,
    Heart,
    GraduationCap,
    MoreHorizontal,
    BookOpen,
    FolderKanban,
    Settings,
    ListChecks,
    Bot,
    BarChart3,
    Dumbbell,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TabItem {
    href: string;
    icon: React.ElementType;
    label: string;
}

const mainTabs: TabItem[] = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Início" },
    { href: "/agenda", icon: Calendar, label: "Agenda" },
    { href: "/dashboard/routine", icon: ListChecks, label: "Rotina" },
    { href: "/treino", icon: Dumbbell, label: "Treino" },
    { href: "/saude", icon: Heart, label: "Saúde" },
];

const moreTabs: TabItem[] = [
    { href: "/analytics", icon: BarChart3, label: "Analytics" },
    { href: "/estudos", icon: GraduationCap, label: "Estudos" },
    { href: "/dashboard/assistant", icon: Bot, label: "Assistente" },
    { href: "/projetos", icon: FolderKanban, label: "Projetos" },
    { href: "/biblioteca", icon: BookOpen, label: "Biblioteca" },
    { href: "/configuracoes", icon: Settings, label: "Config" },
];

interface BottomTabBarProps {
    onMoreClick?: () => void;
}

export function BottomTabBar({ onMoreClick }: BottomTabBarProps) {
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === "/dashboard") {
            return pathname === "/dashboard" || pathname === "/";
        }
        return pathname.startsWith(href);
    };

    const isMoreActive = moreTabs.some(tab => pathname.startsWith(tab.href));

    return (
        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#090C08]/95 backdrop-blur-xl border-t border-zinc-200/50 dark:border-zinc-800/50"
            style={{
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
        >
            <div className="flex items-center justify-around h-16 px-2">
                {mainTabs.map((tab) => {
                    const active = isActive(tab.href);
                    const Icon = tab.icon;

                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={cn(
                                "flex flex-col items-center justify-center min-w-[64px] min-h-[44px] py-1.5 px-2 rounded-xl transition-all duration-200",
                                active
                                    ? "text-[#86BBD8]"
                                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                            )}
                        >
                            <div className="relative">
                                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                                {active && (
                                    <motion.div
                                        layoutId="tab-indicator"
                                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#86BBD8]"
                                        transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
                                    />
                                )}
                            </div>
                            <span className={cn(
                                "text-[10px] mt-0.5 font-medium",
                                active && "font-semibold"
                            )}>
                                {tab.label}
                            </span>
                        </Link>
                    );
                })}

                {/* More button */}
                <button
                    onClick={onMoreClick}
                    className={cn(
                        "flex flex-col items-center justify-center min-w-[64px] min-h-[44px] py-1.5 px-2 rounded-xl transition-all duration-200",
                        isMoreActive
                            ? "text-[#86BBD8]"
                            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                    )}
                >
                    <MoreHorizontal className="w-5 h-5" strokeWidth={isMoreActive ? 2.5 : 2} />
                    <span className={cn(
                        "text-[10px] mt-0.5 font-medium",
                        isMoreActive && "font-semibold"
                    )}>
                        Mais
                    </span>
                </button>
            </div>
        </nav>
    );
}

// More menu sheet component
interface MoreMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

import { ThemeToggleSimple } from "../ui/ThemeToggle";

export function MoreMenu({ isOpen, onClose }: MoreMenuProps) {
    const pathname = usePathname();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] md:hidden">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Menu Sheet */}
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
                className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#090C08] rounded-t-3xl shadow-2xl"
                style={{
                    paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
                }}
            >
                {/* Handle */}
                <div className="flex justify-center py-3">
                    <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                </div>

                {/* Menu Items */}
                <div className="px-4 pb-4 space-y-1">
                    {moreTabs.map((tab) => {
                        const active = pathname.startsWith(tab.href);
                        const Icon = tab.icon;

                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                onClick={onClose}
                                className={cn(
                                    "flex items-center gap-4 p-4 rounded-xl transition-all",
                                    active
                                        ? "bg-[#86BBD8]/10 text-[#86BBD8]"
                                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                )}
                            >
                                <Icon className="w-5 h-5" />
                                <span className="font-medium">{tab.label}</span>
                            </Link>
                        );
                    })}

                    <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-2" />

                    <div className="px-4 py-2">
                        <ThemeToggleSimple className="text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 p-2 rounded-xl" />
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
