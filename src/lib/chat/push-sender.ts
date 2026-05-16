// src/lib/chat/push-sender.ts
//
// PURPOSE:
// Server-side push notification dispatch for TissChat messages.
// Collects eligible recipient devices, respects mute/archive/tier gating,
// and formats payloads for APNs (iOS), FCM (Android), and Web Push.
//
// ARCHITECTURE:
// - Called from POST /api/chat/messages after successful message insert
// - Fire-and-forget: errors are logged but never block the send flow
// - Platform-specific branches are explicit and minimal
//
// DEPENDS ON:
// - user_devices table (phase_h5)
// - conversation_member_state table (is_muted, is_archived) — W-SYNC-1
// - profiles table (sender name resolution)

import { createServerSupabaseClient } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export type PushPayload = {
  title: string;
  body: string;
  /** Notification channel — receivers use this to route to the correct surface.
   *  'chat' → chat icon badge / TissChat surface.
   *  'business' → bell icon badge / business notification surface. */
  channel: 'chat' | 'business';
  data: {
    conversation_id: string;
    message_id: string;
    sender_id: string;
    message_type: string;
  };
};

type EligibleDevice = {
  id: string;
  user_id: string;
  platform: string;
  device_token: string;
};

// ─── Preview text ────────────────────────────────────────────────────────────

function safePreviewText(body: string, messageType: string): string {
  if (messageType === 'image') return '📷 Image';
  if (messageType === 'document') return '� Document';
  if (messageType === 'lead') return '👤 Lead shared';
  if (messageType === 'job') return '🔧 Job shared';
  if (messageType === 'quote') return '📋 Quote shared';
  if (messageType === 'invoice') return '🧾 Invoice shared';
  if (messageType === 'asset') return '📦 Asset shared';
  if (messageType === 'client_profile') return '👤 Contact shared';
  if (messageType === 'card') return '🃏 Card shared';
  // Text: truncate to 100 chars
  const trimmed = body.trim();
  return trimmed.length > 100 ? trimmed.slice(0, 97) + '...' : trimmed;
}

// ─── Sender name resolution ─────────────────────────────────────────────────

async function resolveSenderName(senderId: string): Promise<string> {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from('user_profiles')
      .select('full_name, email')
      .eq('id', senderId)
      .single();

    if (data?.full_name) return data.full_name;
    if (data?.email) return data.email.split('@')[0];
    return 'Someone';
  } catch {
    return 'Someone';
  }
}

// ─── Collect eligible devices ───────────────────────────────────────────────

async function collectEligibleDevices(
  conversationId: string,
  senderId: string,
): Promise<EligibleDevice[]> {
  const supabase = createServerSupabaseClient();

  // 1. Get all conversation members except sender
  const { data: members, error: membersErr } = await supabase
    .from('conversation_members')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .neq('user_id', senderId);

  if (membersErr || !members || members.length === 0) return [];

  const memberUserIds = members.map((m: { user_id: string }) => m.user_id);

  // 2. Check mute/archive from conversation_member_state (W-SYNC-1)
  const { data: memberStates } = await supabase
    .from('conversation_member_state')
    .select('user_id, is_muted, is_archived')
    .eq('conversation_id', conversationId)
    .in('user_id', memberUserIds);

  // Build a set of muted/archived users
  const mutedOrArchived = new Set<string>();
  for (const s of memberStates ?? []) {
    if (s.is_muted || s.is_archived) mutedOrArchived.add(s.user_id);
  }

  // Filter out muted/archived members
  const eligibleUserIds = memberUserIds.filter((uid: string) => !mutedOrArchived.has(uid));

  if (eligibleUserIds.length === 0) return [];

  // 3. Get active devices for eligible users
  const { data: devices, error: devicesErr } = await supabase
    .from('user_devices')
    .select('id, user_id, platform, device_token')
    .in('user_id', eligibleUserIds)
    .eq('is_active', true);

  if (devicesErr || !devices) return [];

  return devices as EligibleDevice[];
}

// ─── Platform dispatch stubs ────────────────────────────────────────────────
// These are intentionally thin — actual APNs/FCM/Web Push credentials
// and HTTP calls will be added when platform keys are configured.

async function sendToAPNs(deviceToken: string, payload: PushPayload): Promise<boolean> {
  // TODO: Implement APNs HTTP/2 push using APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID
  // For now, log intent and return false (no-op)
  console.log('[push-sender] APNs stub — would send to:', deviceToken.slice(0, 8) + '...', payload.data.conversation_id);
  return false;
}

async function sendToFCM(deviceToken: string, payload: PushPayload): Promise<boolean> {
  // TODO: Implement FCM v1 push using GOOGLE_APPLICATION_CREDENTIALS
  // For now, log intent and return false (no-op)
  console.log('[push-sender] FCM stub — would send to:', deviceToken.slice(0, 8) + '...', payload.data.conversation_id);
  return false;
}

async function sendToWebPush(deviceToken: string, payload: PushPayload): Promise<boolean> {
  // TODO: Implement Web Push using VAPID keys
  // For now, log intent and return false (no-op)
  console.log('[push-sender] WebPush stub — would send to:', deviceToken.slice(0, 8) + '...', payload.data.conversation_id);
  return false;
}

// ─── Main dispatch ──────────────────────────────────────────────────────────

/**
 * Dispatch push notifications to all eligible recipients of a message.
 *
 * Fire-and-forget: errors are logged but never propagated to the caller.
 * Called from POST /api/chat/messages after successful insert.
 *
 * Flow:
 * 1. Resolve sender display name
 * 2. Collect eligible devices (excluding sender, muted, archived)
 * 3. Format payload with conversation_id, preview text
 * 4. Dispatch to each device by platform (APNs/FCM/WebPush)
 * 5. Deactivate devices that return permanent failures
 */
export async function dispatchPushNotifications(
  conversationId: string,
  messageId: string,
  senderId: string,
  body: string,
  messageType: string,
): Promise<void> {
  try {
    const [senderName, devices] = await Promise.all([
      resolveSenderName(senderId),
      collectEligibleDevices(conversationId, senderId),
    ]);

    if (devices.length === 0) return;

    const preview = safePreviewText(body, messageType);

    const payload: PushPayload = {
      title: senderName,
      body: preview,
      channel: 'chat', // All TissChat push notifications → chat surface only
      data: {
        conversation_id: conversationId,
        message_id: messageId,
        sender_id: senderId,
        message_type: messageType,
      },
    };

    const failedDeviceIds: string[] = [];

    // Dispatch in parallel by platform
    const results = await Promise.allSettled(
      devices.map(async (device) => {
        let success = false;

        switch (device.platform) {
          case 'ios':
            success = await sendToAPNs(device.device_token, payload);
            break;
          case 'android':
            success = await sendToFCM(device.device_token, payload);
            break;
          case 'web':
            success = await sendToWebPush(device.device_token, payload);
            break;
          default:
            console.warn('[push-sender] Unknown platform:', device.platform);
        }

        // Track permanent failures for deactivation
        if (!success) {
          failedDeviceIds.push(device.id);
        }

        return { deviceId: device.id, platform: device.platform, success };
      }),
    );

    // Log summary
    const sent = results.filter((r) => r.status === 'fulfilled').length;
    console.log(`[push-sender] Dispatched ${sent}/${devices.length} notifications for message ${messageId}`);

    // Note: Do NOT deactivate devices while senders are stubs.
    // When real APNs/FCM sends are implemented, uncomment:
    // if (failedDeviceIds.length > 0) {
    //   const supabase = createServerSupabaseClient();
    //   await supabase
    //     .from('user_devices')
    //     .update({ is_active: false })
    //     .in('id', failedDeviceIds);
    // }
  } catch (err) {
    // Fire-and-forget — never block the message send flow
    console.error('[push-sender] Dispatch failed (non-blocking):', err);
  }
}
