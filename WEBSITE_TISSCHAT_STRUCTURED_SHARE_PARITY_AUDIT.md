# WEBSITE TISSCHAT STRUCTURED SHARE PARITY AUDIT

**Date:** 6 April 2026  
**Source of truth:** Android current behaviour (as specified by user)  
**Scope:** Read-only audit — no redesign, no changes

---

## 1. Supported types matrix

| Capability | Android | Website | Parity |
|-----------|---------|---------|--------|
| **SEND LEAD** | ✅ Structured business-card | ✅ Via SharePicker → `sendStructuredMessage('lead', ...)` | ⚠️ Sends, but payload fields differ (see §2) |
| **SEND JOB** | ✅ Structured business-card | ✅ Via SharePicker → `sendStructuredMessage('job', ...)` | ⚠️ Sends, but payload fields differ (see §3) |
| **SEND IMAGE** | ✅ | ✅ Via `sendFileMessage(file, 'image')` + upload route | ✅ Match |
| **SEND DOCUMENT** | ✅ | ✅ Via `sendFileMessage(file, 'document')` + upload route | ✅ Match |
| **SEND INVOICE** | ❌ Cannot send | ✅ **Website CAN send** via SharePicker → `sendStructuredMessage('invoice', ...)` | ❌ **MISMATCH — Website sends what Android cannot** |
| **SEND QUOTE** | ❌ Cannot send | ✅ **Website CAN send** via SharePicker → `sendStructuredMessage('quote', ...)` | ❌ **MISMATCH** |
| **SEND ASSET** | ❌ Cannot send | ✅ **Website CAN send** via SharePicker → `sendStructuredMessage('asset', ...)` | ❌ **MISMATCH** |
| **RENDER INVOICE** | ✅ (may exist) | ✅ `InvoiceCard` in `StructuredMessageCard.tsx` | ✅ Both render |
| **RENDER QUOTE** | ✅ (may exist) | ✅ `QuoteCard` in `StructuredMessageCard.tsx` | ✅ Both render |
| **RENDER ASSET** | ✅ (may exist) | ✅ `AssetCard` in `StructuredMessageCard.tsx` | ✅ Both render |
| **IMPORT received LEAD** | ✅ Can import | ❌ **NOT IMPLEMENTED** — tapping received lead navigates to `/app/leads/{lead_id}` which is the sender's lead ID, not an import | ❌ **MISMATCH** |
| **IMPORT received JOB** | ✅ Can import | ❌ **NOT IMPLEMENTED** — no import flow exists | ❌ **MISMATCH** |
| **OPEN own LEAD** | ✅ Opens lead detail | ✅ `router.push(\`/app/leads/${lead_id}\`)` | ✅ Match |
| **OPEN own JOB** | ✅ Opens job detail | ⚠️ `router.push('/app/jobs')` — navigates to **jobs list**, not specific job | ⚠️ **WEAK** — no deep-link to specific job |
| **Client Profile message** | ❌ Does not exist | ❌ Does not exist | ✅ Both absent |

**Critical findings:**
1. Website can SEND Invoice/Quote/Asset but Android CANNOT — messages sent from Website will arrive on Android as cards that Android never produced itself. Interop is one-way.
2. No import flow for received leads/jobs on Website.
3. Own JOB tap goes to list page, not specific job.

---

## 2. LEAD payload exact field parity

### Android LEAD payload fields:

| Android Field | Website Equivalent | Present? | Match? |
|---------------|-------------------|----------|--------|
| `id` | `lead_id` | ✅ | ❌ **Different key name** — `id` vs `lead_id` |
| `clientName` | `lead_name` | ✅ | ❌ **Different key name** — `clientName` vs `lead_name` |
| `jobType` | — | ❌ | ❌ **MISSING** |
| `status` | `lead_status` | ✅ | ❌ **Different key name** — `status` vs `lead_status` |
| `value` | `value_estimate` | ✅ | ❌ **Different key name** — `value` vs `value_estimate` |
| `includeValues` | — | ❌ | ❌ **MISSING** — no with/without values dialog |
| `phone` | — | ❌ | ❌ **MISSING** |
| `email` | — | ❌ | ❌ **MISSING** |
| `location` | — | ❌ | ❌ **MISSING** |
| `addressLine1` | — | ❌ | ❌ **MISSING** |
| `city` | — | ❌ | ❌ **MISSING** |
| `postcode` | — | ❌ | ❌ **MISSING** |
| `notes` | — | ❌ | ❌ **MISSING** |
| `valuesTextB64` | — | ❌ | ❌ **MISSING** |
| `sourceToolKey` | `source` | ✅ | ❌ **Different key name** — `sourceToolKey` vs `source` |
| `attCount` | — | ❌ | ❌ **MISSING** |
| `att0Key` / `att0Title` / `att0ValB64` / `att0Total` / `att0Notes` | — | ❌ | ❌ **MISSING** — flat attachment fields not supported |
| `shareable` | — | ❌ | ❌ **MISSING** |
| — | `type: 'lead'` | Website-only | n/a — Website adds `type` discriminator |
| — | `preview` | Website-only | n/a — preview text embedded in payload |

### Website `ChatLeadPayload` (from `chat-payloads.ts`):
```typescript
{
  type: 'lead',        // Website-only discriminator
  lead_id: string,     // Android: id
  lead_name: string,   // Android: clientName
  lead_status: string, // Android: status
  value_estimate: number | null,  // Android: value
  source: string | null,          // Android: sourceToolKey
  preview: string,     // Website-only
}
```

**Verdict:** 6 of 18 Android fields present; all 6 use different key names. 12 fields completely missing. The Website LEAD payload is a **simplified summary**, not an Android-compatible business card.

---

## 3. JOB payload exact field parity

### Android JOB payload fields:

| Android Field | Website Equivalent | Present? | Match? |
|---------------|-------------------|----------|--------|
| `id` | `job_id` | ✅ | ❌ **Different key name** — `id` vs `job_id` |
| `clientName` | `job_title` | ✅ | ❌ **Different key name and semantics** — `clientName` vs `job_title` |
| `jobType` | — | ❌ | ❌ **MISSING** |
| `status` | `job_status` | ✅ | ❌ **Different key name** |
| `value` | `value` | ✅ | ✅ **MATCH** — same key and semantics |
| `includeValues` | — | ❌ | ❌ **MISSING** |
| `phone` | — | ❌ | ❌ **MISSING** |
| `email` | — | ❌ | ❌ **MISSING** |
| `location` | — | ❌ | ❌ **MISSING** |
| `addressLine1` | — | ❌ | ❌ **MISSING** |
| `city` | — | ❌ | ❌ **MISSING** |
| `postcode` | — | ❌ | ❌ **MISSING** |
| `notes` | — | ❌ | ❌ **MISSING** |
| `valuesTextB64` | — | ❌ | ❌ **MISSING** |
| `sourceToolKey` | — | ❌ | ❌ **MISSING** |
| `attCount` | — | ❌ | ❌ **MISSING** |
| `att0Key` / `att0Title` / `att0ValB64` / `att0Total` / `att0Notes` | — | ❌ | ❌ **MISSING** |
| `shareable` | — | ❌ | ❌ **MISSING** |
| — | `scheduled_date` | Website-only | n/a — not in Android payload |
| — | `type: 'job'` | Website-only | n/a |
| — | `preview` | Website-only | n/a |

### Website `ChatJobPayload` (from `chat-payloads.ts`):
```typescript
{
  type: 'job',          // Website-only
  job_id: string,       // Android: id
  job_title: string,    // Android: clientName (different semantics)
  job_status: string,   // Android: status
  value: number | null, // Android: value ← ONLY true match
  scheduled_date: string | null, // Website-only
  preview: string,      // Website-only
}
```

**Verdict:** `value` is the only exact field match. 4 other fields present with wrong key names. 13 fields missing. Same pattern as LEAD — simplified summary, not an Android card.

---

## 4. With-values / without-values parity

| Android Behaviour | Website Behaviour | Parity |
|------------------|-------------------|--------|
| User gets dialog: "Share with values?" / "Share without values?" | **NO DIALOG** — values always included as-is | ❌ **MISSING** |
| `value = 0.0` when user chooses "without values" | **Never sets value to 0.0** — always passes real value | ❌ **MISSING** |
| `includeValues = "false"` (quoted string) when hidden | **No `includeValues` field exists** in payload | ❌ **MISSING** |
| `valuesTextB64` redacted / cleared when hidden | **No `valuesTextB64` field exists** | ❌ **MISSING** |
| Attachment `.att0Total` / `.att0ValB64` redacted when hidden | **No attachment fields exist** | ❌ **MISSING** |
| Receiver hides value pill when `includeValues = "false"` | **No hide logic** — `StructuredMessageCard` always shows `value_estimate` / `value` if non-null | ❌ **MISSING** |

**Verdict:** The entire with/without values mechanism is **completely absent** from the Website. The Website always shares the full value. If a Website user shares a lead with a value, there is no way to redact it. If an Android user sends a lead with `includeValues = "false"`, the Website renderer does not check this field and cannot hide the value pill (though since the Android sets `value = 0.0`, the Website would show `£0.00` or show nothing if null — the exact behaviour depends on whether Android sends `0.0` or `null`).

---

## 5. Tap / import parity

| Action | Android | Website | Parity |
|--------|---------|---------|--------|
| **Own LEAD tap** | Opens lead detail | `router.push(\`/app/leads/${lead_id}\`)` → opens lead detail | ✅ Match |
| **Own JOB tap** | Opens job detail | `router.push('/app/jobs')` → opens **jobs list page** | ⚠️ **Goes to list, not specific job** |
| **Received LEAD import** | Can save/import to own workspace | **NOT IMPLEMENTED** — `LeadCard.onClick` navigates to `/app/leads/${lead_id}` which navigates to the sender's lead ID in the receiver's workspace (will 404 or show wrong lead) | ❌ **BROKEN** — navigates to sender's UUID in receiver's data |
| **Received JOB import** | Can save/import to own workspace | **NOT IMPLEMENTED** — `JobCard.onClick` navigates to `/app/jobs` (list page only) | ❌ **Missing** |
| **What JOB import creates** | Creates a local job from the shared card | N/A — no import exists | ❌ |
| **INVOICE tap** | Render-only (cannot send) | `router.push('/app/invoices')` → opens invoices list | n/a — neither platform imports invoices |
| **QUOTE tap** | Render-only | `router.push('/app/quotes')` → quotes list | n/a |
| **ASSET tap** | Render-only | `router.push('/app/assets')` → assets list | n/a |

**Critical finding:** The received LEAD tap is **actively harmful** — it uses the sender's `lead_id` to navigate in the receiver's workspace. If the receiver doesn't have a lead with that UUID, they get a 404. If they coincidentally do have a lead with the same UUID (astronomically unlikely with UUIDs), they see the wrong lead.

---

## 6. message_links parity

### Server-side insertion logic (`messages/route.ts` lines 120-135):
```typescript
const ENTITY_TYPES = new Set(['lead', 'job', 'invoice', 'quote', 'asset']);
if (ENTITY_TYPES.has(messageType) && payload) {
  const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
  const entityId = parsed?.entity_id ?? parsed?.id ?? null;
  // ...
  if (entityId) {
    await supabase.from('message_links').insert({ ... entity_id: String(entityId), ... });
  }
}
```

| Check | Android | Website | Parity |
|-------|---------|---------|--------|
| **LEAD inserts message_links** | ✅ — Android sends `id` field → extracted by `parsed?.id` | ❌ **SILENT FAILURE** — Website payload has `lead_id`, not `id` or `entity_id`. The extraction `parsed?.entity_id ?? parsed?.id` returns `null` → no row inserted | ❌ **BUG** |
| **JOB inserts message_links** | ✅ — Android sends `id` field → extracted by `parsed?.id` | ❌ **SILENT FAILURE** — Website payload has `job_id`, not `id`. Same extraction returns `null` | ❌ **BUG** |
| **INVOICE inserts message_links** | N/A (Android cannot send) | ❌ **SILENT FAILURE** — payload has `invoice_id`, not `id` or `entity_id` | ❌ **BUG** |
| **QUOTE inserts message_links** | N/A | ❌ **SILENT FAILURE** — payload has `quote_id` | ❌ **BUG** |
| **ASSET inserts message_links** | N/A | ❌ **SILENT FAILURE** — payload has `asset_id` | ❌ **BUG** |
| **No silent failure on workspace resolution** | ✅ | ✅ — `workspaceId` resolved before insert | ✅ Match |
| **Server-aligned entity_type values** | `lead`, `job` | `lead`, `job`, `invoice`, `quote`, `asset` | ⚠️ Types match for lead/job; extra types for invoice/quote/asset (Android never sends these) |

**Critical finding:** `message_links` rows are **NEVER actually inserted** for Website-sent LEAD or JOB messages because the entity ID extraction uses `parsed?.entity_id ?? parsed?.id`, but the Website payloads use `lead_id` / `job_id` / `invoice_id` / `quote_id` / `asset_id`. The catch block swallows the null-guard silently. This is a **confirmed bug in every entity type**.

Android-sent messages DO get `message_links` rows correctly because Android payloads use `id`.

---

## 7. Preview text parity

### Conversation preview / message body text:

| Type | Android Format | Website Format (`chat-payloads.ts`) | Match? |
|------|---------------|-------------------------------------|--------|
| LEAD | `emoji + type + name + value + location` | `🟢 Lead: ${name} · ${value}` | ⚠️ **PARTIAL** — no location component |
| JOB | `emoji + type + name + value + location` | `🔧 Job: ${title} · ${value}` | ⚠️ **PARTIAL** — no location component |
| INVOICE | N/A (Android can't send) | `🧾 Invoice: ${number} · ${total}` | n/a |
| QUOTE | N/A | `📋 Quote: ${title} · ${total}` | n/a |
| ASSET | N/A | `📦 Asset: ${name} · ${assetType}` | n/a |
| IMAGE | `📷 filename` | `📷 ${filename}` | ✅ Match |
| DOCUMENT | `📎 filename` | `📎 ${filename}` | ✅ Match |

### Push notification preview text (`push-sender.ts`):

| Type | Website Push Text | Consistent with body? |
|------|------------------|-----------------------|
| LEAD | `👤 Lead shared` | ❌ **Different emoji** — body uses 🟢, push uses 👤 |
| JOB | `🔧 Job shared` | ✅ Same emoji |
| INVOICE | `💰 Invoice shared` | ❌ **Different emoji** — body uses 🧾, push uses 💰 |
| IMAGE | `📷 Image` | ✅ |
| DOCUMENT | `📄 Document` | ⚠️ Body uses 📎, push uses 📄 |

**Findings:**
1. Website preview text omits `location` that Android includes.
2. Push notification emojis are inconsistent with body/preview emojis for LEAD, INVOICE, and DOCUMENT.

---

## 8. UI label / copy mismatches

### AttachmentMenu (`AttachmentMenu.tsx`) — items shown to user:

| Menu Item | Label | Actually Sendable? | Android Can Send? | Mismatch? |
|-----------|-------|--------------------|-------------------|-----------|
| 📷 Image | "Image" | ✅ | ✅ | ✅ No issue |
| 📎 Document | "Document" | ✅ | ✅ | ✅ No issue |
| 🟢 Share Lead | "Share Lead" | ✅ | ✅ | ✅ No issue |
| 🔧 Share Job | "Share Job" | ✅ | ✅ | ✅ No issue |
| 🧾 Share Invoice | "Share Invoice" | ✅ Website sends | ❌ Android CANNOT send | ❌ **MISLEADING** — user can share an invoice from Website, but Android users CANNOT reply with one |
| 📋 Share Quote | "Share Quote" | ✅ Website sends | ❌ Android CANNOT send | ❌ **MISLEADING** |
| 📦 Share Asset | "Share Asset" | ✅ Website sends | ❌ Android CANNOT send | ❌ **MISLEADING** |

### SharePicker titles:

| Entity Type | Title | Issue |
|-------------|-------|-------|
| lead | "Share a Lead" | ✅ |
| job | "Share a Job" | ✅ |
| invoice | "Share an Invoice" | ❌ **Implies a sendable feature that Android cannot reciprocate** |
| quote | "Share a Quote" | ❌ Same |
| asset | "Share an Asset" | ❌ Same |

**Finding:** The UI presents Invoice, Quote, and Asset sharing as first-class features alongside Lead and Job. There is no indication to the user that these entity types are website-only capabilities. Android users receiving these cards can view them but cannot share their own invoices/quotes/assets back.

---

## 9. Exact mismatches vs Android

### CRITICAL (broken behaviour):

| # | Area | Mismatch | Impact |
|---|------|----------|--------|
| C1 | message_links | Entity ID extraction uses `parsed?.entity_id ?? parsed?.id` but Website payloads use `lead_id`/`job_id`/etc. **message_links rows are NEVER inserted for Website-sent entities** | Data integrity — entity linkage is broken for all Website-sent structured messages |
| C2 | Received LEAD tap | `LeadCard.onClick` navigates to `/app/leads/${sender_lead_id}` in the receiver's workspace — this UUID does not exist in the receiver's data | UX — receiver sees 404 or nothing |
| C3 | LEAD payload | Website uses `lead_id`/`lead_name`/`lead_status`/`value_estimate`/`source`. Android uses `id`/`clientName`/`status`/`value`/`sourceToolKey`. **Field names are completely different** — Android cannot deserialize Website payloads into its card model | Interop — Android will not render Website-sent leads correctly unless it has fallback parsing |
| C4 | JOB payload | Same issue — `job_id`/`job_title`/`job_status` vs `id`/`clientName`/`status` | Same interop problem |

### HIGH (missing features):

| # | Area | Mismatch | Impact |
|---|------|----------|--------|
| H1 | With/without values | Entire mechanism missing — no dialog, no value redaction, no `includeValues` field, no receiver-side hide logic | Privacy — users cannot hide financial values when sharing |
| H2 | LEAD/JOB import | No import flow for received cards — cannot save received lead/job to own workspace | Feature gap vs Android |
| H3 | Sendable types | Website can send Invoice/Quote/Asset but Android cannot — one-way interop | Confusing UX — users don't know these are website-only |
| H4 | Missing payload fields | 12+ Android fields missing from LEAD payload, 13+ from JOB payload (phone, email, location, address, notes, attachments, shareable, etc.) | Reduced card richness |

### MEDIUM:

| # | Area | Mismatch | Impact |
|---|------|----------|--------|
| M1 | Own JOB tap | Goes to `/app/jobs` (list) not `/app/jobs/${job_id}` (detail) | Minor UX — extra click to find the job |
| M2 | Preview text | Missing location component that Android includes | Inconsistent conversation preview |
| M3 | Push emoji | LEAD push uses 👤 but body uses 🟢; INVOICE push uses 💰 but body uses 🧾; DOCUMENT push uses 📄 but body uses 📎 | Minor visual inconsistency |
| M4 | UI labels | AttachmentMenu shows Invoice/Quote/Asset as shareable — implies parity that doesn't exist | UI honesty |

---

## 10. What must NOT be changed

| Item | Reason |
|------|--------|
| `message_type` enum values: `'lead'`, `'job'`, `'invoice'`, `'quote'`, `'asset'`, `'image'`, `'document'`, `'card'`, `'text'` | These match the server-side message_type column and Android message type routing. Changing them breaks all platforms. |
| `StructuredMessageCard` rendering for received Android LEAD/JOB cards | Android is already sending cards with `id`/`clientName`/`status`/`value` fields. The StructuredMessageCard must continue parsing Android payloads. Any payload format change must add to, not replace, the current parsing. |
| `message_links` table schema (`entity_type`, `entity_id`, `workspace_id`, `message_id`) | Matches the live server contract. Column names and types must not change. |
| `message_links` entity_type values: `'lead'`, `'job'`, `'invoice'`, `'quote'`, `'asset'` | CHECK constraint on live server. Must not deviate. |
| Preview text emoji conventions for IMAGE (📷) and JOB (🔧) | These match Android. Do not change. |
| The `parsePayload()` function's tolerance of unknown fields | Must remain forward-compatible — Android payloads contain fields Website doesn't use, and that's fine. `JSON.parse` + `as StructuredPayload` handles this. |
| Fire-and-forget pattern for `message_links` and `message_audit_log` inserts | Non-fatal link insertion is correct — should not become blocking. |
| The `SerializePayload()` → `JSON.stringify()` approach | Payload is stored as a JSON string in the `payload` column. This is the shared contract. |
| Image/Document upload flow via `sendFileMessage` → `/api/chat/upload` → `/api/chat/messages` | This two-step pattern (upload then send) is correct and matches general chat architecture. |
| `ConversationThread` / `ChatBubble` → `StructuredMessageCard` dispatch chain | The routing-by-type architecture is sound and matches how all platforms dispatch rendering. |
