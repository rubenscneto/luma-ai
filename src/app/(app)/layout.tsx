"use client";

import { Sidebar } from "@/components/layout/sidebar";

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex bg-zinc-50 dark:bg-black min-h-screen text-zinc-900 dark:text-zinc-100">
            <Sidebar />
            <main className="flex-1 ml-64 p-8 overflow-y-auto max-h-screen">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
