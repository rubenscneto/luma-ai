import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { REPLAN_SYSTEM_PROMPT, REPLAN_USER_PROMPT } from '@/ai/prompts/replanPrompt';
import { ReplanAIResponseSchema } from '@/ai/schemas/aiSchemas';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            user_id,
            plan_id,
            event, // 'delay' | 'skip' | 'new_block' | 'manual'
            event_details,
            delay_minutes // for delay events
        } = body;

        if (!user_id || !plan_id) {
            return NextResponse.json({ error: 'user_id and plan_id are required' }, { status: 400 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get current blocks
        const { data: currentBlocks } = await supabase
            .from('daily_blocks')
            .select('*')
            .eq('plan_id', plan_id)
            .order('start_datetime', { ascending: true });

        if (!currentBlocks || currentBlocks.length === 0) {
            return NextResponse.json({ error: 'No blocks found for this plan' }, { status: 404 });
        }

        // Get health profile for sleep time
        const { data: healthProfile } = await supabase
            .from('health_profile')
            .select('sleep_time')
            .eq('user_id', user_id)
            .single();

        const sleepTime = healthProfile?.sleep_time || '22:00';
        const nowISO = new Date().toISOString();

        // Build context
        const context = {
            nowISO,
            event: event as 'delay' | 'skip' | 'new_block' | 'manual',
            eventDetails: event_details || `${event} de ${delay_minutes || 0} minutos`,
            currentBlocks: currentBlocks.map(b => ({
                id: b.id,
                title: b.title,
                category: b.category,
                start_datetime: b.start_datetime,
                end_datetime: b.end_datetime,
                source: b.source,
                is_done: b.is_done,
                is_skipped: b.is_skipped,
            })),
            sleepTime,
        };

        // Generate replan with Gemini
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: { responseMimeType: 'application/json' }
        });

        const prompt = `${REPLAN_SYSTEM_PROMPT}\n\n${REPLAN_USER_PROMPT(context)}`;
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Parse response
        let aiResponse;
        try {
            const jsonStr = responseText.replace(/```json|```/g, '').trim();
            aiResponse = JSON.parse(jsonStr);
            ReplanAIResponseSchema.parse(aiResponse);
        } catch (parseError) {
            console.error('AI response parse error:', parseError);
            const match = responseText.match(/\{[\s\S]*\}/);
            if (match) {
                aiResponse = JSON.parse(match[0]);
            } else {
                return NextResponse.json({
                    error: 'Failed to parse AI response',
                    raw: responseText
                }, { status: 500 });
            }
        }

        // Apply updates
        let updatedCount = 0;
        let removedCount = 0;

        for (const update of aiResponse.updated_blocks) {
            const { error } = await supabase
                .from('daily_blocks')
                .update({
                    start_datetime: update.start_datetime,
                    end_datetime: update.end_datetime,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', update.id)
                .eq('user_id', user_id); // Security check

            if (!error) updatedCount++;
        }

        // Remove blocks that don't fit
        if (aiResponse.removed_blocks && aiResponse.removed_blocks.length > 0) {
            const { error } = await supabase
                .from('daily_blocks')
                .delete()
                .in('id', aiResponse.removed_blocks)
                .eq('user_id', user_id)
                .neq('source', 'fixed'); // Never delete fixed blocks

            if (!error) removedCount = aiResponse.removed_blocks.length;
        }

        return NextResponse.json({
            success: true,
            updated_count: updatedCount,
            removed_count: removedCount,
            message: aiResponse.message,
            warning: aiResponse.warning,
        });

    } catch (error: any) {
        console.error('Replan error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
