"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Plus, Search, Bell } from "lucide-react";
import { motion } from "framer-motion";

interface MobileHeaderProps {
    onAddClick?: () => void;
    onSearchClick?: () => void;
    onNotificationsClick?: () => void;
    showAdd?: boolean;
    showSearch?: boolean;
    showNotifications?: boolean;
}

const pageTitles: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/agenda": "Agenda",
    "/saude": "Saúde",
    "/estudos": "Estudos",
    "/projetos": "Projetos",
    "/biblioteca": "Biblioteca",
    "/biblioteca/clube": "Clube do Livro",
    "/configuracoes": "Configurações",
    "/perdidao": "Meu Planejador",
};

export function MobileHeader({
    onAddClick,
    onSearchClick,
    onNotificationsClick,
    showAdd = false,
    showSearch = false,
    showNotifications = false,
}: MobileHeaderProps) {
    const pathname = usePathname();

    // Find matching title
    let title = "LumaAI";
    for (const [path, name] of Object.entries(pageTitles)) {
        if (pathname.startsWith(path)) {
            title = name;
            break;
        }
    }

    // Determine which actions to show based on page
    const showAddButton = showAdd || ["/agenda", "/projetos"].some(p => pathname.startsWith(p));
    const showSearchButton = showSearch || ["/estudos", "/biblioteca"].some(p => pathname.startsWith(p));

    return (
        <header
            className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#090C08]/90 backdrop-blur-xl border-b border-zinc-200/30 dark:border-zinc-800/30"
            style={{
                paddingTop: "env(safe-area-inset-top, 0px)",
            }}
        >
            <div className="flex items-center justify-between h-14 px-4">
                {/* Logo + Title */}
                <div className="flex items-center gap-3">
                    <img
                        src="/brand/logo.png"
                        alt="LumaAI"
                        className="w-8 h-8 object-contain"
                    />
                    <motion.h1
                        key={title}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-lg font-semibold text-zinc-900 dark:text-white"
                    >
                        {title}
                    </motion.h1>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                    {showSearchButton && (
                        <button
                            onClick={onSearchClick}
                            className="p-2.5 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                            <Search className="w-5 h-5" />
                        </button>
                    )}

                    {showNotifications && (
                        <button
                            onClick={onNotificationsClick}
                            className="p-2.5 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center relative"
                        >
                            <Bell className="w-5 h-5" />
                            {/* Notification badge */}
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#AC8887]" />
                        </button>
                    )}

                    {showAddButton && (
                        <button
                            onClick={onAddClick}
                            className="p-2.5 rounded-xl bg-[#86BBD8]/10 text-[#86BBD8] hover:bg-[#86BBD8]/20 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
