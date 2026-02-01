"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, CheckCircle2, AlertCircle, Info, Clock } from 'lucide-react';

type ToastType = 'info' | 'success' | 'warning' | 'error' | 'block';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface ToastContextType {
    toasts: Toast[];
    showToast: (toast: Omit<Toast, 'id'>) => void;
    dismissToast: (id: string) => void;
    dismissAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const TOAST_ICONS: Record<ToastType, React.ElementType> = {
    info: Info,
    success: CheckCircle2,
    warning: AlertCircle,
    error: AlertCircle,
    block: Clock,
};

const TOAST_COLORS: Record<ToastType, string> = {
    info: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    success: 'from-green-500/20 to-green-600/20 border-green-500/30',
    warning: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30',
    error: 'from-red-500/20 to-red-600/20 border-red-500/30',
    block: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
};

const TOAST_ICON_COLORS: Record<ToastType, string> = {
    info: 'text-blue-400',
    success: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
    block: 'text-purple-400',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newToast: Toast = { ...toast, id };

        setToasts(prev => [...prev, newToast]);

        // Auto-dismiss after duration (default 5 seconds)
        const duration = toast.duration ?? 5000;
        if (duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const dismissAll = useCallback(() => {
        setToasts([]);
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, showToast, dismissToast, dismissAll }}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </ToastContext.Provider>
    );
}

function ToastContainer({
    toasts,
    onDismiss
}: {
    toasts: Toast[];
    onDismiss: (id: string) => void;
}) {
    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            <AnimatePresence mode="popLayout">
                {toasts.map(toast => (
                    <ToastItem
                        key={toast.id}
                        toast={toast}
                        onDismiss={() => onDismiss(toast.id)}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}

function ToastItem({
    toast,
    onDismiss
}: {
    toast: Toast;
    onDismiss: () => void;
}) {
    const Icon = TOAST_ICONS[toast.type];
    const colorClass = TOAST_COLORS[toast.type];
    const iconColor = TOAST_ICON_COLORS[toast.type];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`
                pointer-events-auto
                bg-gradient-to-r ${colorClass}
                backdrop-blur-xl border rounded-xl p-4
                shadow-lg shadow-black/20
            `}
        >
            <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 ${iconColor}`}>
                    <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{toast.title}</p>
                    {toast.message && (
                        <p className="text-xs text-white/70 mt-0.5">{toast.message}</p>
                    )}

                    {toast.action && (
                        <button
                            onClick={() => {
                                toast.action?.onClick();
                                onDismiss();
                            }}
                            className="mt-2 text-xs font-medium text-white/80 hover:text-white underline underline-offset-2"
                        >
                            {toast.action.label}
                        </button>
                    )}
                </div>

                <button
                    onClick={onDismiss}
                    className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                    <X className="w-4 h-4 text-white/60" />
                </button>
            </div>
        </motion.div>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

// Convenience functions
export function useNotifyBlock() {
    const { showToast } = useToast();

    return useCallback((title: string, minutesUntil: number) => {
        showToast({
            type: 'block',
            title: `⏰ ${title}`,
            message: minutesUntil <= 0
                ? 'Começando agora!'
                : `Começa em ${minutesUntil} minuto${minutesUntil !== 1 ? 's' : ''}`,
            duration: 10000,
        });
    }, [showToast]);
}
