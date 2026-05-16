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
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single();

    // If "no rows" => it's fine (we will create). Any other error should be treated as real.
    if (existingProfileError && existingProfileError.code !== 'PGRST116') {
      console.error('Profile lookup error:', existingProfileError);
      return NextResponse.json({ error: 'Failed to check existing profile' }, { status: 500 });
    }

    if (existingProfile) {
      return NextResponse.json({ message: 'Profile already exists' }, { status: 200 });
    }

    // Create workspace (replaces old businesses table)
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from('workspaces')
      .insert({
        name: fullName ? `${fullName}'s Workspace` : 'My Workspace',
        created_by: userId,
        plan_tier: 'free',
      })
      .select()
      .single();

    if (workspaceError || !workspace) {
      console.error('Workspace creation error:', workspaceError);
      return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
    }

    // Link user to workspace
    await supabaseAdmin
      .from('workspace_members')
      .upsert(
        { user_id: userId, workspace_id: workspace.id, role: 'owner' },
        { onConflict: 'user_id,workspace_id' },
      );

    // Create user profile
    const { error: profileError } = await supabaseAdmin.from('user_profiles').insert({
      id: userId,
      email: email,
      full_name: fullName || 'New User',
      current_workspace_id: workspace.id,
    });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
    }

    return NextResponse.json(
      {
        message: 'Profile and workspace created successfully',
        workspace_id: workspace.id,
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
