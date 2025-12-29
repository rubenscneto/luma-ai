import { NextResponse } from 'next/server';
import { generateRoutine } from '@/services/geminiService';

export async function POST(request: Request) {
    const body = await request.json();
    const routine = await generateRoutine(body);
    return NextResponse.json({ routine });
}
