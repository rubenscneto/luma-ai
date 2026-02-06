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

    // 1. Save Profile (Upsert) - includes objectives and hobbies
    const profileData = {
        user_id: user.id,
        occupation: body.occupation,
        peak_productivity: body.peakProductivity, // Mapping camelCase to snake_case
        energy_level: body.energyLevel,
        style: body.style,
        wake_up_time: body.userSettings?.wake_up_time,
        bed_time: body.userSettings?.bed_time,
        goal: body.goal || "Maximizar produtividade",
        objectives: body.objectives || [],
        hobbies: body.hobbies || [],
        updated_at: new Date().toISOString(),
    };

    const { error: profileError } = await supabase.from('routine_profiles').upsert(profileData);
    if (profileError) console.error("Error saving profile:", profileError);

    // 2. Save Fixed Commitments (Delete old & Insert new)
    if (body.fixedTasks && body.fixedTasks.length > 0) {
        await supabase.from('fixed_blocks').delete().eq('user_id', user.id);

        // Create separate entries for each day (day_of_week is integer 0-6)
        const fixedToInsert: any[] = [];

        for (const task of body.fixedTasks) {
            // days_of_week can be array of day numbers or names
            const days = task.days_of_week || task.day_of_week || [];
            const daysArray = Array.isArray(days) ? days : [days];

            for (const day of daysArray) {
                // Convert day name to number if needed
                let dayNum = day;
                if (typeof day === 'string') {
                    const dayMap: Record<string, number> = {
                        'sunday': 0, 'segunda': 1, 'monday': 1, 'terça': 2, 'tuesday': 2,
                        'quarta': 3, 'wednesday': 3, 'quinta': 4, 'thursday': 4,
                        'sexta': 5, 'friday': 5, 'sabado': 6, 'saturday': 6, 'domingo': 0
                    };
                    dayNum = dayMap[day.toLowerCase()] ?? parseInt(day);
                }

                fixedToInsert.push({
                    user_id: user.id,
                    title: task.title,
                    start_time: task.start_time,
                    end_time: task.end_time,
                    day_of_week: dayNum,
                    category: task.category || 'fixed',
                    is_active: true
                });
            }
        }

        if (fixedToInsert.length > 0) {
            const { error: fixedError } = await supabase.from('fixed_blocks').insert(fixedToInsert);
            if (fixedError) console.error("Error saving fixed:", fixedError);
        }
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
