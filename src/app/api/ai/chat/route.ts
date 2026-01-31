import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getGeminiModel } from "@/lib/ai/gemini";
import { LUMAAI_SYSTEM_PROMPT } from "@/lib/ai/prompts";

export async function POST(req: Request) {
    try {
        const { message, history } = await req.json();

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
            .select("full_name") // Assuming 'full_name' or 'name' exists based on schema. Checking prior context... using full_name or name
            .eq("id", user.id)
            .single();

        if (profile?.full_name) {
            userName = profile.full_name.split(" ")[0]; // First name
        }

        // 3. Prepare Prompt
        const systemPrompt = LUMAAI_SYSTEM_PROMPT.replace("{USER_NAME}", userName);

        // 4. Call Gemini
        const model = getGeminiModel();
        const chat = model.startChat({
            history: history.map((msg: any) => ({
                role: msg.role === "user" ? "user" : "model",
                parts: [{ text: msg.content }],
            })),
        });

        const result = await chat.sendMessage(systemPrompt + "\n\nUser Message: " + message);
        const responseText = result.response.text();

        // 5. Parse JSON (Robust)
        let parsedResponse;
        try {
            // Try strictly first
            parsedResponse = JSON.parse(responseText);
        } catch (e) {
            // Fallback: Try regex to extract JSON
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    parsedResponse = JSON.parse(jsonMatch[0]);
                } catch (e2) {
                    // Final Fallback: Return text as reply
                    parsedResponse = { reply: responseText, actions: [] };
                }
            } else {
                parsedResponse = { reply: responseText, actions: [] };
            }
        }

        // 6. Handle Actions (Server-Side Execution)
        if (parsedResponse.actions && parsedResponse.actions.length > 0) {
            const tasksToInsert: any[] = [];

            parsedResponse.actions.forEach((action: any) => {
                if (action.type === 'create_task' || action.type === 'create_project_task') {
                    // Determine table based on action or simplified to 'agenda_items' vs 'tasks' 
                    // For now, let's put everything in 'agenda_items' for the calendar
                    tasksToInsert.push({
                        user_id: user.id,
                        title: action.title,
                        date: action.date || new Date().toISOString().split("T")[0],
                        start_time: action.start || "09:00",
                        duration: action.durationMin || 30,
                        category: action.category || "work",
                        status: "todo",
                        generated: true
                    });
                }
            });

            if (tasksToInsert.length > 0) {
                await supabase.from('agenda_items').insert(tasksToInsert);
            }
        }

        return NextResponse.json({
            userName,
            reply: parsedResponse.reply || "Desculpe, não entendi.",
            actions: parsedResponse.actions || []
        });

    } catch (error: any) {
        console.error("Chat API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
