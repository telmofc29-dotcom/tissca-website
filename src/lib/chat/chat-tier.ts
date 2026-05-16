// src/lib/chat/chat-tier.ts
//
// TissChat — Server-side tier gating, workspace resolution, and message normalization.
//
// Delegates plan interpretation to @/lib/plans (central entitlement helpers).
// Do NOT scatter raw plan string checks — use normalizePlanTier / hasTissChatAccess.

import { createServerSupabaseClient } from '@/lib/supabase';
import { normalizePlanTier, hasTissChatAccess, maxWorkspaceMembers } from '@/lib/plans';

export type TierCheckResult =
  | { allowed: true; tier: string; memberLimit: number }
  | { allowed: false; reason: string };

/**
 * Check if the workspace is eligible for TissChat.
 * Returns tier info if allowed, or a rejection reason.
 */
export async function checkChatTierEligibility(workspaceId: string): Promise<TierCheckResult> {
  const supabase = createServerSupabaseClient();

  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select('plan_tier')
    .eq('id', workspaceId)
    .single();

  if (error || !workspace) {
    console.error('[checkChatTierEligibility] Workspace not found:', workspaceId, error?.message);
    return { allowed: false, reason: `Workspace not found (${workspaceId})` };
  }

  const rawTier = workspace.plan_tier ?? 'free';
  const tier = normalizePlanTier(rawTier);
  if (tier !== rawTier) {
    console.log('[checkChatTierEligibility] workspace', workspaceId, '→ plan_tier:', rawTier, `(normalized → ${tier})`);
  }

  if (!hasTissChatAccess(tier)) {
    console.log('[checkChatTierEligibility] BLOCKED — tier', tier, 'not eligible for TissChat');
    return { allowed: false, reason: `TissChat requires Team Starter or Team Pro plan (current: ${tier})` };
  }

  return {
    allowed: true,
    tier,
    memberLimit: maxWorkspaceMembers(tier),
  };
}

/**
 * Check if adding members would exceed the workspace member limit.
 * Returns { allowed, currentCount, limit }.
 */
export async function checkMemberLimit(
  workspaceId: string,
  additionalCount: number = 0,
): Promise<{ allowed: boolean; currentCount: number; limit: number }> {
  const tierResult = await checkChatTierEligibility(workspaceId);
  if (!tierResult.allowed) {
    return { allowed: false, currentCount: 0, limit: 0 };
  }

  const supabase = createServerSupabaseClient();

  const { count, error } = await supabase
    .from('workspace_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId);

  if (error) {
    return { allowed: false, currentCount: 0, limit: tierResult.memberLimit };
  }

  const currentCount = count ?? 0;

  return {
    allowed: (currentCount + additionalCount) <= tierResult.memberLimit,
    currentCount,
    limit: tierResult.memberLimit,
  };
}

/**
 * Validate that all provided user IDs are members of the given workspace.
 * Returns { valid: validIds[], invalid: invalidIds[] }.
 */
export async function validateWorkspaceMembers(
  workspaceId: string,
  userIds: string[],
): Promise<{ valid: string[]; invalid: string[] }> {
  if (userIds.length === 0) return { valid: [], invalid: [] };

  const supabase = createServerSupabaseClient();

  const { data: members, error } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .in('user_id', userIds);

  if (error || !members) {
    return { valid: [], invalid: userIds };
  }

  const memberSet = new Set(members.map((m: { user_id: string }) => m.user_id));
  const valid = userIds.filter((id) => memberSet.has(id));
  const invalid = userIds.filter((id) => !memberSet.has(id));

  return { valid, invalid };
}

// ─── Canonical workspace resolution for TissChat ────────────────────────────

type ResolvedUser = { authId: string; workspaceId: string | null; businessId: string | null };

/**
 * Resolve the TissChat workspace ID from a resolved user.
 * Single canonical rule: prefer workspaceId, fall back to businessId.
 * Returns null if neither exists.
 */
export function resolveChatWorkspaceId(resolved: ResolvedUser): string | null {
  return resolved.workspaceId ?? resolved.businessId ?? null;
}

// ─── Canonical message_type normalization ──────────────────────────────────

/** Allowed message_type values (DB constraint). */
const VALID_MESSAGE_TYPES = new Set([
  'text', 'image', 'document', 'card',
  'lead', 'job', 'quote', 'invoice', 'asset', 'client_profile',
]);

/**
 * Normalize a message_type from any platform (Android, iOS, website).
 * Handles case variants (TEXT, Text), null, and undefined.
 * Returns 'text' for any unrecognized or missing value.
 */
export function normalizeMessageType(raw: unknown): string {
  if (raw == null) return 'text';
  const key = String(raw).trim().toLowerCase();
  return VALID_MESSAGE_TYPES.has(key) ? key : 'text';
}
