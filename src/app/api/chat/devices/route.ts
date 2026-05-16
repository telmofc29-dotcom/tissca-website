// src/app/api/chat/devices/route.ts
//
// POST   /api/chat/devices — register or refresh a device token
// DELETE /api/chat/devices — unregister a device token
//
// Used by iOS, Android, and Web clients to manage push notification tokens.
// Tokens are scoped to the authenticated user. Duplicate tokens are upserted.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { resolveUserFromToken } from '@/lib/workspace-data';
import { createServerSupabaseClient } from '@/lib/supabase';
import { checkChatTierEligibility, resolveChatWorkspaceId } from '@/lib/chat/chat-tier';

function extractToken(req: NextRequest): string | null {
  return req.headers.get('Authorization')?.replace('Bearer ', '') || null;
}

const VALID_PLATFORMS = new Set(['ios', 'android', 'web']);

// ─── POST — register device ─────────────────────────────────────────────

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
    const { platform, device_token, device_name } = body;

    // Validate platform
    if (!platform || !VALID_PLATFORMS.has(platform)) {
      return NextResponse.json({ error: 'Invalid platform. Must be ios, android, or web.' }, { status: 400 });
    }

    // Validate device_token
    if (!device_token || typeof device_token !== 'string' || device_token.trim().length === 0) {
      return NextResponse.json({ error: 'device_token is required' }, { status: 400 });
    }

    // Limit token length to prevent abuse
    if (device_token.length > 4096) {
      return NextResponse.json({ error: 'device_token too long' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Upsert: if same user+token exists, refresh last_used_at and re-activate
    const { data, error } = await supabase
      .from('user_devices')
      .upsert(
        {
          user_id: resolved.authId,
          platform,
          device_token: device_token.trim(),
          device_name: typeof device_name === 'string' ? device_name.trim().slice(0, 100) : null,
          is_active: true,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,device_token' },
      )
      .select('id, platform, device_name, is_active, last_used_at')
      .single();

    if (error) {
      console.error('[POST /api/chat/devices] Upsert failed:', error);
      return NextResponse.json({ error: 'Failed to register device' }, { status: 500 });
    }

    return NextResponse.json({ device: data });
  } catch (err) {
    console.error('[POST /api/chat/devices] Failed:', err);
    return NextResponse.json({ error: 'Failed to register device' }, { status: 500 });
  }
}

// ─── DELETE — unregister device ─────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolved = await resolveUserFromToken(token);
    if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { device_token } = body;

    if (!device_token || typeof device_token !== 'string') {
      return NextResponse.json({ error: 'device_token is required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Soft-deactivate rather than hard delete — preserves audit trail
    const { error } = await supabase
      .from('user_devices')
      .update({ is_active: false })
      .eq('user_id', resolved.authId)
      .eq('device_token', device_token.trim());

    if (error) {
      console.error('[DELETE /api/chat/devices] Update failed:', error);
      return NextResponse.json({ error: 'Failed to unregister device' }, { status: 500 });
    }

    return NextResponse.json({ unregistered: true });
  } catch (err) {
    console.error('[DELETE /api/chat/devices] Failed:', err);
    return NextResponse.json({ error: 'Failed to unregister device' }, { status: 500 });
  }
}
