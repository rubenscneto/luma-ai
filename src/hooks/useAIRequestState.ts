"use client";

import { useState, useCallback } from 'react';

export type AIRequestStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export interface AIRequestState<T> {
    status: AIRequestStatus;
    data: T | null;
    error: string | null;
    execute: (fn: () => Promise<T | null>) => Promise<void>;
    retry: () => Promise<void>;
    reset: () => void;
}

export function useAIRequestState<T = any>(): AIRequestState<T> {
    const [status, setStatus] = useState<AIRequestStatus>('idle');
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lastFn, setLastFn] = useState<(() => Promise<T | null>) | null>(null);

    const execute = useCallback(async (fn: () => Promise<T | null>) => {
        setLastFn(() => fn);
        setStatus('loading');
        setError(null);

        try {
            const result = await fn();
            if (result === null || result === undefined ||
                (Array.isArray(result) && result.length === 0)) {
                setStatus('empty');
                setData(null);
            } else {
                setStatus('success');
                setData(result);
            }
        } catch (err: any) {
            setStatus('error');
            setError(err.message || 'Erro ao gerar sugestão. Tente novamente.');
            setData(null);
        }
    }, []);

    const retry = useCallback(async () => {
        if (lastFn) {
            await execute(lastFn);
        }
    }, [lastFn, execute]);

    const reset = useCallback(() => {
        setStatus('idle');
        setData(null);
        setError(null);
    }, []);

    return { status, data, error, execute, retry, reset };
}
