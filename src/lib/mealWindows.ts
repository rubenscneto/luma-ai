/**
 * Meal Windows — Enforcement de horários de refeição
 *
 * Garante que blocos de refeição (category='meal') respeitem
 * janelas válidas. Usado em plan-week e replan-day.
 */

export interface MealWindow {
    label: string;
    canonicalType: 'breakfast' | 'lunch' | 'snack' | 'dinner';
    keywords: string[];
    minMinutes: number; // 05:00 = 300
    maxMinutes: number; // 10:00 = 600
}

export const DEFAULT_MEAL_WINDOWS: MealWindow[] = [
    {
        label: 'café',
        canonicalType: 'breakfast',
        keywords: ['café', 'cafe', 'breakfast', 'café da manhã', 'desjejum', 'morning meal'],
        minMinutes: 300,  // 05:00
        maxMinutes: 600,  // 10:00
    },
    {
        label: 'almoço',
        canonicalType: 'lunch',
        keywords: ['almoço', 'almoco', 'lunch', 'refeição principal'],
        minMinutes: 660,  // 11:00
        maxMinutes: 840,  // 14:00
    },
    {
        label: 'lanche',
        canonicalType: 'snack',
        keywords: ['lanche', 'snack', 'lanche da tarde', 'merenda', 'coffee break'],
        minMinutes: 840,  // 14:00
        maxMinutes: 1080, // 18:00
    },
    {
        label: 'jantar',
        canonicalType: 'dinner',
        keywords: ['jantar', 'janta', 'dinner', 'refeição noturna', 'supper', 'ceia'],
        minMinutes: 1080, // 18:00
        maxMinutes: 1290, // 21:30
    },
];

/**
 * Detecta o tipo de refeição a partir de meta.mealType, título ou horário.
 *
 * Prioridade:
 * 1. meta.mealType (se fornecido pelo AI ou usuário)
 * 2. Match de keywords no título (case-insensitive, normalizado)
 * 3. Inferência por horário (fallback seguro)
 */
export function getMealType(
    title: string,
    startMin: number,
    meta?: Record<string, unknown>
): MealWindow | null {
    // 1. Explicit mealType from meta
    if (meta?.mealType && typeof meta.mealType === 'string') {
        const explicit = DEFAULT_MEAL_WINDOWS.find(
            w => w.label === (meta.mealType as string).toLowerCase()
        );
        if (explicit) return explicit;
    }

    // 2. Keyword match on title
    const normalizedTitle = normalizeForComparison(title);
    for (const window of DEFAULT_MEAL_WINDOWS) {
        if (window.keywords.some(k => normalizedTitle.includes(k))) {
            return window;
        }
    }

    // 3. Fallback: infer from time of day (only if category='meal')
    for (const window of DEFAULT_MEAL_WINDOWS) {
        if (startMin >= window.minMinutes && startMin < window.maxMinutes) {
            return window;
        }
    }

    return null;
}

/**
 * Verifica se uma refeição está dentro da sua janela válida.
 * Retorna { valid, window, nearestSlot }.
 */
export function validateMealWindow(
    title: string,
    startMin: number,
    meta?: Record<string, unknown>
): { valid: boolean; window: MealWindow | null; nearestSlot: number } {
    const window = getMealType(title, startMin, meta);
    if (!window) {
        return { valid: true, window: null, nearestSlot: startMin }; // Não é refeição conhecida, passa
    }

    const valid = startMin >= window.minMinutes && startMin <= window.maxMinutes;
    let nearestSlot = startMin;
    if (!valid) {
        // Clamp to nearest edge
        nearestSlot = startMin < window.minMinutes ? window.minMinutes : window.maxMinutes;
    }

    return { valid, window, nearestSlot };
}

/**
 * Normaliza texto para comparação: lowercase, sem acentos, trim.
 */
export function normalizeForComparison(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Remove diacríticos
}

/**
 * Gera idempotency_key estável (sem horário — permite solver mover).
 * Formato: source::category::normalizedTitle
 */
export function generateIdempotencyKey(
    source: string,
    category: string,
    title: string
): string {
    const normalized = normalizeForComparison(title)
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
    return `${source}::${category}::${normalized}`;
}

/**
 * Converte time string + date + timezone em timestamptz ISO string.
 * Usa construção correta com timezone offset.
 */
export function timeToTimestamptz(
    dateStr: string,
    timeStr: string,
    timezone: string = 'America/Sao_Paulo'
): string {
    // timeStr can be "07:00", "07:00:00", etc.
    const cleanTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;

    // Build a proper date in the target timezone
    // Use Intl to get the offset for the given timezone on this date
    const tempDate = new Date(`${dateStr}T${cleanTime}`);

    try {
        // Get the timezone offset using toLocaleString trick
        const utcDate = new Date(tempDate.toLocaleString('en-US', { timeZone: 'UTC' }));
        const tzDate = new Date(tempDate.toLocaleString('en-US', { timeZone: timezone }));
        const offsetMs = utcDate.getTime() - tzDate.getTime();
        const offsetMin = offsetMs / 60000;
        const sign = offsetMin >= 0 ? '+' : '-';
        const absOffset = Math.abs(offsetMin);
        const hh = String(Math.floor(absOffset / 60)).padStart(2, '0');
        const mm = String(absOffset % 60).padStart(2, '0');

        return `${dateStr}T${cleanTime}${sign}${hh}:${mm}`;
    } catch {
        // Fallback: raw concat without offset (DB will handle as UTC)
        return `${dateStr}T${cleanTime}`;
    }
}
