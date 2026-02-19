import { NextRequest, NextResponse } from 'next/server';
import { signIn } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    const { user, session } = await signIn(email, password);

    return NextResponse.json(
      {
        success: true,
        user,
        session,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Sign in error:', error);
    return NextResponse.json(
      { error: error.message || 'Sign in failed' },
      { status: 401 }
    );
  }
}
