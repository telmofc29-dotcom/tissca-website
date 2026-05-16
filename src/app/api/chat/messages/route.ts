// src/app/api/chat/messages/route.ts v3.0 — W-SYNC-1
//
// POST /api/chat/messages — send a message
// DELETE /api/chat/messages — delete own message
//
// W-SYNC-1 CHANGES:
// - Tier gating via checkChatTierEligibility()
// - Updates conversations.last_message_id + last_message_at (not updated_at)
// - Inserts message_links for structured entity messages (lead/job/invoice/quote/asset)
// - Audit logging for message_send and message_delete

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { resolveUserFromToken } from '@/lib/workspace-data';
import { createServerSupabaseClient } from '@/lib/supabase';
import { dispatchPushNotifications } from '@/lib/chat/push-sender';
import { checkChatTierEligibility, resolveChatWorkspaceId, normalizeMessageType } from '@/lib/chat/chat-tier';

function extractToken(req: NextRequest): string | null {
  return req.headers.get('Authorization')?.replace('Bearer ', '') || null;
}

// UUID v4 validation
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    // Validate required fields
    const {
      id: messageId,
      conversation_id: conversationId,
      body: messageBody,
      message_type: rawMessageType,
      payload = null,
    } = body;

    // Canonical message_type normalization (handles TEXT, Text, null → 'text')
    const messageType = normalizeMessageType(rawMessageType);

    if (!messageId || !UUID_RE.test(messageId)) {
      return NextResponse.json({ error: 'Valid message UUID required' }, { status: 400 });
    }
    if (!conversationId || !UUID_RE.test(conversationId)) {
      return NextResponse.json({ error: 'Valid conversation_id required' }, { status: 400 });
    }
    if (typeof messageBody !== 'string' || !messageBody.trim()) {
      return NextResponse.json({ error: 'Message body required' }, { status: 400 });
    }
    if (messageBody.length > 10000) {
      return NextResponse.json({ error: 'Message too long (max 10000 chars)' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Verify conversation exists and belongs to workspace
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('workspace_id', workspaceId)
      .single();

    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    // Insert message (client-generated UUID as PK)
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        id: messageId,
        conversation_id: conversationId,
        workspace_id: workspaceId,
        sender_id: resolved.authId,
        body: messageBody.trim(),
        message_type: messageType,
        payload: payload ? String(payload) : null,
        delivery_status: 'sent',
      })
      .select()
      .single();

    if (error) {
      console.error('[POST /api/chat/messages] Insert error for msg', messageId, 'in conv', conversationId, ':', error.code, error.message);
      // Duplicate UUID = already sent (de-dupe at DB level)
      if (error.code === '23505') {
        return NextResponse.json({ message: { id: messageId, delivery_status: 'sent' }, deduplicated: true });
      }
      console.error('[POST /api/chat/messages] Insert failed:', error);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    // Update conversation last_message_id + last_message_at for sort ordering
    await supabase
      .from('conversations')
      .update({
        last_message_id: messageId,
        last_message_at: message.created_at,
      })
      .eq('id', conversationId);

    // Insert message_links for structured entity types
    const ENTITY_TYPES = new Set(['lead', 'job', 'invoice', 'quote', 'asset']);
    if (ENTITY_TYPES.has(messageType) && payload) {
      try {
        const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
        // Support Android keys (id), new Website keys (id), AND legacy Website keys (lead_id, job_id, etc.)
        const entityId =
          parsed?.entity_id ??
          parsed?.id ??
          parsed?.lead_id ??
          parsed?.job_id ??
          parsed?.invoice_id ??
          parsed?.quote_id ??
          parsed?.asset_id ??
          null;
        const label = parsed?.clientName ?? parsed?.title ?? parsed?.name ?? parsed?.lead_name ?? parsed?.job_title ?? messageBody.trim().slice(0, 100);
        if (entityId) {
          await supabase.from('message_links').insert({
            workspace_id: workspaceId,
            message_id: messageId,
            entity_type: messageType,
            entity_id: String(entityId),
            label: label ?? null,
          });
        }
      } catch {
        // Non-fatal: link extraction failed
      }
    }

    // Audit log
    await supabase.from('message_audit_log').insert({
      workspace_id: workspaceId,
      actor_id: resolved.authId,
      action: 'message_send',
      entity_type: 'message',
      entity_id: messageId,
      conversation_id: conversationId,
      metadata: { message_type: messageType },
    }).then(() => {}, () => {});

    // Fire-and-forget push notifications to eligible recipients
    dispatchPushNotifications(
      conversationId,
      messageId,
      resolved.authId,
      messageBody.trim(),
      messageType,
    ).catch(() => { /* non-blocking */ });

    return NextResponse.json({ message });
  } catch (err) {
    console.error('[POST /api/chat/messages] Failed:', err);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

// ─── DELETE /api/chat/messages — delete own message ─────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolved = await resolveUserFromToken(token);
    if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { message_id: messageId } = body;

    if (!messageId || !UUID_RE.test(messageId)) {
      return NextResponse.json({ error: 'Valid message_id required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Fetch message — verify ownership
    const { data: msg, error: fetchErr } = await supabase
      .from('messages')
      .select('id, sender_id, conversation_id')
      .eq('id', messageId)
      .single();

    if (fetchErr || !msg) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (msg.sender_id !== resolved.authId) {
      return NextResponse.json({ error: 'Cannot delete messages from other users' }, { status: 403 });
    }

    // Delete message_links first
    await supabase.from('message_links').delete().eq('message_id', messageId).then(() => {}, () => {});

    // Delete the message
    const { error: delErr } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (delErr) {
      console.error('[DELETE /api/chat/messages] Delete failed:', delErr);
      return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
    }

    // Audit log
    const delWorkspaceId = resolveChatWorkspaceId(resolved);
    if (delWorkspaceId) {
      await supabase.from('message_audit_log').insert({
        workspace_id: delWorkspaceId,
        actor_id: resolved.authId,
        action: 'message_delete',
        entity_type: 'message',
        entity_id: messageId,
        conversation_id: msg.conversation_id,
      }).then(() => {}, () => {});
    }

    return NextResponse.json({ deleted: true, message_id: messageId });
  } catch (err) {
    console.error('[DELETE /api/chat/messages] Failed:', err);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
