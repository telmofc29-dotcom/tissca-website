# WEBSITE TISSCHAT MEDIA RELAY REPORT

**Date:** 6 April 2026  
**Scope:** Surgical media minimisation + relay alignment — no architecture redesign  
**Constraint:** Live-safe, backward-compatible, structured-share parity work preserved

---

## 1. Files changed

| # | File | Summary |
|---|------|---------|
| 1 | `src/lib/chat/compress-image.ts` | **NEW** — Browser-side image compression utility |
| 2 | `src/lib/chat/chat-payloads.ts` | Updated `ChatImagePayload` and `ChatDocumentPayload` with relay metadata fields |
| 3 | `src/lib/chat/useChat.ts` | Integrated compression into `sendFileMessage`, preserve original filename in relay payload |
| 4 | `src/app/api/chat/upload/route.ts` | Updated response to return relay metadata (`relayBucket`, `relayPath`, `expiresAt`, `isEncrypted`) |
| 5 | `src/app/api/storage/[...path]/route.ts` | Added `Cache-Control: private, max-age=86400, immutable` for chat-files redirects |

---

## 2. Browser compression strategy

**File:** `src/lib/chat/compress-image.ts`

| Parameter | Value |
|-----------|-------|
| Max dimension (longest side) | 1600 px |
| Output format | `image/webp` (fallback `image/jpeg`) |
| Quality | 0.80 |
| Skip threshold | ≤ 200 KB (already small enough — skip) |
| GIF handling | Skipped (preserves animation) |
| Non-image files | Passed through uncompressed |

**Implementation:**

1. `createImageBitmap(file)` — decodes image off-main-thread
2. Scale calculation — caps longest side at 1600px, preserves aspect ratio
3. `OffscreenCanvas` preferred (non-blocking), `<canvas>` fallback
4. Compressed blob compared to original — **only uses compressed if smaller**
5. Output filename: `{baseName}.webp` or `{baseName}.jpg`
6. Any error → sends original uncompressed (never blocks send)

**Integration:** Called in `useChat.sendFileMessage()` before upload for `category === 'image'`. Documents pass through uncompressed.

**UX impact:** Compression runs before the upload request, so the user sees "sending" state during both compression and upload. For typical phone photos (3-8 MB JPEG), compression to ~200-400 KB webp takes <100ms in modern browsers via `OffscreenCanvas`.

---

## 3. New media payload contract

### v2 payload (new messages):

```typescript
// IMAGE
{
  type: 'image',
  file_url: '/api/storage/chat-files/ws-id/conv-id/uuid-file.webp',
  relayBucket: 'chat-files',
  relayPath: 'ws-id/conv-id/uuid-file.webp',
  original_name: 'photo.jpg',       // user's original filename
  size_bytes: 245760,                // compressed size
  mime_type: 'image/webp',           // actual uploaded MIME
  expiresAt: '2026-04-13T...',       // 7-day relay window hint
  isEncrypted: false,                // encryption readiness flag
}

// DOCUMENT
{
  type: 'document',
  file_url: '/api/storage/chat-files/ws-id/conv-id/uuid-report.pdf',
  relayBucket: 'chat-files',
  relayPath: 'ws-id/conv-id/uuid-report.pdf',
  original_name: 'Q1 Report.pdf',
  size_bytes: 1048576,
  mime_type: 'application/pdf',
  expiresAt: '2026-04-13T...',
  isEncrypted: false,
}
```

### v1 payload (old messages — still rendered correctly):

```typescript
{
  type: 'image',
  file_url: '/api/storage/chat-files/ws-id/conv-id/uuid-file.jpg',
  bucket: 'chat-files',
  original_name: 'photo.jpg',
  size_bytes: 4194304,
  mime_type: 'image/jpeg',
}
```

### Key differences:

| Field | v1 | v2 |
|-------|----|----|
| `bucket` | required | optional (backward compat) |
| `relayBucket` | absent | canonical bucket name |
| `relayPath` | absent | storage path for cleanup/relay ops |
| `expiresAt` | absent | ISO timestamp — 7-day relay hint |
| `isEncrypted` | absent | `false` (ready for future encryption) |
| Image format | original (jpeg/png) | compressed webp/jpeg |
| Typical image size | 2-8 MB | 200-500 KB |

---

## 4. Upload / relay flow

### Before (v1):

```
User selects file
  → POST /api/chat/upload (raw file, up to 5 MB image / 10 MB doc)
  → Upload to Supabase 'chat-files' bucket
  → Return { file_url, bucket, original_name, size_bytes, mime_type }
  → POST /api/chat/messages with payload
```

### After (v2):

```
User selects file
  → [IMAGE ONLY] compressChatImage(file) — resize + webp
  → POST /api/chat/upload (compressed file — typically 200-500 KB)
  → Upload to Supabase 'chat-files' bucket (same bucket, same path pattern)
  → Return { file_url, relayBucket, relayPath, original_name, size_bytes, mime_type, expiresAt, isEncrypted }
  → Merge original_name from user's file (not compressed name)
  → POST /api/chat/messages with compact relay payload
```

### Storage proxy (receiving side):

```
GET /api/storage/chat-files/{workspace_id}/{conversation_id}/{uuid}-{file}
  → Auth check (Bearer or cookie)
  → Generate 1-hour signed URL
  → 302 redirect with Cache-Control: private, max-age=86400, immutable
  → Browser caches locally for 24 hours
```

**Tier gate:** Upload route still checks `checkChatTierEligibility()` — only `team_starter` and `team_pro` can upload. Unchanged.

**Bucket:** `chat-files` — same bucket as before. No new buckets created. The bucket is treated as **relay-only** — blobs may be purged by a future cleanup job after `expiresAt`.

**No public URLs:** All access goes through the authenticated storage proxy route. No direct Supabase public URLs exposed.

---

## 5. Backward compatibility

| Scenario | Behaviour |
|----------|-----------|
| **Old v1 image payload** (has `bucket`, no `relayBucket`) | `isImagePayload()` checks `type === 'image' && typeof file_url === 'string'` — passes. `ImageCard` uses `file_url` — works. |
| **Old v1 document payload** (has `bucket`, no `relayBucket`) | Same — `isDocumentPayload()` passes. `DocumentCard` uses `file_url` — works. |
| **New v2 image payload** (has `relayBucket`, `relayPath`, `expiresAt`) | Type guard passes (still has `file_url`). Renders identically. Extra fields ignored by renderer. |
| **Android/iOS image payload** | If it has `type: 'image'` and `file_url` — renders. If it uses different keys — falls back to message body text. |
| **`bucket` field removal** | Made optional (`bucket?: string`) in both interfaces. Old payloads that include `bucket` are fine. New payloads omit it — no breakage. |

**Type guards unchanged** — both `isImagePayload` and `isDocumentPayload` check only `type` + `file_url`. The new relay fields (`relayBucket`, `relayPath`, `expiresAt`, `isEncrypted`) are optional and do not affect parsing.

---

## 6. Data minimisation impact

### Image upload size reduction:

| Scenario | Before | After | Reduction |
|----------|--------|-------|-----------|
| Phone photo (4032×3024 JPEG, 4 MB) | 4 MB uploaded | ~300 KB webp (1600×1200) | ~93% |
| Screenshot (1920×1080 PNG, 2 MB) | 2 MB uploaded | ~150 KB webp (1600×900) | ~92% |
| Already-small image (800×600 JPEG, 180 KB) | 180 KB uploaded | 180 KB (skipped — under threshold) | 0% |
| GIF (animated, 1.5 MB) | 1.5 MB uploaded | 1.5 MB (skipped — preserves animation) | 0% |

### Payload size reduction:

| Field | v1 payload bytes | v2 payload bytes | Change |
|-------|-----------------|-----------------|--------|
| `bucket` (14 chars) | ~20 | 0 (omitted) | -20 |
| `relayBucket` | 0 | ~22 | +22 |
| `relayPath` | 0 | ~80 | +80 |
| `expiresAt` | 0 | ~35 | +35 |
| `isEncrypted` | 0 | ~18 | +18 |
| **Net metadata change** | — | — | +135 bytes |

The metadata is ~135 bytes larger per message, but the actual uploaded blob is 90-95% smaller for typical photos. The relay metadata enables future cleanup and encryption without schema changes.

### Server bandwidth:

- Browser `Cache-Control: private, max-age=86400, immutable` on chat-files proxy — reduces repeated fetches for same media in a session.
- Signed URL lasts 1 hour; browser cache lasts 24 hours — browser serves from local cache for subsequent views.

---

## 7. Encryption-ready status

### What was done:

- `isEncrypted: boolean` field added to both `ChatImagePayload` and `ChatDocumentPayload` interfaces.
- Upload route sets `isEncrypted: false` on all new payloads.
- The field is optional — old payloads without it are treated as unencrypted.

### What remains for actual encryption:

| Step | Status | Detail |
|------|--------|--------|
| Payload contract | ✅ Done | `isEncrypted` field in payload types |
| Upload route flag | ✅ Done | Returns `isEncrypted: false` |
| Browser-side encrypt-before-upload | ❌ Not done | Requires: generate per-message AES-256-GCM key → encrypt blob → upload encrypted blob → include wrapped key in payload |
| Key exchange / storage | ❌ Not done | Requires: per-conversation key derivation or per-message key wrapping. Depends on Android/iOS key agreement protocol. |
| Receiver-side decrypt | ❌ Not done | Requires: `ImageCard`/`DocumentCard` to detect `isEncrypted: true` → fetch signed URL → decrypt in browser → display via blob URL |
| Key revocation on member removal | ❌ Not done | Group key rotation when members leave |

**Why not implemented in this pass:** Browser-side AES-GCM encryption is technically feasible via `SubtleCrypto`, but the key exchange protocol (how the receiver gets the decryption key) depends on the Android/iOS contract which is not yet defined. Implementing encryption without a shared key agreement protocol would create a Website-only mechanism that other platforms cannot participate in.

**Recommendation:** Once Android/iOS define a key exchange contract (e.g., per-conversation symmetric key wrapped with each member's public key), Website can implement encrypt/decrypt in a follow-up pass. The payload contract is ready.

---

## 8. What was intentionally not changed

| Item | Reason |
|------|--------|
| **Supabase bucket name** (`chat-files`) | Same bucket — no migration needed. Relay semantics are a logical treatment, not a physical change. |
| **Storage proxy route** (`/api/storage/[...path]`) | Auth flow, signed URL generation, and bucket allowlist unchanged. Only added `Cache-Control` header for chat-files. |
| **Upload route auth + tier gate** | `resolveUserFromToken` + `checkChatTierEligibility` unchanged. |
| **Upload max sizes** (5 MB image / 10 MB doc) | Still enforced server-side. Browser compression means most images arrive well under 1 MB, but the server-side limit is a safety net. |
| **MIME type validation** | `IMAGE_TYPES` and `DOCUMENT_TYPES` sets unchanged. `image/webp` was already included. |
| **`file_url` proxy path pattern** | `/api/storage/chat-files/{ws}/{conv}/{uuid}-{file}` — unchanged. |
| **Signed URL expiry** (1 hour) | Unchanged — relay access remains short-lived. |
| **LEAD / JOB / CLIENT_PROFILE structure** | Completely untouched. |
| **With/without values dialog** | Untouched. |
| **message_links insertion** | Untouched. |
| **Received import flow** | Untouched. |
| **Push notification logic** | Untouched. |
| **last_read_message_id flow** | Untouched. |
| **Live-safe SQL / server alignment** | Untouched — no database changes. |
| **message_type values** | `'image'` and `'document'` unchanged. |
| **Realtime subscription** | Untouched. |
| **Document files** | Not compressed — PDFs, Word docs, spreadsheets pass through at original size. |
| **GIF images** | Not compressed — animation preserved. |
| **ImageCard / DocumentCard renderers** | Rendering logic unchanged — both use `file_url`, `original_name`, `size_bytes`, `mime_type` which remain present in old and new payloads. |
