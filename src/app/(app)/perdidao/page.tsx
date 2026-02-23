"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PerdidaoRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/onboarding-rotina');
    }, [router]);

    return (
        <div className="min-h-[80vh] flex items-center justify-center">
            <p className="text-muted animate-pulse font-medium">Redirecionando para o novo onboarding...</p>
        </div>
    );
}
