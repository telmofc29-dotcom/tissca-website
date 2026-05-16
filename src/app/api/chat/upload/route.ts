// src/app/api/chat/upload/route.ts v3.0
//
// POST /api/chat/upload — upload image or document for chat relay
//
// Accepts FormData with:
//   file: File (required)
//   conversation_id: string (required, UUID)
//   category: 'image' | 'document' (required)
//
// Returns contract-aligned camelCase relay metadata for chat message payload.
//
// Storage: Supabase 'tisschat-relay' bucket (temporary relay — NOT permanent archive)
// Path:    {workspace_id}/{conversation_id}/{uuid}-{sanitised_filename}

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { resolveUserFromToken } from '@/lib/workspace-data';
import { createServerSupabaseClient } from '@/lib/supabase';
import { checkChatTierEligibility, resolveChatWorkspaceId } from '@/lib/chat/chat-tier';

function extractToken(req: NextRequest): string | null {
  return req.headers.get('Authorization')?.replace('Bearer ', '') || null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const BUCKET = 'tisschat-relay';

// ─── Validation ─────────────────────────────────────────────────────────────

const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const DOCUMENT_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]);

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;     // 5 MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;  // 10 MB

function sanitiseFilename(name: string): string {
  return name
    .replace(/^[./\\]+/, '')            // strip leading dots/slashes
    .replace(/[^a-zA-Z0-9._-]/g, '_')  // replace unsafe chars
    .slice(0, 200);                     // cap length
}

// ─── Handler ────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolved = await resolveUserFromToken(token);
    if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const workspaceId = resolveChatWorkspaceId(resolved);
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 400 });

    // Tier gate
    const tierCheck = await checkChatTierEligibility(workspaceId);
    if (!tierCheck.allowed) {
      return NextResponse.json({ error: tierCheck.reason }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const conversationId = formData.get('conversation_id') as string | null;
    const category = formData.get('category') as string | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File required' }, { status: 400 });
    }
    if (!conversationId || !UUID_RE.test(conversationId)) {
      return NextResponse.json({ error: 'Valid conversation_id required' }, { status: 400 });
    }
    if (category !== 'image' && category !== 'document') {
      return NextResponse.json({ error: 'category must be "image" or "document"' }, { status: 400 });
    }

    // Validate MIME type
    const allowedTypes = category === 'image' ? IMAGE_TYPES : DOCUMENT_TYPES;
    if (!allowedTypes.has(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: ${[...allowedTypes].join(', ')}` },
        { status: 400 },
      );
    }

    // Validate size
    const maxSize = category === 'image' ? MAX_IMAGE_SIZE : MAX_DOCUMENT_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Max: ${maxSize / (1024 * 1024)} MB` },
        { status: 400 },
      );
    }

    // Verify conversation belongs to workspace
    const supabase = createServerSupabaseClient();
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('workspace_id', workspaceId)
      .single();

    if (!conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Build storage path: {workspace_id}/{conversation_id}/{uuid}-{filename}
    const safeName = sanitiseFilename(file.name);
    const fileUUID = crypto.randomUUID();
    const storagePath = `${workspaceId}/${conversationId}/${fileUUID}-${safeName}`;

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[POST /api/chat/upload] Upload failed:', uploadError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    // Build the proxy URL for retrieval
    const fileUrl = `/api/storage/${BUCKET}/${storagePath}`;

    // Relay expiry hint — aligns with server-side TTL concept.
    // The storage proxy issues 1-hour signed URLs; the blob itself
    // is relay-only and may be purged by a future cleanup job.
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7-day relay window

    // Return contract-aligned camelCase relay metadata
    const payload = {
      type: category,
      url: fileUrl,
      relayBucket: BUCKET,
      relayPath: storagePath,
      fileName: file.name,
      sizeBytes: file.size,
      mimeType: file.type,
      expiresAt,
      isEncrypted: false,
    };

    return NextResponse.json({ payload }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/chat/upload] Error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
