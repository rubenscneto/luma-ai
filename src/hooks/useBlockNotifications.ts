"use client";

import { useEffect, useRef, useCallback } from 'react';
import { useDailyPlan } from '@/context/dailyPlanContext';
import { DailyBlock } from '@/types';

interface UseBlockNotificationsOptions {
    notifyBeforeMinutes?: number;
    onNotify?: (block: DailyBlock, minutesUntil: number) => void;
    enabled?: boolean;
}

export function useBlockNotifications({
    notifyBeforeMinutes = 5,
    onNotify,
    enabled = true,
}: UseBlockNotificationsOptions = {}) {
    const { todayBlocks } = useDailyPlan();
    const notifiedBlocksRef = useRef<Set<string>>(new Set());
    const permissionRef = useRef<NotificationPermission>('default');

    // Request notification permission on mount
    useEffect(() => {
        if (!enabled || typeof window === 'undefined' || !('Notification' in window)) return;

        const requestPermission = async () => {
            if (Notification.permission === 'default') {
                permissionRef.current = await Notification.requestPermission();
            } else {
                permissionRef.current = Notification.permission;
            }
        };

        requestPermission();
    }, [enabled]);

    // Show browser notification
    const showBrowserNotification = useCallback((block: DailyBlock, minutesUntil: number) => {
        if (permissionRef.current !== 'granted') return;

        const notification = new Notification(`⏰ ${block.title}`, {
            body: minutesUntil <= 0
                ? 'Começando agora!'
                : `Começa em ${minutesUntil} minuto${minutesUntil !== 1 ? 's' : ''}`,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            tag: `block-${block.id}`,
            requireInteraction: true,
            silent: false,
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        // Auto-close after 30 seconds
        setTimeout(() => notification.close(), 30000);
    }, []);

    // Check for upcoming blocks
    useEffect(() => {
        if (!enabled || todayBlocks.length === 0) return;

        const checkUpcomingBlocks = () => {
            const now = new Date();

            todayBlocks.forEach(block => {
                // Skip if already notified, done, or skipped
                if (
                    notifiedBlocksRef.current.has(block.id) ||
                    block.is_done ||
                    block.is_skipped
                ) return;

                const startTime = new Date(block.start_datetime);
                const diffMs = startTime.getTime() - now.getTime();
                const diffMinutes = Math.floor(diffMs / (1000 * 60));

                // Notify if within the threshold
                if (diffMinutes <= notifyBeforeMinutes && diffMinutes >= -1) {
                    notifiedBlocksRef.current.add(block.id);

                    // Call custom callback
                    if (onNotify) {
                        onNotify(block, Math.max(0, diffMinutes));
                    }

                    // Show browser notification
                    showBrowserNotification(block, Math.max(0, diffMinutes));
                }
            });
        };

        // Check immediately
        checkUpcomingBlocks();

        // Check every 30 seconds
        const interval = setInterval(checkUpcomingBlocks, 30000);

        return () => clearInterval(interval);
    }, [enabled, todayBlocks, notifyBeforeMinutes, onNotify, showBrowserNotification]);

    // Reset notified blocks at midnight
    useEffect(() => {
        if (!enabled) return;

        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const msUntilMidnight = tomorrow.getTime() - now.getTime();

        const timeout = setTimeout(() => {
            notifiedBlocksRef.current.clear();
        }, msUntilMidnight);

        return () => clearTimeout(timeout);
    }, [enabled]);

    return {
        hasPermission: permissionRef.current === 'granted',
        requestPermission: async () => {
            if (typeof window === 'undefined' || !('Notification' in window)) return false;
            permissionRef.current = await Notification.requestPermission();
            return permissionRef.current === 'granted';
        },
    };
}
