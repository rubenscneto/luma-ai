import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { DAILY_PLAN_SYSTEM_PROMPT, DAILY_PLAN_USER_PROMPT } from '@/ai/prompts/dailyPlanPrompt';
import { DailyPlanAIResponseSchema } from '@/ai/schemas/aiSchemas';
import { persistDailyBlocks, BlockInput } from '@/lib/persistDailyBlocks';
import { timeToTimestamptz } from '@/lib/mealWindows';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { user_id, date, timezone = 'America/Sao_Paulo' } = body;

        if (!user_id || !date) {
            return NextResponse.json({ error: 'user_id and date are required' }, { status: 400 });
        }

        // Create admin client for server-side operations
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get user profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user_id)
            .single();

        const userName = profile?.full_name?.split(' ')[0] || 'Usuário';

        // Get fixed blocks for the day of week
        const targetDate = new Date(date);
        const dayOfWeek = targetDate.getDay();

        const { data: fixedBlocks } = await supabase
            .from('fixed_blocks')
            .select('*')
            .eq('user_id', user_id)
            .eq('day_of_week', dayOfWeek)
            .eq('is_active', true);

        // Get health profile if exists
        const { data: healthProfile } = await supabase
            .from('health_profile')
            .select('*')
            .eq('user_id', user_id)
            .single();

        // Get wake/sleep times
        const wakeTime = healthProfile?.wake_time || '07:00';
        const sleepTime = healthProfile?.sleep_time || '22:00';

        // Build context for AI
        const context = {
            userName,
            date,
            timezone,
            wakeTime,
            sleepTime,
            fixedBlocks: fixedBlocks || [],
            healthProfile: healthProfile || undefined,
        };

        // Generate plan with Gemini
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: { responseMimeType: 'application/json' }
        });

        const prompt = `${DAILY_PLAN_SYSTEM_PROMPT}\n\n${DAILY_PLAN_USER_PROMPT(context)}`;
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Parse and validate response
        let aiResponse;
        try {
            const jsonStr = responseText.replace(/```json|```/g, '').trim();
            aiResponse = JSON.parse(jsonStr);
            DailyPlanAIResponseSchema.parse(aiResponse);
        } catch (parseError) {
            console.error('AI response parse error:', parseError);
            // Fallback: try to extract JSON
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

        // Create or update daily plan
        const { data: existingPlan } = await supabase
            .from('daily_plan')
            .select('id')
            .eq('user_id', user_id)
            .eq('plan_date', date)
            .single();

        let planId: string;

        if (existingPlan) {
            planId = existingPlan.id;
        } else {
            const { data: newPlan, error } = await supabase
                .from('daily_plan')
                .insert({
                    user_id,
                    plan_date: date,
                    timezone,
                    status: 'active'
                })
                .select()
                .single();

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }
            planId = newPlan.id;
        }

        // Build blocks array for persistDailyBlocks
        const fixedBlockInputs: BlockInput[] = (fixedBlocks || []).map((fb: any, index: number) => ({
            title: fb.title,
            category: fb.category,
            start_datetime: timeToTimestamptz(date, fb.start_time, timezone),
            end_datetime: timeToTimestamptz(date, fb.end_time, timezone),
            source: 'fixed' as const,
            order_index: index * 10,
            meta: { fixed_block_id: fb.id },
        }));

        const aiBlockInputs: BlockInput[] = aiResponse.blocks.map((block: any, index: number) => ({
            title: block.title,
            category: block.category,
            start_datetime: block.start,
            end_datetime: block.end,
            source: 'ai' as const,
            order_index: (fixedBlockInputs.length + index) * 10,
            meta: block.meta || {},
        }));

        const allBlockInputs = [...fixedBlockInputs, ...aiBlockInputs];

        // Use centralized persist (handles dedup, stale cleanup, NULL key cleanup)
        const persistResult = await persistDailyBlocks(
            supabase, planId, user_id, date, allBlockInputs,
            { deleteStale: true, deleteNullKeys: true }
        );

        // Update plan status
        await supabase
            .from('daily_plan')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', planId);

        return NextResponse.json({
            success: true,
            plan_id: planId,
            blocks_created: persistResult.inserted + persistResult.updated,
            summary: aiResponse.summary,
            insight: aiResponse.insight
        });

    } catch (error: any) {
        console.error('Generate daily plan error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
