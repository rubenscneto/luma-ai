import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const baseUrl = new URL(req.url).origin;
    return NextResponse.json(
        {
            error: "Endpoint descontinuado.",
            message: "Use /api/ai/agenda/plan-day ou /api/ai/agenda/plan-week. O modelo canônico agora é daily_plan + daily_blocks.",
            canonical_model: ["daily_plan", "daily_blocks"],
            replacements: {
                day: `${baseUrl}/api/ai/agenda/plan-day`,
                week: `${baseUrl}/api/ai/agenda/plan-week`
            }
        },
        { status: 410 }
    );
}
