"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { RoutineWizard } from '@/components/onboarding/RoutineWizard';
import { useAuth } from '@/context/authContext';

export default function OnboardingRotinaPage() {
    const router = useRouter();
    const { user } = useAuth();

    // Redireciona ao concluir
    const handleWizardComplete = () => {
        window.location.href = '/onboarding-preview';
    };

    if (!user) {
        return <div className="min-h-[80vh] flex items-center justify-center text-muted">Carregando...</div>;
    }

    return (
        <div className="min-h-[85vh] py-12 px-4 sm:px-6">
            <RoutineWizard onComplete={handleWizardComplete} />
        </div>
    );
}

