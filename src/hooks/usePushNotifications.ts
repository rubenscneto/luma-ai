"use client";

import { useState, useEffect, useCallback } from 'react';

interface PushNotificationPayload {
    title: string;
    body: string;
    icon?: string;
    tag?: string;
    data?: Record<string, any>;
    actions?: Array<{ action: string; title: string }>;
    requireInteraction?: boolean;
}

// VAPID public key - in production, this should come from environment variables
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function usePushNotifications() {
    const [isSupported, setIsSupported] = useState(false);
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isLoading, setIsLoading] = useState(true);

    // Check if push notifications are supported
    useEffect(() => {
        const checkSupport = async () => {
            const supported =
                'serviceWorker' in navigator &&
                'PushManager' in window &&
                'Notification' in window;

            setIsSupported(supported);

            if (supported) {
                setPermission(Notification.permission);

                // Check for existing subscription
                const registration = await navigator.serviceWorker.ready;
                const existingSubscription = await registration.pushManager.getSubscription();
                setSubscription(existingSubscription);
            }

            setIsLoading(false);
        };

        if (typeof window !== 'undefined') {
            checkSupport();
        }
    }, []);

    // Request permission and subscribe
    const subscribe = useCallback(async (): Promise<boolean> => {
        if (!isSupported) {
            console.warn('Push notifications not supported');
            return false;
        }

        try {
            // Request notification permission
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result !== 'granted') {
                console.log('Notification permission denied');
                return false;
            }

            // Get service worker registration
            const registration = await navigator.serviceWorker.ready;

            // Subscribe to push notifications
            const applicationServerKey = VAPID_PUBLIC_KEY
                ? urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource
                : undefined;

            const subscriptionOptions: PushSubscriptionOptionsInit = {
                userVisibleOnly: true,
                applicationServerKey,
            };

            const newSubscription = await registration.pushManager.subscribe(subscriptionOptions);
            setSubscription(newSubscription);

            // Send subscription to server (if you have a backend endpoint)
            // await fetch('/api/push/subscribe', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(newSubscription),
            // });

            console.log('Push notification subscription successful');
            return true;
        } catch (error) {
            console.error('Push subscription error:', error);
            return false;
        }
    }, [isSupported]);

    // Unsubscribe from push notifications
    const unsubscribe = useCallback(async (): Promise<boolean> => {
        if (!subscription) return true;

        try {
            await subscription.unsubscribe();
            setSubscription(null);

            // Notify server about unsubscription
            // await fetch('/api/push/unsubscribe', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ endpoint: subscription.endpoint }),
            // });

            return true;
        } catch (error) {
            console.error('Push unsubscription error:', error);
            return false;
        }
    }, [subscription]);

    // Send a local notification (for testing or fallback)
    const showLocalNotification = useCallback(async (payload: PushNotificationPayload): Promise<boolean> => {
        if (permission !== 'granted') {
            console.warn('Notification permission not granted');
            return false;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification(payload.title, {
                body: payload.body,
                icon: payload.icon || '/icon-192x192.png',
                badge: '/icon-96x96.png',
                tag: payload.tag,
                data: payload.data,
                requireInteraction: payload.requireInteraction,
            });
            return true;
        } catch (error) {
            console.error('Local notification error:', error);

            // Fallback to basic Notification API
            try {
                new Notification(payload.title, {
                    body: payload.body,
                    icon: payload.icon || '/icon-192x192.png',
                    tag: payload.tag,
                });
                return true;
            } catch (fallbackError) {
                console.error('Fallback notification error:', fallbackError);
                return false;
            }
        }
    }, [permission]);

    // Schedule a notification for later
    const scheduleNotification = useCallback(async (
        payload: PushNotificationPayload,
        delayMs: number
    ): Promise<NodeJS.Timeout | null> => {
        if (permission !== 'granted') {
            console.warn('Notification permission not granted');
            return null;
        }

        const timeoutId = setTimeout(() => {
            showLocalNotification(payload);
        }, delayMs);

        return timeoutId;
    }, [permission, showLocalNotification]);

    return {
        isSupported,
        isLoading,
        permission,
        subscription,
        isSubscribed: !!subscription,
        subscribe,
        unsubscribe,
        showLocalNotification,
        scheduleNotification,
    };
}
