import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const next = url.searchParams.get("next") || "/dashboard";
    const origin = url.origin;

    if (code) {
        const cookieStore = await cookies();

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) => {
                                cookieStore.set(name, value, options);
                            });
                        } catch (error) {
                            console.error('Cookie set error:', error);
                        }
                    },
                },
            }
        );

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            console.log('Auth callback success, redirecting to:', next);
            return NextResponse.redirect(new URL(next, origin));
        }

        console.error('Exchange code error:', error);
        return NextResponse.redirect(
            new URL(`/login?error=auth-code-error&message=${encodeURIComponent(error.message)}`, origin)
        );
    }

    // Return the user to an error page with instructions
    console.error('Auth callback failed - no code or exchange error');
    return NextResponse.redirect(new URL("/login?error=auth-code-error&message=No+code+provided", origin));
}
