// src/lib/accountant-hub-shared.ts v1.0
//
// PURPOSE:
// Pure, client-safe functions for Accountant Hub access decisions.
// No server imports — safe to import from 'use client' components.
// The server-only module (accountant-hub.ts) re-exports from here.
//
// PORTABLE: Android and iOS should replicate this exact logic.

import type { PlanTier } from '@/lib/plans';

/**
 * Pure role-permission check. No DB calls, no server imports.
 *
 * LOCKED RULES:
 * - Pro / Pro Plus: owner only
 * - Team Starter: owner only
 * - Team Pro: owner OR accountant
 * - Free: never (should be caught before this)
 */
export function isAccountantHubRoleAllowed(tier: PlanTier, role: string): boolean {
  switch (tier) {
    case 'pro':
    case 'pro_plus':
    case 'team_starter':
      return role === 'owner';
    case 'team_pro':
      return role === 'owner' || role === 'accountant';
    default:
      return false;
  }
}
