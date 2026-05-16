// src/app/api/stripe/create-portal-session/route.ts
//
// DEPRECATED (v3.0, 2026-03-27):
// This route is no longer used. Portal is now handled by the Supabase Edge
// Function `stripe-create-portal` called via supabase.functions.invoke().
// Kept as a stub to avoid 404s from any stale client caches.

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Portal is handled by Supabase Edge Functions.' },
    { status: 410 },
  );
}