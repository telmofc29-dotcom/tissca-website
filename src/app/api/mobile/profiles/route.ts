/**
 * Mobile API: Business Profile Management
 * =====================================
 * SECURITY NOTE (2026-05-01):
 * This legacy endpoint previously used an in-memory store with userId from
 * a URL query parameter — NO authentication. That is a critical vulnerability.
 *
 * This endpoint is now DISABLED. Mobile apps should use:
 *   GET  /api/workspace/document-pdf-info  — read company PDF settings
 *   PATCH /api/workspace/document-pdf-info — update company PDF settings
 *
 * Both require a valid Bearer token (Supabase JWT) in the Authorization header.
 *
 * Returning 410 Gone so that any stale mobile clients fail loudly rather than
 * silently reading/writing to a global in-memory store.
 */

import { NextResponse } from 'next/server';

const GONE_RESPONSE = NextResponse.json(
  {
    error: 'This endpoint is deprecated. Use /api/workspace/document-pdf-info with a Bearer token.',
    migrateTo: '/api/workspace/document-pdf-info',
  },
  { status: 410 },
);

export async function GET()  { return GONE_RESPONSE; }
export async function POST() { return GONE_RESPONSE; }
export async function PUT()  { return GONE_RESPONSE; }
