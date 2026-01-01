import { NextResponse } from 'next/server';
import { generateRoutine } from '@/services/geminiService';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    const body = await request.json();
    const cookieStore = await cookies();


    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    cookieStore.set({ name, value, ...options });
                },
                remove(name: string, options: CookieOptions) {
                    cookieStore.set({ name, value: '', ...options });
                },
            },
        }
    );

    // Get Auth User
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate Routine
    const routineBlocks = await generateRoutine(body);

    // Save Fixed Tasks & User Settings (if not already saved by frontend? Frontend does it? No, Frontend calls setsProfile in context but context might not save to DB immediately for these specific tables)
    // Actually, let's persist everything here to be safe or assume frontend handles profile updates.
    // The request body contains the profile.

    // Persist Routine Blocks
    // We need to delete old routine for this user first? Or just add?
    // Let's clear old routine blocks to avoid duplicate accumulation for now.
    await supabase.from('routines').delete().eq('user_id', user.id);

    // Insert new blocks
    const routinesToInsert = routineBlocks.map((block: any) => ({
        user_id: user.id,
        title: block.title,
        type: block.type,
        start_time: block.startTime,
        duration: block.duration
    }));

    const { error } = await supabase.from('routines').insert(routinesToInsert);

    if (error) {
        console.error('Error saving routine:', error);
        // Continue anyway to return the routine to UI
    }

    return NextResponse.json({ routine: routineBlocks });
}
