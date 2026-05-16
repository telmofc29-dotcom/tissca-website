# Website TissChat — Structured Share Parity Fix Report

> **Source of truth**: Android app's actual contract  
> **Audit**: `WEBSITE_TISSCHAT_STRUCTURED_SHARE_PARITY_AUDIT.md`  
> **Constraints**: No schema changes · No architecture redesign · No message_type changes · Backward compat preserved

---

## 1. PAYLOAD FIELD CONTRACT FIX

**File**: `src/lib/chat/chat-payloads.ts`

| Change | Detail |
|--------|--------|
| `ChatLeadPayload` | Dual-key interface: Android keys (`id`, `clientName`, `status`, `value`, `includeValues`, `sourceToolKey`, `phone`, `email`, `addressLine1`, `city`, `postcode`, `notes`, `shareable`) + legacy Website keys (`lead_id`, `lead_name`, `lead_status`, `value_estimate`, `source`). All optional except `type` and `preview`. |
| `ChatJobPayload` | Same dual-key pattern. Android keys + legacy keys (`job_id`, `job_title`, `job_status`, `scheduled_date`). |
| `isLeadPayload()` | Accepts `id` OR `lead_id` — handles both Android and legacy Website payloads. |
| `isJobPayload()` | Accepts `id` OR `job_id`. |
| `normLeadPayload()` | NEW normalizer — extracts `{ entityId, name, status, value, includeValues, source, phone, email, addressLine1, city, postcode, notes }` from either key set. |
| `normJobPayload()` | NEW normalizer — same pattern + `scheduledDate`. |
| New payload send (page.tsx) | Constructs Android-compatible keys: `id`, `clientName`, `status`, `value`, `includeValues` ("true"/"false" string), `sourceToolKey`, `notes`, `shareable`. |

**Backward compat**: Old stored messages with `lead_id`/`job_id` keys continue to parse and render correctly via the normalizers.

---

## 2. MESSAGE_LINKS INSERTION FIX

**File**: `src/app/api/chat/messages/route.ts`

| Before | After |
|--------|-------|
| `parsed?.id` only | `parsed?.entity_id ?? parsed?.id ?? parsed?.lead_id ?? parsed?.job_id ?? parsed?.invoice_id ?? parsed?.quote_id ?? parsed?.asset_id ?? null` |
| Label: `parsed?.name` only | `parsed?.clientName ?? parsed?.title ?? parsed?.name ?? parsed?.lead_name ?? parsed?.job_title ?? messageBody.trim().slice(0, 100)` |

**Effect**: `message_links` rows now correctly insert for ALL payload formats (Android `id` + legacy `lead_id`/`job_id`).

---

## 3. WITH/WITHOUT VALUES DIALOG

**File**: `src/app/(member)/app/chat/page.tsx`

| Component | Detail |
|-----------|--------|
| New state: `pendingShare` | Stores selected entity + type when user picks a lead/job from SharePicker. |
| Flow change | Entity selection no longer sends immediately → opens values dialog first. |
| Values dialog | Modal with "Share with values" / "Share without values" / Cancel. |
| `handleValuesConfirm(includeValues)` | Constructs payload: `value = includeValues ? realValue : 0`, `includeValues = "true" \| "false"` (string). |

**Android parity**: Values dialog matches Android's share flow. `includeValues` is a STRING, not boolean.

---

## 4. RECEIVED IMPORT FLOW

**File**: `src/components/chat/StructuredMessageCard.tsx`

| Card | Own tap | Received tap |
|------|---------|-------------|
| LeadCard | `router.push('/app/leads/${entityId}')` | Import dialog → POST `/api/workspace/leads` → new lead created |
| JobCard | `router.push('/app/jobs/${entityId}')` | Import dialog → POST `/api/workspace/leads` (imports as lead) |
| ClientProfileCard | No action | Import dialog → POST `/api/workspace/leads` (imports as lead with contact info in notes) |

**Import payload**: `{ name, status: 'new', source: 'TissChat import', value_estimate: includeValues ? value : null, notes: [notes, phone, email, address].join('\n') }`

**Post-import UX**: Card shows "✅ Imported — tap to view" badge. Subsequent taps navigate to the new lead.

---

## 5. RECEIVED LEAD NAVIGATION FIX

**Before**: Received lead tap navigated to `/app/leads/${sender_uuid}` — always a 404 because sender's lead UUID doesn't exist in receiver's workspace.

**After**: Received lead tap opens import dialog. User must explicitly import, which creates a NEW lead in their own workspace with a fresh UUID. Navigation only happens to the locally-created lead.

---

## 6. INVALID SEND OPTIONS REMOVED

| File | Removed |
|------|---------|
| `AttachmentMenu.tsx` | 🧾 Share Invoice, 📋 Share Quote, 📦 Share Asset |
| `SharePicker.tsx` | `InvoiceItem`, `QuoteItem`, `AssetItem` types; invoice/quote/asset from `ShareEntityType`, `ENTITY_META`, `EntityRow`, `getEntityLabel` |
| `page.tsx` (imports) | `InvoiceItem`, `QuoteItem`, `AssetItem`, `ChatInvoicePayload`, `ChatQuotePayload`, `ChatAssetPayload`, `invoicePreviewText`, `quotePreviewText`, `assetPreviewText` |
| `page.tsx` (handlers) | Invoice, quote, asset branches removed from `handleEntitySelected` |

**Rendering kept**: `InvoiceCard`, `QuoteCard`, `AssetCard` still render in `StructuredMessageCard.tsx` for backward compat with old received messages. The payload types (`ChatInvoicePayload`, `ChatQuotePayload`, `ChatAssetPayload`) and type guards remain in `chat-payloads.ts`.

---

## 7. PREVIEW TEXT ALIGNMENT

| Type | Before | After |
|------|--------|-------|
| Lead | `🟢 Lead: Name · £Value` | `👤 Lead · Name · £Value · Location` |
| Job | `🔧 Job: Title · £Value` | `🔧 Job · Title · £Value · Location` |
| Client Profile | — | `👤 Contact · Name` |
| Document push | `📄 Document shared` | `📎 Document shared` |
| Invoice push | `💰 Invoice shared` | `🧾 Invoice shared` |
| Client Profile push | — | `👤 Contact shared` |

**Signature change**: `leadPreviewText(name, value, location?)` and `jobPreviewText(title, value, location?)` now accept optional `location` parameter.

---

## 8. OWN JOB TAP FIX + CLIENT PROFILE SUPPORT

### Own job tap

| Before | After |
|--------|-------|
| `router.push('/app/jobs')` (list page) | `router.push('/app/jobs/${norm.entityId}')` (detail page) |

### Client profile support

**File**: `src/lib/chat/chat-types.ts`  
- Added `'client_profile'` to `MessageType` union.

**File**: `src/lib/chat/chat-payloads.ts`  
- `ChatClientProfilePayload`: `{ type, name, phone?, email?, address?, preview }`
- `isClientProfilePayload()` type guard
- `clientProfilePreviewText(name)` preview generator

**File**: `src/components/chat/AttachmentMenu.tsx`  
- Added `👤 Share Contact` → calls `onSelectEntity('client_profile')`

**File**: `src/app/(member)/app/chat/page.tsx`  
- Contact form modal: name (required), phone, email, address fields
- `handleContactSend()`: constructs `ChatClientProfilePayload` and sends via `sendStructuredMessage('client_profile', ...)`
- When `shareType === 'client_profile'`, shows contact form instead of SharePicker

**File**: `src/components/chat/StructuredMessageCard.tsx`  
- `ClientProfileCard`: displays name, phone (📞), email (✉️), address (📍)
- Received tap → import as Lead with contact info in notes field
- Own tap → no action (card is informational)

**File**: `src/lib/chat/push-sender.ts`  
- `client_profile` → `👤 Contact shared`

---

## FILES CHANGED (8 total)

| # | File | Summary |
|---|------|---------|
| 1 | `src/lib/chat/chat-types.ts` | Added `'client_profile'` to MessageType |
| 2 | `src/lib/chat/chat-payloads.ts` | Dual-key LEAD/JOB interfaces, normalizers, client_profile type, updated preview text |
| 3 | `src/lib/chat/push-sender.ts` | Emoji alignment (📎, 🧾), added client_profile |
| 4 | `src/app/api/chat/messages/route.ts` | Extended entity_id + label extraction chains |
| 5 | `src/components/chat/AttachmentMenu.tsx` | Removed inv/quote/asset, added Share Contact |
| 6 | `src/components/chat/SharePicker.tsx` | Removed InvoiceItem/QuoteItem/AssetItem, cleaned types |
| 7 | `src/components/chat/StructuredMessageCard.tsx` | Normalized lead/job cards with import flow, added ClientProfileCard, fixed job nav |
| 8 | `src/app/(member)/app/chat/page.tsx` | Values dialog, Android-compatible payload construction, contact form, removed inv/quote/asset send |

---

## WHAT WAS NOT CHANGED

- **Database schema** — no migrations
- **message_type values** — `'lead'`, `'job'`, `'invoice'`, `'quote'`, `'asset'` unchanged; `'client_profile'` added
- **Rendering of old messages** — InvoiceCard, QuoteCard, AssetCard still render received legacy messages
- **Payload storage format** — JSON in `payload` column, unchanged
- **IMAGE (📷) and JOB (🔧) emoji** — not changed (already match Android)
- **Realtime subscription architecture** — untouched
- **useChat hook** — untouched
