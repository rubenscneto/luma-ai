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
    '/welcome',
    '/onboarding-rotina',
    '/onboarding-preview',
];

// Public routes that should redirect to dashboard if logged in
const PUBLIC_ROUTES = ['/', '/login', '/register'];

export async function updateSession(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    // CRITICAL: Always allow auth callback without any processing
    if (pathname.startsWith('/auth/callback')) {
        return NextResponse.next();
    }

    // Skip middleware for PWA/SW files (prevent interference with auth flow)
    if (
        pathname === "/sw.js" ||
        pathname === "/push-sw.js" ||
        pathname.startsWith("/workbox-") ||
        pathname === "/manifest.webmanifest" ||
        pathname === "/manifest.json" ||
        pathname === "/favicon.ico"
    ) {
        return NextResponse.next();
    }

    // Skip middleware for assets and API health checks
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/icons') ||
        pathname.startsWith('/images') ||
        pathname.startsWith('/api/healthcheck')
    ) {
        return NextResponse.next();
    }

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
                    // CRITICAL: Use pure setAll without overriding Supabase options
                    // Overriding httpOnly/secure/maxAge breaks OAuth/PKCE flow
                    response = NextResponse.next({
                        request: { headers: request.headers },
                    });

                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // Check if current path is protected
    const isProtectedRoute = PROTECTED_ROUTES.some(route =>
        pathname === route || pathname.startsWith(route + '/')
    );

    // Check if current path is public auth route
    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    // Check onboarding status for authenticated users on protected routes
    if (user && isProtectedRoute) {
        const { data: profile } = await supabase
            .from('routine_profiles')
            .select('user_id')
            .eq('user_id', user.id)
            .single();

        const isOnboardingRoute =
            pathname === '/welcome' ||
            pathname === '/onboarding-rotina' ||
            pathname === '/onboarding-preview';

        const isEntryOnboardingRoute =
            pathname === '/welcome' ||
            pathname === '/onboarding-rotina';

        if (!profile && !isOnboardingRoute) {
            // Force onboarding if profile is missing
            const url = request.nextUrl.clone();
            url.pathname = '/welcome';
            return NextResponse.redirect(url);
        } else if (profile && isEntryOnboardingRoute) {
            // Prevent loop: already onboarded user trying to view onboarding
            const url = request.nextUrl.clone();
            url.pathname = '/agenda';
            url.searchParams.set('view', 'week');
            return NextResponse.redirect(url);
        }
    }

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
