// src/app/(admin)/admin/settings/page.tsx v1.0
//
// PURPOSE:
// - Admin Settings page (platform staff only).
// - Sealed admin-only UI: configuration panels + staff context.
// - Proof-based: reads identity + support mode from GET /api/user/me (Authorization: Bearer).
//
// SECURITY:
// - Page is protected by /(admin) layout gate: requirePlatformStaff() runs before render.
// - This page still fails closed if /api/user/me is not accessible.
//
// NEXT WIRING (planned):
// - Add staff-only PATCH endpoints under /api/admin/settings/*
// - Persist settings in Supabase tables (e.g., admin_settings, platform_flags, etc) with RLS staff-only.
//
// NOTES:
// - No member/public settings are shown here.
// - No assumptions about DB tables yet (we only read what exists today).

import AdminSettingsClient from './settings.client';

export const dynamic = 'force-dynamic';

export default function AdminSettingsPage() {
  return <AdminSettingsClient />;
}