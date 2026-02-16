
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            user_id,
            occupations, // array
            occupation, // single string (legacy/fallback)
            peakProductivity,
            energyLevel,
            style,
            userSettings,
            fixedTasks,
            objectives,
            hobbies,
            description, // New field
            studyFocus   // New field (optional)
        } = body;

        if (!user_id) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        // 1. Upsert Routine Profile
        const profileData = {
            user_id,
            occupation: Array.isArray(occupations) ? occupations.join(', ') : (occupation || ''),
            occupations: Array.isArray(occupations) ? occupations : (occupation ? [occupation] : []),
            peak_productivity: peakProductivity,
            energy_level: energyLevel,
            style: style || 'balanced',
            wake_up_time: userSettings?.wake_up_time || '07:00',
            bed_time: userSettings?.bed_time || '23:00',
            goal: (objectives || []).join(', '),
            objectives: objectives || [],
            hobbies: hobbies || [],
            description: description || '',
            study_focus: studyFocus || null,
            updated_at: new Date().toISOString(),
        };

        const { error: profileError } = await supabaseAdmin
            .from('routine_profiles')
            .upsert(profileData, { onConflict: 'user_id' });

        if (profileError) {
            console.error('Error saving profile:', profileError);
            throw new Error('Failed to save profile');
        }

        // 2. Handle Fixed Blocks
        // First delete existing fixed blocks for this user (to avoid duplicates/stale data)
        const { error: deleteError } = await supabaseAdmin
            .from('fixed_blocks')
            .delete()
            .eq('user_id', user_id);

        if (deleteError) {
            console.error('Error deleting old fixed blocks:', deleteError);
        }

        // Insert new fixed blocks
        if (fixedTasks && fixedTasks.length > 0) {
            const newBlocks = [];

            for (const task of fixedTasks) {
                // FixedTask has days_of_week array, we need one block per day
                for (const day of task.days_of_week) {
                    newBlocks.push({
                        user_id,
                        title: task.title,
                        category: 'fixed', // Default category
                        day_of_week: day,
                        start_time: task.start_time, // HH:mm:ss ideally, but input is HH:mm
                        end_time: task.end_time,
                        is_active: true,
                        notes: 'Imported from onboarding'
                    });
                }
            }

            if (newBlocks.length > 0) {
                const { error: insertError } = await supabaseAdmin
                    .from('fixed_blocks')
                    .insert(newBlocks);

                if (insertError) {
                    console.error('Error inserting fixed blocks:', insertError);
                    throw new Error('Failed to save fixed blocks');
                }
            }

            return NextResponse.json({
                success: true,
                savedProfile: profileData,
                fixedBlocksCount: fixedTasks?.length || 0
            });

        } catch (error) {
            console.error('Save profile error:', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
    }
