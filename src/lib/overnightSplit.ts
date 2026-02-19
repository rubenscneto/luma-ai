
import { BlockInput } from './persistDailyBlocks';

function addOneDay(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
}

function extractTime(datetime: string): string {
    const match = datetime.match(/T(\d{2}:\d{2})/);
    return match ? match[1] : '00:00';
}

/**
 * Divide blocos overnight em dois.
 * Retorna { today: BlockInput[], nextDay: BlockInput[] }
 */
export function splitOvernightBlocks(
    blocks: BlockInput[],
    dateStr: string
): { today: BlockInput[]; nextDay: BlockInput[] } {
    const today: BlockInput[] = [];
    const nextDay: BlockInput[] = [];

    for (const block of blocks) {
        const startH = new Date(block.start_datetime).getHours();
        const endH = new Date(block.end_datetime).getHours();
        const endM = new Date(block.end_datetime).getMinutes();
        // Definition of overnight: End hour < Start hour OR (End is 00:00 and Start > 0)
        const isOvernight = endH < startH || (endH === 0 && endM === 0 && startH > 0);

        if (!isOvernight) {
            today.push(block);
            continue;
        }

        // Dia D: início original → 23:59
        today.push({
            ...block,
            end_datetime: `${dateStr}T23:59:00`,
        });

        // Dia D+1: 00:00 → fim original
        const nextDateStr = addOneDay(dateStr);
        const endTime = extractTime(block.end_datetime);
        nextDay.push({
            ...block,
            title: `${block.title} (Cont.)`,
            start_datetime: `${nextDateStr}T00:00:00`,
            end_datetime: `${nextDateStr}T${endTime}:00`,
            meta: { ...(block.meta || {}), overnight_continuation: true },
        });
    }

    return { today, nextDay };
}
