import { NextResponse } from 'next/server';
import { generateInsight } from '@/services/geminiService';

export async function POST(request: Request) {
    const body = await request.json();
    const contextData = JSON.stringify(body);
    const insight = await generateInsight(contextData);
    return NextResponse.json({ insight });
}
