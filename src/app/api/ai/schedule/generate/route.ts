import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getGeminiModel } from "@/lib/ai/gemini";
import { AgendaItem, FixedCommitment, RoutineProfileDB } from "@/types";

export async function POST(req: Request) {
    try {
        const { days = 7 } = await req.json().catch(() => ({})); // Default generate 7 days

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

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // 1. Fetch Context (Profile + Fixed)
        const { data: profile } = await supabase.from("routine_profiles").select("*").eq("user_id", user.id).single();
        const { data: fixed } = await supabase.from("fixed_commitments").select("*").eq("user_id", user.id);

        if (!profile) {
            return NextResponse.json({ error: "Profile not found. Please configure Routine first." }, { status: 404 });
        }

        // 2. Clear Old Generated Items for the period (to avoid duplication)
        const today = new Date();
        const endDate = new Date();
        endDate.setDate(today.getDate() + days);

        await supabase.from("agenda_items")
            .delete()
            .eq("user_id", user.id)
            .eq("generated", true)
            .gte("date", today.toISOString().split("T")[0])
            .lte("date", endDate.toISOString().split("T")[0]);


        // 3. Prompt Engineering
        const model = getGeminiModel();
        const prompt = `act as a productivity expert. Generate a daily schedule for the next ${days} days for a user with this profile:
    Occupation: ${profile.occupation}
    Peak Productivity: ${profile.peak_productivity}
    Energy: ${profile.energy_level}
    Goal: ${profile.goal}
    Sleep: ${profile.wake_up_time} to ${profile.bed_time}
    
    FIXED COMMITMENTS (Do NOT overlap):
    ${JSON.stringify(fixed)}

    Start from date: ${today.toISOString().split("T")[0]}

    Instructions:
    - Fill gaps with productive work/study blocks based on peak hours.
    - Add meals and breaks.
    - Respect fixed commitments strictly.
    - Varied schedule (don't repeat exactly same every day if possible).

    Output JSON ARRAY of objects:
    {
        "title": "string",
        "notes": "string (optional)",
        "date": "YYYY-MM-DD",
        "start_time": "HH:mm",
        "duration": number (minutes),
        "category": "work|study|health|leisure|fixed|project"
    }
    `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // 4. Parse & Save
        let items: any[] = [];
        try {
            const jsonStr = text.match(/\[[\s\S]*\]/)?.[0] || "[]";
            items = JSON.parse(jsonStr);
        } catch (e) {
            console.error("Failed to parse schedule JSON", text);
            return NextResponse.json({ error: "AI failed to generate valid JSON" }, { status: 500 });
        }

        if (items.length > 0) {
            const toInsert = items.map(item => ({
                user_id: user.id,
                title: item.title,
                notes: item.notes,
                date: item.date,
                start_time: item.start_time,
                duration: item.duration,
                category: item.category,
                status: "todo",
                generated: true
            }));

            const { error } = await supabase.from("agenda_items").insert(toInsert);
            if (error) throw error;
        }

        return NextResponse.json({ success: true, count: items.length });

    } catch (error: any) {
        console.error("Schedule Gen Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
