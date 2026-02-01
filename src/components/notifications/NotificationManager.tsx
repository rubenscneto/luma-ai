"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, X, Clock } from 'lucide-react';
import { useBlockNotifications } from '@/hooks/useBlockNotifications';
import { useToast } from '@/context/toastContext';
import { DailyBlock } from '@/types';

export default function NotificationManager() {
    const { showToast } = useToast();
    const [showPermissionBanner, setShowPermissionBanner] = useState(false);
    const [isEnabled, setIsEnabled] = useState(true);

    // Handle notification callback
    const handleBlockNotification = (block: DailyBlock, minutesUntil: number) => {
        showToast({
            type: 'block',
            title: `⏰ ${block.title}`,
            message: minutesUntil <= 0
                ? 'Começando agora!'
                : `Começa em ${minutesUntil} minuto${minutesUntil !== 1 ? 's' : ''}`,
            duration: 10000,
        });
    };

    const { hasPermission, requestPermission } = useBlockNotifications({
        notifyBeforeMinutes: 5,
        onNotify: handleBlockNotification,
        enabled: isEnabled,
    });

    // Check if we should show permission banner on mount
    useEffect(() => {
        if (typeof window === 'undefined' || !('Notification' in window)) return;

        // Show banner if permission not yet requested
        if (Notification.permission === 'default') {
            // Delay showing the banner for better UX
            const timeout = setTimeout(() => {
                setShowPermissionBanner(true);
            }, 3000);
            return () => clearTimeout(timeout);
        }
    }, []);

    const handleEnableNotifications = async () => {
        const granted = await requestPermission();
        setShowPermissionBanner(false);

        if (granted) {
            showToast({
                type: 'success',
                title: 'Notificações ativadas!',
                message: 'Você receberá alertas antes de cada bloco',
            });
        }
    };

    const handleDismissBanner = () => {
        setShowPermissionBanner(false);
    };

    return (
        <>
            {/* Permission Request Banner */}
            <AnimatePresence>
                {showPermissionBanner && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
                    >
                        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-4 shadow-xl">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-xl bg-purple-500/20">
                                    <Bell className="w-5 h-5 text-purple-400" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium text-white">
                                        Ativar notificações?
                                    </h4>
                                    <p className="text-xs text-white/60 mt-1">
                                        Receba alertas 5 minutos antes de cada bloco começar
                                    </p>

                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={handleEnableNotifications}
                                            className="px-4 py-1.5 bg-purple-500 hover:bg-purple-600 rounded-lg text-xs font-medium text-white transition-colors"
                                        >
                                            Ativar
                                        </button>
                                        <button
                                            onClick={handleDismissBanner}
                                            className="px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium text-white/70 transition-colors"
                                        >
                                            Agora não
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={handleDismissBanner}
                                    className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    <X className="w-4 h-4 text-white/40" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
