import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { RECURRENCE_DETECTION_PROMPT } from '@/ai/prompts/agendaPrompts';

export const dynamic = 'force-dynamic';

const inputSchema = z.object({
    user_id: z.string().uuid(),
});

const suggestionSchema = z.object({
    title: z.string(),
    category: z.string(),
    days: z.array(z.number()),
    start_time: z.string(),
    end_time: z.string(),
    confidence: z.number(),
    occurrences: z.number(),
    pattern_description: z.string().optional(),
});

const responseSchema = z.object({
    suggestions: z.array(suggestionSchema),
});

export async function POST(request: NextRequest) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase: any = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

        const body = await request.json();
        const input = inputSchema.parse(body);

        // Get last 14 days of blocks (non-fixed)
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const { data: recentBlocks } = await supabase
            .from('daily_blocks')
            .select('title, category, start_datetime, end_datetime, source')
            .eq('user_id', input.user_id)
            .neq('source', 'fixed')
            .gte('start_datetime', fourteenDaysAgo.toISOString())
            .order('start_datetime', { ascending: true });

        if (!recentBlocks || recentBlocks.length < 4) {
            return NextResponse.json({
                success: true,
                suggestions: [],
                message: 'Poucos dados para detectar padrões. Continue usando a agenda por mais alguns dias.',
            });
        }

        // Get existing fixed blocks to exclude them from suggestions
        const { data: fixedBlocks } = await supabase
            .from('fixed_blocks')
            .select('title, category, day_of_week, start_time, end_time')
            .eq('user_id', input.user_id)
            .eq('is_active', true);

        // Build context for AI
        const blocksContext = (recentBlocks as any[]).map((b: any) => {
            const start = new Date(b.start_datetime);
            const end = new Date(b.end_datetime);
            const dayOfWeek = start.getDay();
            const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            return `${dayNames[dayOfWeek]} ${start.toISOString().split('T')[0]} ${start.toTimeString().slice(0, 5)}-${end.toTimeString().slice(0, 5)}: ${b.title} (${b.category}, source=${b.source})`;
        }).join('\n');

        const fixedContext = ((fixedBlocks || []) as any[]).map((fb: any) => {
            const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            return `${dayNames[fb.day_of_week]} ${fb.start_time}-${fb.end_time}: ${fb.title} (${fb.category})`;
        }).join('\n');

        const prompt = `HISTÓRICO DE BLOCOS (últimos 14 dias):
${blocksContext}

BLOCOS FIXOS JÁ EXISTENTES (excluir da detecção):
${fixedContext || 'Nenhum'}

TAREFA:
Analise o histórico acima e identifique padrões recorrentes que o usuário repete frequentemente mas que NÃO são blocos fixos.
Retorne apenas padrões com pelo menos 2 ocorrências e confiança mínima de 50%.`;

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent({
            contents: [
                { role: 'user', parts: [{ text: RECURRENCE_DETECTION_PROMPT }] },
                { role: 'model', parts: [{ text: 'Entendido. Vou analisar o histórico e identificar padrões recorrentes.' }] },
                { role: 'user', parts: [{ text: prompt }] },
            ],
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.3,
            },
        });

        const responseText = result.response.text();
        let parsed: z.infer<typeof responseSchema>;

        try {
            parsed = responseSchema.parse(JSON.parse(responseText));
        } catch (parseError) {
            console.error('Recurrence detection parse error:', parseError);
            parsed = { suggestions: [] };
        }

        // Add IDs to suggestions
        const suggestions = parsed.suggestions.map((s, i) => ({
            ...s,
            id: `recurrence-${Date.now()}-${i}`,
        }));

        return NextResponse.json({
            success: true,
            suggestions,
            total_blocks_analyzed: recentBlocks.length,
        });

    } catch (error) {
        console.error('Recurrence detection error:', error);
        return NextResponse.json(
            { error: 'Failed to detect recurrences', details: String(error) },
            { status: 500 }
        );
    }
}
