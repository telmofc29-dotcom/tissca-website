// src/app/api/chat/conversations/[id]/messages/route.ts v2.0
//
// GET /api/chat/conversations/[id]/messages — fetch message thread
//
// v2.0: Cursor-based pagination.
//   ?limit=N  (default 50, max 200)
//   ?before=<created_at ISO>  — fetch messages OLDER than this cursor (for "load more")
//   Response: { messages, has_more, oldest_cursor }

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { resolveUserFromToken } from '@/lib/workspace-data';
import { createServerSupabaseClient } from '@/lib/supabase';
import { checkChatTierEligibility, resolveChatWorkspaceId } from '@/lib/chat/chat-tier';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

function extractToken(req: NextRequest): string | null {
  return req.headers.get('Authorization')?.replace('Bearer ', '') || null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolved = await resolveUserFromToken(token);
    if (!resolved) return NextResponse.json({ messages: [], has_more: false });

    const workspaceId = resolveChatWorkspaceId(resolved);
    if (!workspaceId) return NextResponse.json({ messages: [], has_more: false });

    // Tier gate
    const tierCheck = await checkChatTierEligibility(workspaceId);
    if (!tierCheck.allowed) {
      return NextResponse.json({ error: tierCheck.reason, messages: [], has_more: false }, { status: 403 });
    }

    const { id: conversationId } = await params;
    if (!conversationId) return NextResponse.json({ error: 'Missing conversation ID' }, { status: 400 });

    const supabase = createServerSupabaseClient();

    // Verify conversation belongs to workspace
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('workspace_id', workspaceId)
      .single();

    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    // ── Pagination params ──
    const url = new URL(req.url);
    const beforeCursor = url.searchParams.get('before'); // ISO timestamp cursor
    const rawLimit = Number(url.searchParams.get('limit')) || DEFAULT_PAGE_SIZE;
    const limit = Math.min(Math.max(rawLimit, 1), MAX_PAGE_SIZE);

    // Fetch limit + 1 to determine has_more
    let query = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('workspace_id', workspaceId);

    if (beforeCursor) {
      // Load older messages: created_at < cursor, descending, then reverse client-side
      query = query.lt('created_at', beforeCursor);
    }

    // Always fetch newest-last within page for display, but when paginating backward
    // we need the N most recent messages before the cursor.
    // Strategy: fetch desc (newest first), take limit+1, reverse.
    const { data: rows, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (error) {
      console.error('[GET messages] Query failed:', error);
      return NextResponse.json({ messages: [], has_more: false });
    }

    const fetched = rows ?? [];
    const hasMore = fetched.length > limit;
    const page = hasMore ? fetched.slice(0, limit) : fetched;

    // Reverse to chronological order (oldest first) for the client
    page.reverse();

    const oldestCursor = page.length > 0 ? page[0].created_at : null;

    // ── Batch pre-sign media URLs ──
    // Scan messages for image/document payloads, extract relay paths,
    // batch-sign and return as a lookup map: { "bucket/path": signedUrl }
    const signedUrls: Record<string, string> = {};
    const toSign: { bucket: string; path: string; key: string }[] = [];

    for (const msg of page) {
      if (msg.message_type !== 'image' && msg.message_type !== 'document') continue;
      try {
        const p = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;
        if (!p) continue;
        const bucket = p.relayBucket ?? p.storageBucket ?? p.bucket;
        const path = p.relayPath ?? p.storagePath;
        if (bucket && path) {
          const key = `${bucket}/${path}`;
          if (!toSign.some((s) => s.key === key)) {
            toSign.push({ bucket, path, key });
          }
        }
      } catch {
        // skip unparseable payloads
      }
    }

    // Batch sign (parallel, max ~50 per page so this is fine)
    if (toSign.length > 0) {
      const results = await Promise.allSettled(
        toSign.map(async ({ bucket, path, key }) => {
          const { data, error: signErr } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, 3600);
          if (!signErr && data?.signedUrl) {
            return { key, url: data.signedUrl };
          }
          return null;
        }),
      );
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) {
          signedUrls[r.value.key] = r.value.url;
        }
      }
    }

    return NextResponse.json({
      messages: page,
      has_more: hasMore,
      oldest_cursor: oldestCursor,
      signed_urls: signedUrls,
    });
  } catch (err) {
    console.error('[GET messages] Failed:', err);
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}
