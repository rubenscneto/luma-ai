import { z } from 'zod';
import { timeToTimestamptz } from './mealWindows';

export const strictDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD').refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Data inválida');

export const hhmmSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Formato esperado: HH:MM');

export interface AgendaInterval {
    start_datetime: string;
    end_datetime: string;
    id?: string;
}

export function normalizeTimezone(timezone?: string): string {
    const candidate = timezone || 'America/Sao_Paulo';
    try {
        Intl.DateTimeFormat('en-US', { timeZone: candidate });
        return candidate;
    } catch {
        throw new Error('timezone inválido');
    }
}

export function normalizeToTimestamptz(date: string, time: string, timezone?: string): string {
    return timeToTimestamptz(date, time, normalizeTimezone(timezone));
}

export function assertIntervalOrder(startIso: string, endIso: string): void {
    const start = new Date(startIso);
    const end = new Date(endIso);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new Error('Intervalo inválido');
    }

    if (end.getTime() <= start.getTime()) {
        throw new Error('end deve ser maior que start');
    }
}

export function findAgendaCollision(
    interval: AgendaInterval,
    existing: AgendaInterval[],
    ignoreId?: string
): AgendaInterval | null {
    const start = new Date(interval.start_datetime).getTime();
    const end = new Date(interval.end_datetime).getTime();

    for (const block of existing) {
        if (ignoreId && block.id === ignoreId) continue;

        const otherStart = new Date(block.start_datetime).getTime();
        const otherEnd = new Date(block.end_datetime).getTime();

        if (start < otherEnd && end > otherStart) {
            return block;
        }
    }

    return null;
}

export function agendaError(status: 400 | 409, message: string, details?: Record<string, unknown>) {
    return {
        error: {
            code: status === 409 ? 'AGENDA_CONFLICT' : 'INVALID_AGENDA_INPUT',
            message,
            ...(details ? { details } : {}),
        },
    };
}
