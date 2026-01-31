import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getGeminiModel } from "@/lib/ai/gemini";

const FALLBACK_QUOTES = [
    { text: "A única maneira de fazer um excelente trabalho é amar o que você faz.", author: "Steve Jobs" },
    { text: "O sucesso não é final, o fracasso não é fatal: é a coragem de continuar que conta.", author: "Winston Churchill" },
    { text: "A lógica pode levar de A a B. A imaginação leva a qualquer lugar.", author: "Albert Einstein" },
];

export async function GET(req: Request) {
    try {
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

        // If not auth, return random fallback
        if (!user) {
            const random = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
            return NextResponse.json({ motivation: { ...random, generated: false } });
        }

        const todayStr = new Date().toISOString().split("T")[0];

        // 1. Check Cache (Table 'insights' used for generic storage or create 'daily_motivations'?)
        // Let's use 'insights' table with type='motivation_daily'
        const { data: cached } = await supabase
            .from("insights")
            .select("*")
            .eq("user_id", user.id)
            .eq("type", "motivation_daily")
            .eq("date", todayStr)
            .single();

        if (cached) {
            return NextResponse.json({ motivation: JSON.parse(cached.content) });
        }

        // 2. Generate New
        const model = getGeminiModel();
        const prompt = `Gere uma frase motivacional curta e poderosa (PT-BR) de um autor famoso diferente de Steve Jobs ou Einstein.
    JSON Output: { "text": "Frase", "author": "Autor" }`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonStr = text.match(/\{[\s\S]*\}/)?.[0];

        if (!jsonStr) throw new Error("Failed to parse motivation JSON");

        const motivation = JSON.parse(jsonStr);

        // 3. Save Cache
        await supabase.from("insights").insert({
            user_id: user.id,
            type: "motivation_daily",
            date: todayStr,
            content: JSON.stringify(motivation)
        });

        return NextResponse.json({ motivation });

    } catch (error) {
        console.error("Motivation Error:", error);
        const random = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
        return NextResponse.json({ motivation: { ...random, fallback: true } });
    }
}
