"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { BottomTabBar, MoreMenu } from "@/components/layout/BottomTabBar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { FloatingAssistantOrb } from "@/components/FloatingAssistantOrb";
import { AssistantDrawer } from "@/components/AssistantDrawer";
import { DailyPlanProvider } from "@/context/dailyPlanContext";
import { HealthProvider } from "@/context/healthContext";
import { TrainingProvider } from "@/context/trainingContext";
import { ToastProvider } from "@/context/toastContext";
import NotificationManager from "@/components/notifications/NotificationManager";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRoutine } from "@/context/routineContext";
import { usePathname, useRouter } from "next/navigation";

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isAssistantOpen, setIsAssistantOpen] = useState(false);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const { profile, isLoadingProfile } = useRoutine();
    const pathname = usePathname();
    const router = useRouter();

    return (
        <div
            className="flex bg-bg dark:bg-bg min-h-[100dvh] text-text dark:text-text relative font-sans"
            style={{
                minHeight: "100dvh",
            }}
        >
            {/* Global Glow Background - Subtle with slow animation */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
                {/* Top Right Sky Glow */}
                <motion.div
                    className="absolute top-[-15%] right-[-15%] w-[60vw] h-[60vw] rounded-full glow-animate"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                    style={{
                        background: "radial-gradient(circle, rgba(134, 187, 216, 0.12) 0%, rgba(134, 187, 216, 0.05) 40%, transparent 70%)",
                        filter: "blur(80px)",
                    }}
                />

                {/* Bottom Left Rose Glow */}
                <motion.div
                    className="absolute bottom-[-15%] left-[-15%] w-[55vw] h-[55vw] rounded-full glow-animate-delayed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.3 }}
                    style={{
                        background: "radial-gradient(circle, rgba(172, 136, 135, 0.10) 0%, rgba(172, 136, 135, 0.04) 40%, transparent 70%)",
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
                        <TrainingProvider>
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
                        </TrainingProvider>
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
