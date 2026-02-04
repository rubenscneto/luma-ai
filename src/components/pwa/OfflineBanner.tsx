"use client";

import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function OfflineBanner() {
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        // Set initial state
        setIsOffline(!navigator.onLine);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <AnimatePresence>
            {isOffline && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-red-500/90 backdrop-blur-sm text-white relative z-[60]"
                >
                    <div className="flex items-center justify-center gap-2 py-1 px-4 text-xs font-medium">
                        <WifiOff className="w-3.5 h-3.5" />
                        <span>Você está offline. Algumas funções podem estar limitadas.</span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
