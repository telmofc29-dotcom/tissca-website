// src/app/api/workspace/document-pdf-info/route.ts
//
// GET  — load document PDF identity for current workspace
// PATCH — upsert document PDF identity
// POST  — upload logo to Supabase storage
//
// Auth: Bearer token → resolveUserFromToken

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { resolveUserFromToken } from '@/lib/workspace-data';
import { normalizePlanTier, isPro, isTeam } from '@/lib/plans';

/**
 * Server-side access check for Document PDF Info.
 * - Free: denied
 * - Pro / Pro+: allowed (single-user, owner by definition)
 * - Team Starter / Team Pro: owner only
 */
async function checkDocPdfAccess(
  resolved: { authId: string; workspaceId: string | null },
): Promise<{ allowed: boolean; reason?: string }> {
  if (!resolved.workspaceId) return { allowed: false, reason: 'No workspace' };

  const supabase = createServerSupabaseClient();

  const { data: ws } = await supabase
    .from('workspaces')
    .select('plan_tier')
    .eq('id', resolved.workspaceId)
    .maybeSingle();

  const tier = normalizePlanTier(ws?.plan_tier);

  if (!isPro(tier)) {
    return { allowed: false, reason: 'Upgrade to Pro or above to access Document PDF Info.' };
  }

  if (isTeam(tier)) {
    // Team plans: owner only
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('user_id', resolved.authId)
      .eq('workspace_id', resolved.workspaceId)
      .maybeSingle();

    if (!membership || membership.role !== 'owner') {
      return { allowed: false, reason: 'Only the workspace owner can access Document PDF Info.' };
    }
  }

  return { allowed: true };
}

export type DocumentPdfInfo = {
  id?: string;
  workspace_id?: string;
  business_structure: string | null; // 'sole_trader' | 'limited_company'
  company_name: string | null;
  trading_name: string | null;
  company_number: string | null;
  contact_name: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  postcode: string | null;
  phone: string | null;
  email: string | null;
  bank_name: string | null;
  account_name: string | null;
  sort_code: string | null;
  account_number: string | null;
  iban: string | null;
  swift_bic: string | null;
  routing_number: string | null;
  vat_enabled: boolean;
  vat_number: string | null;
  vat_rate: number;
  logo_url: string | null;
  tagline: string | null;
  brand_color: string;
  default_currency: string;
};

const ALLOWED_FIELDS = [
  'business_structure',
  'company_name', 'trading_name', 'company_number',
  'contact_name', 'address_line_1', 'address_line_2', 'city', 'postcode', 'phone', 'email',
  'bank_name', 'account_name', 'sort_code', 'account_number', 'iban', 'swift_bic', 'routing_number',
  'vat_enabled', 'vat_number', 'vat_rate',
  'logo_url', 'tagline', 'brand_color',
  'default_currency',
] as const;

// GET — load
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolved = await resolveUserFromToken(token);
    if (!resolved?.workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const access = await checkDocPdfAccess(resolved);
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason ?? 'Access denied' }, { status: 403 });
    }

    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from('document_pdf_info')
      .select('*')
      .eq('workspace_id', resolved.workspaceId)
      .maybeSingle();

    return NextResponse.json({ info: data || null });
  } catch (err) {
    console.error('[GET /api/workspace/document-pdf-info]', err);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}

// PATCH — upsert
export async function PATCH(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolved = await resolveUserFromToken(token);
    if (!resolved?.workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const access = await checkDocPdfAccess(resolved);
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason ?? 'Access denied' }, { status: 403 });
    }

    const body = await req.json();

    // Sanitize: only allow known fields
    const sanitized: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) sanitized[key] = body[key];
    }

    const supabase = createServerSupabaseClient();

    // Upsert
    const { data, error } = await supabase
      .from('document_pdf_info')
      .upsert(
        { workspace_id: resolved.workspaceId, ...sanitized, updated_at: new Date().toISOString() },
        { onConflict: 'workspace_id' }
      )
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ info: data });
  } catch (err) {
    console.error('[PATCH /api/workspace/document-pdf-info]', err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}

// POST — logo upload
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolved = await resolveUserFromToken(token);
    if (!resolved?.workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const access = await checkDocPdfAccess(resolved);
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason ?? 'Access denied' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('logo') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 400 });
    }

    // Validate MIME type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const ext = file.name.split('.').pop() || 'png';
    const filePath = `${resolved.workspaceId}/logo.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload (upsert to overwrite existing)
    const { error: uploadError } = await supabase.storage
      .from('business-logos')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('business-logos')
      .getPublicUrl(filePath);

    const logoUrl = urlData.publicUrl;

    // Update document_pdf_info with logo URL
    await supabase
      .from('document_pdf_info')
      .upsert(
        { workspace_id: resolved.workspaceId, logo_url: logoUrl, updated_at: new Date().toISOString() },
        { onConflict: 'workspace_id' }
      );

    return NextResponse.json({ logo_url: logoUrl });
  } catch (err) {
    console.error('[POST /api/workspace/document-pdf-info] logo upload:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
