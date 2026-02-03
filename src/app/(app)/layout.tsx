"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { BottomTabBar, MoreMenu } from "@/components/layout/BottomTabBar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { FloatingAssistantOrb } from "@/components/FloatingAssistantOrb";
import { AssistantDrawer } from "@/components/AssistantDrawer";
import { DailyPlanProvider } from "@/context/dailyPlanContext";
import { HealthProvider } from "@/context/healthContext";
import { ToastProvider } from "@/context/toastContext";
import NotificationManager from "@/components/notifications/NotificationManager";
import { useState } from "react";

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isAssistantOpen, setIsAssistantOpen] = useState(false);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

    return (
        <div
            className="flex bg-[#EEF4ED] dark:bg-[#090C08] min-h-[100dvh] text-zinc-900 dark:text-zinc-100 relative font-sans"
            style={{
                minHeight: "100dvh",
                /* Fallback for older browsers */
            }}
        >
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
            <MobileHeader
                showNotifications={true}
            />

            <ToastProvider>
                <DailyPlanProvider>
                    <HealthProvider>
                        {/* Main Content */}
                        <main
                            className="flex-1 md:ml-64 overflow-y-auto relative z-10"
                            style={{
                                paddingTop: "calc(env(safe-area-inset-top, 0px) + 56px)",
                                paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
                                paddingLeft: "16px",
                                paddingRight: "16px",
                            }}
                        >
                            {/* Desktop padding adjustments */}
                            <div className="hidden md:block" style={{ marginTop: "-56px" }} />
                            <div className="md:p-8 md:pt-8 md:pb-8">
                                <div className="max-w-7xl mx-auto">
                                    {children}
                                </div>
                            </div>
                        </main>

                        {/* Notification Manager */}
                        <NotificationManager />
                    </HealthProvider>
                </DailyPlanProvider>
            </ToastProvider>

            {/* Mobile Bottom Tab Bar */}
            <BottomTabBar onMoreClick={() => setIsMoreMenuOpen(true)} />
            <MoreMenu isOpen={isMoreMenuOpen} onClose={() => setIsMoreMenuOpen(false)} />

            {/* Assistant Layer - positioned above tab bar on mobile */}
            <FloatingAssistantOrb onClick={() => setIsAssistantOpen(true)} />
            <AssistantDrawer isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} />
        </div>
    );
}
