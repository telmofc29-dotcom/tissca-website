/**
 * Mobile API: Invoice Generation (DEPRECATED)
 * ============================================
 * SECURITY NOTE (2026-05-01):
 * This endpoint used a server-side in-memory store with no authentication — disabled.
 * Any invoice created here was visible to ALL users on the same server instance.
 *
 * Mobile apps must use: /api/workspace/documents (POST) with a Bearer token.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const GONE = NextResponse.json(
  {
    error: 'This endpoint is deprecated and has been disabled for security reasons.',
    migrateTo: '/api/workspace/documents',
  },
  { status: 410 },
);

export async function POST() { return GONE; }
export async function GET()  { return GONE; }
export async function PUT()  { return GONE; }
