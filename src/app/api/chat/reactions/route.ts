// src/app/api/chat/reactions/route.ts
//
// POST   /api/chat/reactions — toggle reaction (add if missing, remove if exists)
// GET    /api/chat/reactions?message_id=<id> — list reactions for a message

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { resolveUserFromToken } from '@/lib/workspace-data';
import { createServerSupabaseClient } from '@/lib/supabase';
import { checkChatTierEligibility, resolveChatWorkspaceId } from '@/lib/chat/chat-tier';

function extractToken(req: NextRequest): string | null {
  return req.headers.get('Authorization')?.replace('Bearer ', '') || null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_EMOJIS = new Set(['👍', '❤️', '😂', '😮', '😢', '🙏']);

// ─── GET — list reactions for a message ──────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolved = await resolveUserFromToken(token);
    if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Tier gate
    const wsId = resolveChatWorkspaceId(resolved);
    if (wsId) {
      const tierCheck = await checkChatTierEligibility(wsId);
      if (!tierCheck.allowed) {
        return NextResponse.json({ error: tierCheck.reason, reactions: [] }, { status: 403 });
      }
    }

    const messageId = req.nextUrl.searchParams.get('message_id');
    if (!messageId || !UUID_RE.test(messageId)) {
      return NextResponse.json({ error: 'Valid message_id required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const { data: reactions, error } = await supabase
      .from('message_reactions')
      .select('message_id, user_id, emoji, created_at')
      .eq('message_id', messageId);

    if (error) {
      console.error('[GET /api/chat/reactions] Query failed:', error);
      return NextResponse.json({ reactions: [] });
    }

    return NextResponse.json({ reactions: reactions ?? [] });
  } catch (err) {
    console.error('[GET /api/chat/reactions] Failed:', err);
    return NextResponse.json({ error: 'Failed to load reactions' }, { status: 500 });
  }
}

// ─── POST — toggle reaction ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolved = await resolveUserFromToken(token);
    if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Tier gate
    const wsId = resolveChatWorkspaceId(resolved);
    if (wsId) {
      const tierCheck = await checkChatTierEligibility(wsId);
      if (!tierCheck.allowed) {
        return NextResponse.json({ error: tierCheck.reason }, { status: 403 });
      }
    }

    const body = await req.json();
    const { message_id, emoji } = body;

    if (!message_id || !UUID_RE.test(message_id)) {
      return NextResponse.json({ error: 'Valid message_id required' }, { status: 400 });
    }
    if (!emoji || !ALLOWED_EMOJIS.has(emoji)) {
      return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Check if reaction already exists
    const { data: existing } = await supabase
      .from('message_reactions')
      .select('message_id')
      .eq('message_id', message_id)
      .eq('user_id', resolved.authId)
      .eq('emoji', emoji)
      .maybeSingle();

    if (existing) {
      // Remove existing reaction
      const { error: deleteErr } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', message_id)
        .eq('user_id', resolved.authId)
        .eq('emoji', emoji);

      if (deleteErr) {
        console.error('[POST /api/chat/reactions] Delete failed:', deleteErr);
        return NextResponse.json({ error: 'Failed to remove reaction' }, { status: 500 });
      }

      return NextResponse.json({ action: 'removed', message_id, emoji });
    } else {
      // Add new reaction
      const { error: insertErr } = await supabase
        .from('message_reactions')
        .insert({
          message_id,
          user_id: resolved.authId,
          emoji,
        });

      if (insertErr) {
        console.error('[POST /api/chat/reactions] Insert failed:', insertErr);
        return NextResponse.json({ error: 'Failed to add reaction' }, { status: 500 });
      }

      return NextResponse.json({ action: 'added', message_id, emoji });
    }
  } catch (err) {
    console.error('[POST /api/chat/reactions] Failed:', err);
    return NextResponse.json({ error: 'Failed to toggle reaction' }, { status: 500 });
  }
}
