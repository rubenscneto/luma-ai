import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const userId = searchParams.get('user_id');

    if (!date || !userId) {
        return NextResponse.json({ error: 'Date and User ID are required' }, { status: 400 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: blocks, error } = await supabase
        .from('daily_blocks')
        .select('*')
        .eq('user_id', userId)
        .gte('start_datetime', `${date}T00:00:00`)
        .lte('start_datetime', `${date}T23:59:59`)
        .order('start_datetime', { ascending: true });

    if (error) {
        console.error('Export error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!blocks || blocks.length === 0) {
        return NextResponse.json({ error: 'No blocks found for this date' }, { status: 404 });
    }

    // Generate ICS content
    let icsContent = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//LumaAI//Agenda//PT\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n";

    blocks.forEach((block: any) => {
        // Format: 20231225T143000Z
        const start = block.start_datetime.replace(/[-:]/g, "").split(".")[0] + "Z";
        const end = block.end_datetime.replace(/[-:]/g, "").split(".")[0] + "Z";

        icsContent += "BEGIN:VEVENT\r\n";
        icsContent += `SUMMARY:${block.title}\r\n`;
        icsContent += `DTSTART:${start}\r\n`;
        icsContent += `DTEND:${end}\r\n`;
        icsContent += `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z\r\n`;
        icsContent += `DESCRIPTION:Categoria: ${block.category}\\nAgendado por: ${block.source}${block.meta?.suggested_reason ? `\\nMotivo: ${block.meta.suggested_reason}` : ''}\r\n`;
        icsContent += `UID:${block.id}@lumaai.pro\r\n`;
        icsContent += "STATUS:CONFIRMED\r\n";
        icsContent += "TRANSP:OPAQUE\r\n";
        icsContent += "END:VEVENT\r\n";
    });

    icsContent += "END:VCALENDAR\r\n";

    // Return the ICS file
    return new NextResponse(icsContent, {
        headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': `attachment; filename="luma-agenda-${date}.ics"`,
            'Cache-Control': 'no-cache',
        },
    });
}
