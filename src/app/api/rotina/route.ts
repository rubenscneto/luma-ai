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

    // 1. Save Profile (Upsert)
    const profileData = {
        user_id: user.id,
        occupation: body.occupation,
        peak_productivity: body.peakProductivity, // Mapping camelCase to snake_case
        energy_level: body.energyLevel,
        style: body.style,
        wake_up_time: body.userSettings?.wake_up_time,
        bed_time: body.userSettings?.bed_time,
        goal: body.goal || "Maximizar produtividade"
    };

    const { error: profileError } = await supabase.from('routine_profiles').upsert(profileData);
    if (profileError) console.error("Error saving profile:", profileError);

    // 2. Save Fixed Commitments (Delete old & Insert new)
    if (body.fixedTasks && body.fixedTasks.length > 0) {
        await supabase.from('fixed_commitments').delete().eq('user_id', user.id);

        const fixedToInsert = body.fixedTasks.map((t: any) => ({
            user_id: user.id,
            title: t.title,
            start_time: t.start_time,
            end_time: t.end_time,
            days_of_week: t.days_of_week,
            category: "fixed"
        }));

        const { error: fixedError } = await supabase.from('fixed_commitments').insert(fixedToInsert);
        if (fixedError) console.error("Error saving fixed:", fixedError);
    }

    // 3. Generate Routine (AI)
    const routineBlocks = await generateRoutine(body);

    // 4. Persist Routine Blocks (Legacy/Display support)
    await supabase.from('routines').delete().eq('user_id', user.id);

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
    }

    return NextResponse.json({ routine: routineBlocks });
}
