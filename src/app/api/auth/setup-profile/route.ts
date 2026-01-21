import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Create a Supabase client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const { userId, email, fullName } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profile')
      .select('id')
      .eq('userId', userId)
      .single();

    if (existingProfile) {
      return NextResponse.json(
        { message: 'Profile already exists' },
        { status: 200 }
      );
    }

    // Create business
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert({
        owner_user_id: userId,
        name: fullName ? `${fullName}'s Business` : 'My Business',
      })
      .select()
      .single();

    if (businessError || !business) {
      console.error('Business creation error:', businessError);
      return NextResponse.json(
        { error: 'Failed to create business' },
        { status: 500 }
      );
    }

    // Create profile with role='staff' (contractor)
    // Note: user_profile table requires userId (not id)
    const { error: profileError } = await supabaseAdmin
      .from('user_profile')
      .insert({
        userId,
        displayName: fullName || 'New User',
        country: 'GB',
        currency: 'GBP',
        units: 'metric',
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return NextResponse.json(
        { error: 'Failed to create profile' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Profile and business created successfully',
        business_id: business.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
