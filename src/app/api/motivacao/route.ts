import { NextResponse } from 'next/server';
import { generateMotivation } from '@/services/geminiService';

export async function GET() {
    const motivation = await generateMotivation();
    return NextResponse.json({ motivation });
}
