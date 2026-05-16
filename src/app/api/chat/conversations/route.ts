// src/app/api/chat/conversations/route.ts v5.0 — W-SYNC-1
//
// GET    /api/chat/conversations — list conversations for workspace
// POST   /api/chat/conversations — create conversation (dm or group)
// PATCH  /api/chat/conversations — rename, add/remove members, leave, mute/archive
// DELETE /api/chat/conversations — delete conversation + cascade
//
// W-SYNC-1 CHANGES:
// - Uses conversation_member_state for read/mute/archive
// - Conversations now include type, created_by, last_message_id, last_message_at, dm_key
// - conversation_members now includes workspace_id
// - Tier gating: only Team Starter / Team Pro allowed
// - Workspace membership validation on add_members
// - Member limit enforcement
// - Audit logging for create, delete, member add/remove, rename

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { resolveUserFromToken } from '@/lib/workspace-data';
import { createServerSupabaseClient } from '@/lib/supabase';
import { checkChatTierEligibility, checkMemberLimit, validateWorkspaceMembers, resolveChatWorkspaceId } from '@/lib/chat/chat-tier';

function extractToken(req: NextRequest): string | null {
  return req.headers.get('Authorization')?.replace('Bearer ', '') || null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Build a deterministic DM key for dedup: sorted user IDs joined by ':' */
function buildDmKey(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join(':');
}

// ─── Audit log helper ───────────────────────────────────────────────────────

async function auditLog(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  workspaceId: string,
  actorId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  conversationId: string | null,
  metadata?: Record<string, unknown>,
) {
  await supabase.from('message_audit_log').insert({
    workspace_id: workspaceId,
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    conversation_id: conversationId,
    metadata: metadata ? metadata : null,
  }).then(() => {}, (err) => {
    console.error('[audit_log] Insert failed:', err);
  });
}

// ─── GET — list conversations ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolved = await resolveUserFromToken(token);
    if (!resolved) return NextResponse.json({ conversations: [] });

    const workspaceId = resolveChatWorkspaceId(resolved);
    if (!workspaceId) return NextResponse.json({ conversations: [] });

    // Tier gate
    const tierCheck = await checkChatTierEligibility(workspaceId);
    if (!tierCheck.allowed) {
      return NextResponse.json({ error: tierCheck.reason, conversations: [] }, { status: 403 });
    }

    const supabase = createServerSupabaseClient();

    // Find conversation IDs the current user is a member of
    const { data: userMemberships, error: memErr } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', resolved.authId);

    if (memErr) {
      console.error('[GET /api/chat/conversations] Membership query failed:', memErr);
      return NextResponse.json({ conversations: [] });
    }

    const userConvIds = (userMemberships ?? []).map((m: { conversation_id: string }) => m.conversation_id);
    console.log('[GET /api/chat/conversations] user', resolved.authId, 'is member of', userConvIds.length, 'conversations in workspace', workspaceId);
    if (userConvIds.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    // Fetch only conversations the user belongs to, scoped to workspace
    const { data: conversations, error: convErr } = await supabase
      .from('conversations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .in('id', userConvIds)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(100);

    if (convErr) {
      console.error('[GET /api/chat/conversations] Query failed:', convErr);
      return NextResponse.json({ conversations: [] });
    }

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    const convIds = conversations.map((c: { id: string }) => c.id);

    // Fetch last message per conversation
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('*')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false })
      .limit(convIds.length * 2);

    // Fetch member state (read cursors, mute, archive) for current user
    const { data: memberStates } = await supabase
      .from('conversation_member_state')
      .select('conversation_id, last_read_message_id, last_read_at, is_muted, is_archived')
      .eq('user_id', resolved.authId)
      .in('conversation_id', convIds);

    // Fetch conversation members
    const { data: allMembers } = await supabase
      .from('conversation_members')
      .select('conversation_id, user_id, role, joined_at')
      .in('conversation_id', convIds);

    // Resolve member profile names
    const memberUserIds = [...new Set((allMembers ?? []).map((m: { user_id: string }) => m.user_id))];
    const profileMap = new Map<string, { full_name: string | null; email: string | null }>();
    if (memberUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .in('id', memberUserIds);
      for (const p of profiles ?? []) {
        profileMap.set(p.id, { full_name: p.full_name, email: p.email });
      }
    }

    // Group members by conversation
    const membersMap = new Map<string, Array<{ user_id: string; role: string; joined_at: string; full_name?: string; email?: string }>>();
    for (const m of allMembers ?? []) {
      const list = membersMap.get(m.conversation_id) ?? [];
      const profile = profileMap.get(m.user_id);
      list.push({
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        full_name: profile?.full_name ?? undefined,
        email: profile?.email ?? undefined,
      });
      membersMap.set(m.conversation_id, list);
    }

    // Build member state maps
    const stateMap = new Map<string, { last_read_message_id: string | null; last_read_at: string | null; is_muted: boolean; is_archived: boolean }>();
    for (const s of memberStates ?? []) {
      stateMap.set(s.conversation_id, {
        last_read_message_id: s.last_read_message_id,
        last_read_at: s.last_read_at,
        is_muted: s.is_muted ?? false,
        is_archived: s.is_archived ?? false,
      });
    }

    // Build last message map
    const lastMsgMap = new Map<string, unknown>();
    for (const msg of recentMessages ?? []) {
      if (!lastMsgMap.has(msg.conversation_id)) {
        lastMsgMap.set(msg.conversation_id, msg);
      }
    }

    // Build per-conversation message lists for unread counting
    const msgsByConv = new Map<string, Array<{ id: string; sender_id: string; created_at: string }>>();
    for (const msg of recentMessages ?? []) {
      const list = msgsByConv.get(msg.conversation_id) ?? [];
      list.push({ id: msg.id, sender_id: msg.sender_id, created_at: msg.created_at });
      msgsByConv.set(msg.conversation_id, list);
    }

    // Calculate unread per conversation using message-id based cursors
    const enriched = conversations.map((conv: { id: string; is_group?: boolean; type?: string; last_message_at?: string }) => {
      const state = stateMap.get(conv.id);
      let unreadCount = 0;

      const convMsgs = msgsByConv.get(conv.id) ?? [];
      const lastReadMsgId = state?.last_read_message_id;
      const lastReadAt = state?.last_read_at;

      if (lastReadMsgId) {
        // Find the read message's created_at to count newer messages
        const readMsg = convMsgs.find((m) => m.id === lastReadMsgId);
        const readMsgTime = readMsg?.created_at ?? lastReadAt;
        if (readMsgTime) {
          for (const msg of convMsgs) {
            if (msg.sender_id === resolved.authId) continue;
            if (new Date(msg.created_at) > new Date(readMsgTime)) unreadCount++;
          }
        }
      } else if (lastReadAt) {
        // Fallback to timestamp if no message_id (legacy data)
        for (const msg of convMsgs) {
          if (msg.sender_id === resolved.authId) continue;
          if (new Date(msg.created_at) > new Date(lastReadAt)) unreadCount++;
        }
      } else {
        // No read state — all non-mine messages are unread
        for (const msg of convMsgs) {
          if (msg.sender_id !== resolved.authId) unreadCount++;
        }
      }

      return {
        ...conv,
        type: conv.type ?? (conv.is_group ? 'group' : 'dm'),
        is_group: conv.is_group ?? (conv.type === 'group'),
        is_muted: state?.is_muted ?? false,
        is_archived: state?.is_archived ?? false,
        last_message: lastMsgMap.get(conv.id) ?? null,
        unread_count: unreadCount,
        members: membersMap.get(conv.id) ?? [],
      };
    });

    return NextResponse.json({ conversations: enriched });
  } catch (err) {
    console.error('[GET /api/chat/conversations] Failed:', err);
    return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 });
  }
}

// ─── POST — create conversation ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolved = await resolveUserFromToken(token);
    if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const workspaceId = resolveChatWorkspaceId(resolved);
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 400 });

    // Tier gate
    const tierCheck = await checkChatTierEligibility(workspaceId);
    if (!tierCheck.allowed) {
      return NextResponse.json({ error: tierCheck.reason }, { status: 403 });
    }

    const body = await req.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

    const memberIds: string[] = Array.isArray(body.member_ids) ? body.member_ids : [];
    const isGroup = memberIds.length > 1; // >1 other member = group; 1 = DM
    const convType: string = isGroup ? 'group' : 'dm';

    const supabase = createServerSupabaseClient();

    // Validate workspace membership for all provided member IDs
    if (memberIds.length > 0) {
      const { invalid } = await validateWorkspaceMembers(workspaceId, memberIds);
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: `Users not in workspace: ${invalid.join(', ')}` },
          { status: 400 },
        );
      }
    }

    // Member limit check
    const allMemberIds = [resolved.authId, ...memberIds.filter((id: string) => id !== resolved.authId)];
    const limitCheck = await checkMemberLimit(workspaceId, 0);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: `Workspace member limit reached (${limitCheck.limit})` },
        { status: 403 },
      );
    }

    // DM dedup: check if conversation already exists for this pair
    let dmKey: string | null = null;
    if (!isGroup && memberIds.length === 1) {
      dmKey = buildDmKey(resolved.authId, memberIds[0]);
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('dm_key', dmKey)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ conversation: existing, existing: true });
      }
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        workspace_id: workspaceId,
        type: convType,
        title,
        created_by: resolved.authId,
        is_group: isGroup,
        dm_key: dmKey,
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[POST /api/chat/conversations] Insert failed:', error);
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }

    console.log('[POST /api/chat/conversations] Created', convType, 'conversation', data.id, 'in workspace', workspaceId, 'by', resolved.authId, '— members:', allMemberIds.length);

    // Insert conversation members with workspace_id
    const memberRows = allMemberIds.map((userId: string) => ({
      conversation_id: data.id,
      user_id: userId,
      role: userId === resolved.authId ? 'admin' : 'member',
      workspace_id: workspaceId,
    }));

    const { error: memberErr } = await supabase
      .from('conversation_members')
      .insert(memberRows);

    if (memberErr) {
      console.error('[POST /api/chat/conversations] Member insert failed:', memberErr);
    }

    // Seed conversation_member_state for each member
    const stateRows = allMemberIds.map((userId: string) => ({
      conversation_id: data.id,
      user_id: userId,
      workspace_id: workspaceId,
    }));

    await supabase.from('conversation_member_state').insert(stateRows).then(() => {}, (err) => {
      console.error('[POST /api/chat/conversations] State seed failed:', err);
    });

    // Resolve member profiles for response
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .in('id', allMemberIds);

    const profileMap = new Map<string, { full_name: string | null; email: string | null }>();
    for (const p of profiles ?? []) {
      profileMap.set(p.id, { full_name: p.full_name, email: p.email });
    }

    const members = memberRows.map((m: { user_id: string; role: string }) => {
      const profile = profileMap.get(m.user_id);
      return {
        user_id: m.user_id,
        role: m.role,
        joined_at: new Date().toISOString(),
        full_name: profile?.full_name ?? undefined,
        email: profile?.email ?? undefined,
      };
    });

    // Audit log
    await auditLog(supabase, workspaceId, resolved.authId, 'conversation_create', 'conversation', data.id, data.id, {
      type: convType,
      member_count: allMemberIds.length,
    });

    return NextResponse.json({
      conversation: {
        ...data,
        is_group: isGroup,
        type: convType,
        last_message: null,
        unread_count: 0,
        members,
      },
    });
  } catch (err) {
    console.error('[POST /api/chat/conversations] Failed:', err);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}

// ─── PATCH — update conversation ──────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolved = await resolveUserFromToken(token);
    if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const workspaceId = resolveChatWorkspaceId(resolved);
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 400 });

    const body = await req.json();
    const conversationId = body.conversation_id;
    if (!conversationId || !UUID_RE.test(conversationId)) {
      return NextResponse.json({ error: 'Valid conversation_id required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Verify conversation exists and belongs to workspace
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('id, workspace_id, is_group, type')
      .eq('id', conversationId)
      .eq('workspace_id', workspaceId)
      .single();

    if (convErr || !conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Action: rename
    if (typeof body.title === 'string' && body.title.trim()) {
      const { error: renameErr } = await supabase
        .from('conversations')
        .update({ title: body.title.trim() })
        .eq('id', conversationId);

      if (renameErr) {
        return NextResponse.json({ error: 'Failed to rename' }, { status: 500 });
      }

      await auditLog(supabase, workspaceId, resolved.authId, 'group_rename', 'conversation', conversationId, conversationId, {
        new_title: body.title.trim(),
      });
    }

    // Action: add members (with workspace validation + member limit)
    if (Array.isArray(body.add_members) && body.add_members.length > 0) {
      const validUuids = body.add_members.filter((id: string) => UUID_RE.test(id));
      if (validUuids.length > 0) {
        // Validate workspace membership
        const { valid, invalid } = await validateWorkspaceMembers(workspaceId, validUuids);
        if (invalid.length > 0) {
          return NextResponse.json(
            { error: `Users not in workspace: ${invalid.join(', ')}` },
            { status: 400 },
          );
        }

        // Check member limit
        const limitCheck = await checkMemberLimit(workspaceId, 0);
        if (!limitCheck.allowed) {
          return NextResponse.json(
            { error: `Workspace member limit reached (${limitCheck.limit})` },
            { status: 403 },
          );
        }

        if (valid.length > 0) {
          const rows = valid.map((userId: string) => ({
            conversation_id: conversationId,
            user_id: userId,
            role: 'member',
            workspace_id: workspaceId,
          }));
          await supabase
            .from('conversation_members')
            .upsert(rows, { onConflict: 'conversation_id,user_id' });

          // Seed member state for new members
          const stateRows = valid.map((userId: string) => ({
            conversation_id: conversationId,
            user_id: userId,
            workspace_id: workspaceId,
          }));
          await supabase.from('conversation_member_state')
            .upsert(stateRows, { onConflict: 'conversation_id,user_id' })
            .then(() => {}, () => {});

          await auditLog(supabase, workspaceId, resolved.authId, 'member_add', 'conversation', conversationId, conversationId, {
            added_user_ids: valid,
          });
        }
      }
    }

    // Action: remove members (only admins can do this)
    if (Array.isArray(body.remove_members) && body.remove_members.length > 0) {
      const { data: callerMember } = await supabase
        .from('conversation_members')
        .select('role')
        .eq('conversation_id', conversationId)
        .eq('user_id', resolved.authId)
        .single();

      if (callerMember?.role === 'admin') {
        const validIds = body.remove_members.filter((id: string) => UUID_RE.test(id) && id !== resolved.authId);
        if (validIds.length > 0) {
          await supabase
            .from('conversation_members')
            .delete()
            .eq('conversation_id', conversationId)
            .in('user_id', validIds);

          // Clean up member state
          await supabase
            .from('conversation_member_state')
            .delete()
            .eq('conversation_id', conversationId)
            .in('user_id', validIds);

          await auditLog(supabase, workspaceId, resolved.authId, 'member_remove', 'conversation', conversationId, conversationId, {
            removed_user_ids: validIds,
          });
        }
      }
    }

    // Action: leave group
    if (body.leave === true) {
      await supabase
        .from('conversation_members')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', resolved.authId);

      // Clean up member state
      await supabase
        .from('conversation_member_state')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', resolved.authId);
    }

    // Action: mute/unmute (now on conversation_member_state)
    if (typeof body.is_muted === 'boolean') {
      await supabase
        .from('conversation_member_state')
        .upsert(
          {
            conversation_id: conversationId,
            user_id: resolved.authId,
            workspace_id: workspaceId,
            is_muted: body.is_muted,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'conversation_id,user_id' },
        );
    }

    // Action: archive/unarchive (now on conversation_member_state)
    if (typeof body.is_archived === 'boolean') {
      await supabase
        .from('conversation_member_state')
        .upsert(
          {
            conversation_id: conversationId,
            user_id: resolved.authId,
            workspace_id: workspaceId,
            is_archived: body.is_archived,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'conversation_id,user_id' },
        );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[PATCH /api/chat/conversations] Failed:', err);
    return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 });
  }
}

// ─── DELETE — delete conversation + cascade ──────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolved = await resolveUserFromToken(token);
    if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const workspaceId = resolveChatWorkspaceId(resolved);
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 400 });

    const body = await req.json();
    const conversationId = body.conversation_id;
    if (!conversationId || !UUID_RE.test(conversationId)) {
      return NextResponse.json({ error: 'Valid conversation_id required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Verify conversation exists and belongs to workspace
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('id, workspace_id, is_group')
      .eq('id', conversationId)
      .eq('workspace_id', workspaceId)
      .single();

    if (convErr || !conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Check membership + admin role for groups
    const { data: callerMember } = await supabase
      .from('conversation_members')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', resolved.authId)
      .single();

    if (!callerMember) {
      return NextResponse.json({ error: 'Not a member of this conversation' }, { status: 403 });
    }

    if (conv.is_group && callerMember.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can delete group conversations' }, { status: 403 });
    }

    // Cascade delete: first get message IDs, then delete links, messages, members, state, conversation
    const { data: convMessages } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId);
    const msgIds = (convMessages ?? []).map((m: { id: string }) => m.id);
    if (msgIds.length > 0) {
      await supabase.from('message_links').delete().in('message_id', msgIds).then(() => {}, () => {});
    }
    await supabase.from('messages').delete().eq('conversation_id', conversationId);
    await supabase.from('conversation_members').delete().eq('conversation_id', conversationId);
    await supabase.from('conversation_member_state').delete().eq('conversation_id', conversationId);

    const { error: deleteErr } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (deleteErr) {
      console.error('[DELETE /api/chat/conversations] Failed:', deleteErr);
      return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
    }

    await auditLog(supabase, workspaceId, resolved.authId, 'conversation_delete', 'conversation', conversationId, conversationId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/chat/conversations] Failed:', err);
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
  }
}
