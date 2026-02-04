"use client";

import React from 'react';
import { InstallPrompt } from './InstallPrompt';
import { OfflineBanner } from './OfflineBanner';

export function PWAManager() {
    return (
        <>
            <OfflineBanner />
            <InstallPrompt />
        </>
    );
}
