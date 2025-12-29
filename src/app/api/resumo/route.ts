import { NextResponse } from 'next/server';
import { summarizePDF } from '@/services/geminiService';

export async function POST(request: Request) {
    const { text } = await request.json();
    const summary = await summarizePDF(text);
    return NextResponse.json({ summary });
}
