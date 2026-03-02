import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getGeminiModel } from "@/lib/ai/gemini";
import { LUMAAI_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { persistDailyBlocks, type BlockInput } from "@/lib/persistDailyBlocks";

type ChatHistoryItem = {
    role: 'user' | 'assistant';
    content: string;
};

type ActionInput = {
    type: string;
    title: string;
    date?: string;
    start?: string;
    durationMin?: number;
    category?: string;
};

type ParsedResponse = {
    reply?: string;
    actions?: ActionInput[];
};

function toIsoRange(date: string, start: string, durationMin: number) {
    const startDate = new Date(`${date}T${start}:00`);
    const endDate = new Date(startDate.getTime() + durationMin * 60_000);
    return {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
    };
}

export async function POST(req: Request) {
    try {
        const { message, history }: { message: string; history: ChatHistoryItem[] } = await req.json();

        // 1. Auth & Supabase Client
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) { return cookieStore.get(name)?.value; },
                    set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }); },
                    remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: "", ...options }); },
                },
            }
        );

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Fetch User Name
        let userName = user.email?.split("@")[0] || "Usuário";
        const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .single();

        if (profile?.full_name) {
            userName = profile.full_name.split(" ")[0];
        }

        // 3. Prepare Prompt
        const systemPrompt = LUMAAI_SYSTEM_PROMPT.replace("{USER_NAME}", userName);

        // 4. Call Gemini
        const model = getGeminiModel();
        const chat = model.startChat({
            history: history.map((msg) => ({
                role: msg.role === "user" ? "user" : "model",
                parts: [{ text: msg.content }],
            })),
        });

        const result = await chat.sendMessage(systemPrompt + "\n\nUser Message: " + message);
        const responseText = result.response.text();

        // 5. Parse JSON (Robust)
        let parsedResponse: ParsedResponse;
        try {
            parsedResponse = JSON.parse(responseText) as ParsedResponse;
        } catch {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    parsedResponse = JSON.parse(jsonMatch[0]) as ParsedResponse;
                } catch {
                    parsedResponse = { reply: responseText, actions: [] };
                }
            } else {
                parsedResponse = { reply: responseText, actions: [] };
            }
        }

        // 6. Handle Actions (Server-Side Execution)
        if (parsedResponse.actions && parsedResponse.actions.length > 0) {
            const tasksByDate = new Map<string, BlockInput[]>();

            parsedResponse.actions.forEach((action) => {
                if (action.type === 'create_task' || action.type === 'create_project_task') {
                    const date = action.date || new Date().toISOString().split("T")[0];
                    const start = action.start || "09:00";
                    const duration = action.durationMin || 30;
                    const range = toIsoRange(date, start, duration);

                    const block: BlockInput = {
                        title: action.title,
                        category: action.category || "work",
                        start_datetime: range.start,
                        end_datetime: range.end,
                        source: "manual",
                        meta: {
                            created_via: "ai_chat_action",
                            action_type: action.type,
                        },
                    };

                    const list = tasksByDate.get(date) || [];
                    list.push(block);
                    tasksByDate.set(date, list);
                }
            });

            for (const [date, newBlocks] of tasksByDate.entries()) {
                const { data: existingPlan } = await supabase
                    .from('daily_plan')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('plan_date', date)
                    .maybeSingle();

                let planId = existingPlan?.id as string | undefined;

                if (!planId) {
                    const { data: createdPlan, error: planError } = await supabase
                        .from('daily_plan')
                        .upsert({ user_id: user.id, plan_date: date }, { onConflict: 'user_id,plan_date' })
                        .select('id')
                        .single();

                    if (planError || !createdPlan) {
                        throw new Error(planError?.message || 'Falha ao criar daily_plan.');
                    }
                    planId = createdPlan.id;
                }

                if (!planId) {
                    throw new Error('Falha ao resolver daily_plan para persistência.');
                }

                const resolvedPlanId = planId;

                const { data: existingBlocks } = await supabase
                    .from('daily_blocks')
                    .select('*')
                    .eq('plan_id', resolvedPlanId)
                    .order('start_datetime', { ascending: true });

                const priorBlocks: BlockInput[] = (existingBlocks || []).map((block: Record<string, unknown>) => ({
                    title: String(block.title || ''),
                    category: String(block.category || 'work'),
                    start_datetime: String(block.start_datetime || ''),
                    end_datetime: String(block.end_datetime || ''),
                    source: (block.source as BlockInput['source']) || 'manual',
                    is_done: Boolean(block.is_done),
                    is_skipped: Boolean(block.is_skipped),
                    skip_reason: typeof block.skip_reason === 'string' ? block.skip_reason : undefined,
                    done_at: typeof block.done_at === 'string' ? block.done_at : undefined,
                    order_index: typeof block.order_index === 'number' ? block.order_index : undefined,
                    meta: (block.meta as Record<string, unknown>) || {},
                }));

                await persistDailyBlocks(
                    supabase,
                    resolvedPlanId,
                    user.id,
                    date,
                    [...priorBlocks, ...newBlocks],
                    {
                        deleteStale: false,
                        deleteNullKeys: false,
                        preserveStatus: true,
                    }
                );
            }
        }

        return NextResponse.json({
            userName,
            reply: parsedResponse.reply || "Desculpe, não entendi.",
            actions: parsedResponse.actions || []
        });

    } catch (error: unknown) {
        console.error("Chat API Error:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
