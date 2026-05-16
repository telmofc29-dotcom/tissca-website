// src/app/api/chat/mark-read/route.ts v2.0 — W-SYNC-1
//
// POST /api/chat/mark-read — mark a conversation as read for current user
//
// W-SYNC-1 CHANGES:
// - Upserts conversation_member_state.last_read_message_id + last_read_at
//   (replaces conversation_reads.last_read_at)
// - Accepts optional message_id param (cursor-based reads)
// - Propagates delivery_status = 'read' for messages before cursor

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { resolveUserFromToken } from '@/lib/workspace-data';
import { createServerSupabaseClient } from '@/lib/supabase';
import { resolveChatWorkspaceId } from '@/lib/chat/chat-tier';

function extractToken(req: NextRequest): string | null {
  return req.headers.get('Authorization')?.replace('Bearer ', '') || null;
}

export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolved = await resolveUserFromToken(token);
    if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const conversationId = body.conversation_id;
    if (!conversationId) {
      return NextResponse.json({ error: 'conversation_id required' }, { status: 400 });
    }

    const workspaceId = resolveChatWorkspaceId(resolved);

    const supabase = createServerSupabaseClient();

    const readAt = new Date().toISOString();
    const messageId = body.message_id ?? null;

    // Upsert conversation_member_state with read cursor
    const upsertData: Record<string, unknown> = {
      conversation_id: conversationId,
      user_id: resolved.authId,
      last_read_at: readAt,
      updated_at: readAt,
    };
    if (workspaceId) upsertData.workspace_id = workspaceId;
    if (messageId) upsertData.last_read_message_id = messageId;

    const { error } = await supabase
      .from('conversation_member_state')
      .upsert(upsertData, { onConflict: 'conversation_id,user_id' });

    if (error) {
      console.error('[POST /api/chat/mark-read] Upsert failed:', error);
      return NextResponse.json({ error: 'Failed to mark read' }, { status: 500 });
    }

    // Propagate read receipt: batch-update delivery_status for messages
    // sent by others that haven't been marked 'read' yet
    const { error: statusErr } = await supabase
      .from('messages')
      .update({ delivery_status: 'read' })
      .eq('conversation_id', conversationId)
      .neq('sender_id', resolved.authId)
      .neq('delivery_status', 'read')
      .lte('created_at', readAt);

    if (statusErr) {
      console.error('[POST /api/chat/mark-read] Status propagation failed:', statusErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/chat/mark-read] Failed:', err);
    return NextResponse.json({ error: 'Failed to mark read' }, { status: 500 });
  }
}
