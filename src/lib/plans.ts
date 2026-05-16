// src/lib/plans.ts
//
// Central plan tier definitions and entitlement helpers.
// All platform-specific code should delegate to these helpers rather than
// scattering raw plan string checks. iOS and Android should use equivalent
// portable helpers (see docs/ios-entitlement-helper.swift, docs/android-entitlement-helper.kt).

export type PlanTier = 'free' | 'pro' | 'pro_plus' | 'team_starter' | 'team_pro' | 'team';

/** Canonical (non-legacy) plan tier values. */
const CANONICAL_TIERS = new Set<string>(['free', 'pro', 'pro_plus', 'team_starter', 'team_pro']);

/** Map legacy DB values to canonical tiers. */
const LEGACY_TIER_MAP: Record<string, PlanTier> = {
  team: 'team_starter',
};

/**
 * Normalize a raw plan_tier value to a canonical PlanTier.
 * Handles legacy values, whitespace, casing, hyphens.
 * Unknown values log a warning and default to 'free'.
 */
export function normalizePlanTier(raw: unknown): PlanTier {
  const key = String(raw ?? 'free').trim().toLowerCase().replace(/[\s-]/g, '_');
  if (LEGACY_TIER_MAP[key]) return LEGACY_TIER_MAP[key];
  if (CANONICAL_TIERS.has(key)) return key as PlanTier;
  if (key !== 'free') console.warn('[normalizePlanTier] Unknown plan tier:', JSON.stringify(raw), '→ defaulting to free');
  return 'free';
}

/** True for any paid plan (pro, pro_plus, team_starter, team_pro). */
export function isPro(plan?: PlanTier | string | null) {
  if (!plan) return false;
  const n = normalizePlanTier(plan);
  return n === 'pro' || n === 'pro_plus' || n === 'team_starter' || n === 'team_pro';
}

/** True for team-tier plans (team_starter, team_pro). */
export function isTeam(plan?: PlanTier | string | null) {
  if (!plan) return false;
  const n = normalizePlanTier(plan);
  return n === 'team_starter' || n === 'team_pro';
}

/** True if the plan tier includes TissChat access (team_starter, team_pro). */
export function hasTissChatAccess(plan?: PlanTier | string | null): boolean {
  return isTeam(plan);
}

/** Maximum workspace members for the given plan tier. */
export function maxWorkspaceMembers(plan?: PlanTier | string | null): number {
  const n = normalizePlanTier(plan);
  switch (n) {
    case 'team_pro': return 200;
    case 'team_starter': return 5;
    default: return 1;
  }
}

/** Human-readable label for a plan tier. */
export function formatPlanLabel(plan?: PlanTier | string | null) {
  if (!plan) return 'Free';
  const n = normalizePlanTier(plan);
  switch (n) {
    case 'pro': return 'Pro';
    case 'pro_plus': return 'Pro Plus';
    case 'team_starter': return 'Team Starter';
    case 'team_pro': return 'Team Pro';
    default: return 'Free';
  }
}
