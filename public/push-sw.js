// LumaAI Custom Push Notification Service Worker Extension
// This file adds push notification capabilities to the main service worker

// Push notification event handler
self.addEventListener('push', (event) => {
    if (!event.data) return;

    try {
        const data = event.data.json();

        const options = {
            body: data.body || 'Você tem uma nova notificação',
            icon: '/icon-192x192.png',
            badge: '/icon-96x96.png',
            tag: data.tag || 'lumaai-notification',
            data: data.data || {},
            requireInteraction: data.requireInteraction || false,
            actions: data.actions || [],
            vibrate: [200, 100, 200],
            timestamp: Date.now(),
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'LumaAI', options)
        );
    } catch (error) {
        console.error('Push notification error:', error);
    }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const data = event.notification.data || {};
    const action = event.action;

    let targetUrl = '/';

    // Handle different notification types
    if (data.type === 'block_reminder') {
        targetUrl = '/agenda';
    } else if (data.type === 'health_reminder') {
        targetUrl = '/saude';
    } else if (data.type === 'study_reminder') {
        targetUrl = '/estudos';
    } else if (data.url) {
        targetUrl = data.url;
    }

    // Handle action buttons
    if (action === 'view') {
        targetUrl = data.url || targetUrl;
    } else if (action === 'snooze') {
        // Schedule a new notification in 10 minutes
        const snoozeTime = 10 * 60 * 1000;
        setTimeout(() => {
            self.registration.showNotification(event.notification.title, {
                ...event.notification,
                body: `(Adiado) ${event.notification.body}`,
            });
        }, snoozeTime);
        return;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if there's already a window open
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            // Open new window if no existing window
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// Notification close handler
self.addEventListener('notificationclose', (event) => {
    const data = event.notification.data || {};

    // Analytics or logging could go here
    console.log('Notification closed:', data);
});

// Background sync for offline notifications
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-notifications') {
        event.waitUntil(syncPendingNotifications());
    }
});

async function syncPendingNotifications() {
    try {
        const cache = await caches.open('pending-notifications');
        const requests = await cache.keys();

        for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
                const data = await response.json();
                await self.registration.showNotification(data.title, data.options);
                await cache.delete(request);
            }
        }
    } catch (error) {
        console.error('Sync notifications error:', error);
    }
}

// Periodic sync for scheduled notifications (if supported)
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'check-upcoming-blocks') {
        event.waitUntil(checkUpcomingBlocks());
    }
});

async function checkUpcomingBlocks() {
    try {
        // Fetch upcoming blocks from the API
        const response = await fetch('/api/blocks/upcoming');
        if (!response.ok) return;

        const blocks = await response.json();
        const now = Date.now();

        for (const block of blocks) {
            const startTime = new Date(block.start_datetime).getTime();
            const timeDiff = startTime - now;

            // Notify for blocks starting in the next 5 minutes
            if (timeDiff > 0 && timeDiff <= 5 * 60 * 1000) {
                await self.registration.showNotification(`⏰ ${block.title}`, {
                    body: `Começa em ${Math.round(timeDiff / 60000)} minutos`,
                    icon: '/icon-192x192.png',
                    badge: '/icon-96x96.png',
                    tag: `block-${block.id}`,
                    data: { type: 'block_reminder', blockId: block.id, url: '/agenda' },
                    actions: [
                        { action: 'view', title: 'Ver' },
                        { action: 'snooze', title: 'Adiar 10min' }
                    ],
                    requireInteraction: true,
                });
            }
        }
    } catch (error) {
        console.error('Check upcoming blocks error:', error);
    }
}

console.log('LumaAI Push Notification Service Worker loaded');
