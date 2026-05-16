// src/app/api/workspace/members/route.ts
//
// GET    /api/workspace/members — list workspace members with profile info.
// POST   /api/workspace/members — invite (add) a member by email with role + cap check.
// PATCH  /api/workspace/members — update a member's role (owner/admin only).
// DELETE /api/workspace/members — remove a member from the workspace (owner/admin only).
// Used by MemberPicker and Team Management page.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { resolveUserFromToken } from '@/lib/workspace-data';
import { createServerSupabaseClient } from '@/lib/supabase';
import { maxWorkspaceMembers, normalizePlanTier } from '@/lib/plans';

function extractToken(req: NextRequest): string | null {
  return req.headers.get('Authorization')?.replace('Bearer ', '') || null;
}

export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolved = await resolveUserFromToken(token);
    if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const workspaceId = resolved.workspaceId ?? resolved.businessId;
    if (!workspaceId) return NextResponse.json({ members: [] });

    const supabase = createServerSupabaseClient();

    // Join workspace_members with profiles to get names/emails
    const { data: members, error } = await supabase
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', workspaceId);

    if (error || !members || members.length === 0) {
      return NextResponse.json({ members: [] });
    }

    const userIds = members.map((m: { user_id: string }) => m.user_id);

    // Query user_profiles table (primary source)
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    const profileMap = new Map<string, { full_name: string | null; email: string | null }>();
    for (const p of profiles ?? []) {
      profileMap.set(p.id, { full_name: p.full_name, email: p.email });
    }

    // For any members still missing data, try Supabase auth admin API
    const missingIds = userIds.filter(
      (uid: string) =>
        !(profileMap.get(uid)?.full_name || profileMap.get(uid)?.email),
    );
    const authMap = new Map<string, { full_name: string | null; email: string | null }>();
    for (const uid of missingIds) {
      try {
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(uid);
        if (authUser) {
          authMap.set(uid, {
            full_name: (authUser.user_metadata?.full_name as string) ?? null,
            email: authUser.email ?? null,
          });
        }
      } catch { /* skip — best effort */ }
    }

    const enriched = members.map((m: { user_id: string; role: string }) => {
      const prof = profileMap.get(m.user_id);
      const auth = authMap.get(m.user_id);
      return {
        user_id: m.user_id,
        role: m.role,
        full_name: prof?.full_name || auth?.full_name || null,
        email: prof?.email || auth?.email || null,
      };
    });

    console.log('[GET /api/workspace/members] Returning', enriched.length, 'members for workspace', workspaceId, '— names resolved:', enriched.filter((m: { full_name: string | null }) => m.full_name).length, '/ emails resolved:', enriched.filter((m: { email: string | null }) => m.email).length);
    return NextResponse.json({ members: enriched });
  } catch (err) {
    console.error('[GET /api/workspace/members] Failed:', err);
    return NextResponse.json({ error: 'Failed to load members' }, { status: 500 });
  }
}

// ─── PATCH: Update a member's role ──────────────────────────────────────────
// Body: { user_id: string, role: 'admin' | 'member' | 'accountant' }
// Only owner can change roles. Cannot change own role. Cannot assign 'owner'.

const VALID_ASSIGNABLE_ROLES = ['admin', 'member', 'accountant'] as const;

export async function PATCH(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolved = await resolveUserFromToken(token);
    if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const workspaceId = resolved.workspaceId ?? resolved.businessId;
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 400 });

    const supabase = createServerSupabaseClient();

    // Verify caller is owner
    const { data: callerMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('user_id', resolved.authId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (!callerMembership || (callerMembership.role !== 'owner' && callerMembership.role !== 'admin')) {
      return NextResponse.json({ error: 'Only the workspace owner or admin can change member roles.' }, { status: 403 });
    }

    const body = await req.json();
    const targetUserId = body?.user_id;
    const newRole = body?.role;

    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    if (!VALID_ASSIGNABLE_ROLES.includes(newRole)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ASSIGNABLE_ROLES.join(', ')}` },
        { status: 400 },
      );
    }

    // Cannot change own role
    if (targetUserId === resolved.authId) {
      return NextResponse.json({ error: 'Cannot change your own role.' }, { status: 400 });
    }

    // Verify target is a member
    const { data: targetMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('user_id', targetUserId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (!targetMembership) {
      return NextResponse.json({ error: 'User is not a member of this workspace.' }, { status: 404 });
    }

    // Cannot reassign the owner role from someone else
    if (targetMembership.role === 'owner') {
      return NextResponse.json({ error: "Cannot change the owner's role." }, { status: 403 });
    }

    // Update role
    const { error: updateError } = await supabase
      .from('workspace_members')
      .update({ role: newRole })
      .eq('user_id', targetUserId)
      .eq('workspace_id', workspaceId);

    if (updateError) {
      console.error('[PATCH /api/workspace/members] Update failed:', updateError.message);
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }

    return NextResponse.json({ success: true, user_id: targetUserId, role: newRole });
  } catch (err) {
    console.error('[PATCH /api/workspace/members] Failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ─── POST: Invite (add) a member by email ───────────────────────────────────
// Body: { email: string, role: 'admin' | 'member' | 'accountant' }
// Owner or admin only. Enforces maxWorkspaceMembers cap.

export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolved = await resolveUserFromToken(token);
    if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const workspaceId = resolved.workspaceId ?? resolved.businessId;
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 400 });

    const supabase = createServerSupabaseClient();

    // Verify caller is owner or admin
    const { data: callerMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('user_id', resolved.authId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (!callerMembership || (callerMembership.role !== 'owner' && callerMembership.role !== 'admin')) {
      return NextResponse.json({ error: 'Only the workspace owner or admin can invite members.' }, { status: 403 });
    }

    const body = await req.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const role = body?.role;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    if (!VALID_ASSIGNABLE_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ASSIGNABLE_ROLES.join(', ')}` },
        { status: 400 },
      );
    }

    // ── Cap enforcement ──
    const { data: ws } = await supabase
      .from('workspaces')
      .select('plan_tier')
      .eq('id', workspaceId)
      .maybeSingle();

    const tier = normalizePlanTier(ws?.plan_tier);
    const cap = maxWorkspaceMembers(tier);

    const { count: currentCount } = await supabase
      .from('workspace_members')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    if ((currentCount ?? 0) >= cap) {
      return NextResponse.json(
        { error: `Workspace member limit reached (${cap}). Upgrade your plan to add more members.` },
        { status: 403 },
      );
    }

    // ── Resolve user by email ──
    let targetUserId: string | null = null;

    // Search user_profiles for existing user with this email
    const { data: profileMatch } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (profileMatch) {
      targetUserId = profileMatch.id;
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'No registered user found with that email. They must create an account first.' },
        { status: 404 },
      );
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('user_id', targetUserId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'This user is already a member of the workspace.' }, { status: 409 });
    }

    // Insert new member
    const { error: insertError } = await supabase
      .from('workspace_members')
      .insert({ workspace_id: workspaceId, user_id: targetUserId, role });

    if (insertError) {
      console.error('[POST /api/workspace/members] Insert failed:', insertError.message);
      return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
    }

    console.log('[POST /api/workspace/members] Added', email, 'as', role, 'to workspace', workspaceId);
    return NextResponse.json({ success: true, user_id: targetUserId, role, email });
  } catch (err) {
    console.error('[POST /api/workspace/members] Failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ─── DELETE: Remove a member from the workspace ─────────────────────────────
// Body: { user_id: string }
// Owner or admin only. Cannot remove owner. Cannot remove self.

export async function DELETE(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolved = await resolveUserFromToken(token);
    if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const workspaceId = resolved.workspaceId ?? resolved.businessId;
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 400 });

    const supabase = createServerSupabaseClient();

    // Verify caller is owner or admin
    const { data: callerMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('user_id', resolved.authId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (!callerMembership || (callerMembership.role !== 'owner' && callerMembership.role !== 'admin')) {
      return NextResponse.json({ error: 'Only the workspace owner or admin can remove members.' }, { status: 403 });
    }

    const body = await req.json();
    const targetUserId = body?.user_id;

    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Cannot remove self
    if (targetUserId === resolved.authId) {
      return NextResponse.json({ error: 'Cannot remove yourself from the workspace.' }, { status: 400 });
    }

    // Verify target is a member
    const { data: targetMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('user_id', targetUserId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (!targetMembership) {
      return NextResponse.json({ error: 'User is not a member of this workspace.' }, { status: 404 });
    }

    // Cannot remove owner
    if (targetMembership.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove the workspace owner.' }, { status: 403 });
    }

    // Admin cannot remove another admin (only owner can)
    if (targetMembership.role === 'admin' && callerMembership.role !== 'owner') {
      return NextResponse.json({ error: 'Only the workspace owner can remove admins.' }, { status: 403 });
    }

    // Delete member
    const { error: deleteError } = await supabase
      .from('workspace_members')
      .delete()
      .eq('user_id', targetUserId)
      .eq('workspace_id', workspaceId);

    if (deleteError) {
      console.error('[DELETE /api/workspace/members] Delete failed:', deleteError.message);
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    console.log('[DELETE /api/workspace/members] Removed', targetUserId, 'from workspace', workspaceId);
    return NextResponse.json({ success: true, user_id: targetUserId });
  } catch (err) {
    console.error('[DELETE /api/workspace/members] Failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
