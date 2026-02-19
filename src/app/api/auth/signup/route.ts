import { NextRequest, NextResponse } from 'next/server';
import { signUp } from '@/lib/supabase';
import { upsertUser } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    // Sign up with Supabase
    const { user, session } = await signUp(email, password);

    if (!user || !session) {
      return NextResponse.json(
        { error: 'Sign up failed' },
        { status: 400 }
      );
    }

    // Create user in database with free subscription
    await upsertUser(user.id, email, name);

    return NextResponse.json(
      {
        success: true,
        user,
        session,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: error.message || 'Sign up failed' },
      { status: 500 }
    );
  }
}
