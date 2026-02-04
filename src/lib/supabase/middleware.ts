import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    );
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // Protect private routes
    if (!user && (
        request.nextUrl.pathname.startsWith('/dashboard') ||
        request.nextUrl.pathname.startsWith('/agenda') ||
        request.nextUrl.pathname.startsWith('/rotina') ||
        request.nextUrl.pathname.startsWith('/saude') ||
        request.nextUrl.pathname.startsWith('/estudos') ||
        request.nextUrl.pathname.startsWith('/projetos') ||
        request.nextUrl.pathname.startsWith('/biblioteca') ||
        request.nextUrl.pathname.startsWith('/configuracoes')
    )) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    // Redirect authenticated users from public routes
    if (user && (
        request.nextUrl.pathname === '/' ||
        request.nextUrl.pathname === '/login' ||
        request.nextUrl.pathname === '/register'
    )) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
    }

    return response;
}
