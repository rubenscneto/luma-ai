import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// All routes that require authentication
const PROTECTED_ROUTES = [
    '/dashboard',
    '/agenda',
    '/rotina',
    '/saude',
    '/estudos',
    '/projetos',
    '/biblioteca',
    '/configuracoes',
    '/analytics',
    '/perdidao',
];

// Public routes that should redirect to dashboard if logged in
const PUBLIC_ROUTES = ['/', '/login', '/register', '/auth/callback'];

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
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, {
                            ...options,
                            // Ensure cookies persist properly
                            httpOnly: true,
                            secure: process.env.NODE_ENV === 'production',
                            sameSite: 'lax',
                            maxAge: 60 * 60 * 24 * 365, // 1 year
                        })
                    );
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();
    const pathname = request.nextUrl.pathname;

    // Check if current path is protected
    const isProtectedRoute = PROTECTED_ROUTES.some(route =>
        pathname === route || pathname.startsWith(route + '/')
    );

    // Check if current path is public auth route
    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    // Redirect unauthenticated users from protected routes
    if (!user && isProtectedRoute) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        // Save the intended destination for post-login redirect
        url.searchParams.set('redirectTo', pathname);
        return NextResponse.redirect(url);
    }

    // Redirect authenticated users from public routes to dashboard
    if (user && isPublicRoute) {
        const url = request.nextUrl.clone();
        // Check if there's a redirectTo param
        const redirectTo = request.nextUrl.searchParams.get('redirectTo');
        url.pathname = redirectTo || '/dashboard';
        url.searchParams.delete('redirectTo');
        return NextResponse.redirect(url);
    }

    return response;
}
