import { NextRequest, NextResponse } from 'next/server';
import { signOut } from '@/lib/supabase';
import { getSupabaseEnv } from '@/lib/supabase';

export async function POST(_req: NextRequest) {
  try {
    // Check if Supabase env vars are configured
    const env = getSupabaseEnv();
    if (!env) {
      return NextResponse.json(
        { error: 'Supabase not configured. Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY' },
        { status: 500 }
      );
    }

    await signOut();

    return NextResponse.json(
      { success: true, message: 'Signed out' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Sign out error:', error);
    return NextResponse.json(
      { error: error.message || 'Sign out failed' },
      { status: 500 }
    );
  }
}
