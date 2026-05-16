import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { error: 'Supabase not configured.' },
        { status: 500 }
      );
    }

    const response = NextResponse.json(
      { success: true, message: 'Signed out' },
      { status: 200 }
    );

    // Create SSR client that can clear httpOnly cookies via response headers
    const supabase = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    await supabase.auth.signOut();

    return response;
  } catch (error: unknown) {
    console.error('Sign out error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sign out failed' },
      { status: 500 }
    );
  }
}
