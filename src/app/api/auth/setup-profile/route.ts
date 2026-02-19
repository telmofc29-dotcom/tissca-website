import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// NOTE:
// Don't create the admin client at module load time.
// If env vars are missing on Vercel, createClient() can throw during build / route analysis.
// We create it lazily inside the request handler instead.

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase server env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  return createClient(url, serviceRoleKey);
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { userId, email, fullName } = await request.json();

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if profile already exists
    const { data: existingProfile, error: existingProfileError } = await supabaseAdmin
      .from('user_profile')
      .select('id')
      .eq('userId', userId)
      .single();

    // If "no rows" => it's fine (we will create). Any other error should be treated as real.
    if (existingProfileError && existingProfileError.code !== 'PGRST116') {
      console.error('Profile lookup error:', existingProfileError);
      return NextResponse.json({ error: 'Failed to check existing profile' }, { status: 500 });
    }

    if (existingProfile) {
      return NextResponse.json({ message: 'Profile already exists' }, { status: 200 });
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
      return NextResponse.json({ error: 'Failed to create business' }, { status: 500 });
    }

    // Create profile
    const { error: profileError } = await supabaseAdmin.from('user_profile').insert({
      userId,
      displayName: fullName || 'New User',
      country: 'GB',
      currency: 'GBP',
      units: 'metric',
      // If you have a business_id / businessId column in user_profile, you likely want to set it here.
      // business_id: business.id,
    });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
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

    // If env vars missing, return a clearer message (still safe).
    const msg =
      error instanceof Error ? error.message : 'Internal server error';

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
