# TISSCA — Final Canonical Cross-Platform Identity Contract

**Classification:** Architecture truth audit. READ-ONLY. No schema changes. No migrations.  
**Date:** 2026-05-19  
**Evidence basis:** Live Supabase proof (2025-07); production TypeScript schema types; SQL
migration files; API route implementations; confirmed build (exit code 0).  
**Companion documents:**
- `docs/audit/tissca-cross-platform-identity-contract-audit.md` — field-level identity matrix
- `docs/audit/website-tool-attachment-client-record-id-contract-fix.md` — fix log for W5 joins

---

## 1. Executive Summary

TISSCA operates a **dual-ID architecture**. Every CRM entity has two identity values:

| ID field | Origin | Role |
|----------|--------|------|
| `id` (Postgres UUID PK) | Supabase `gen_random_uuid()` on INSERT | Server-side row identity; used for SQL FK chains, `updateLead`/`updateJob`, `room_layouts`, UI routing |
| `client_record_id` (text UUID) | Android device — `UUID.randomUUID()`; Website — `crypto.randomUUID()` | Cross-platform entity identity; used for `tool_attachments.parent_id`, sync deduplication, offline-first conflict resolution |

**These two values are always different UUIDs. They are never interchangeable.**

The live Supabase proof that anchors every architectural decision in this document:

```sql
SELECT
  COUNT(*) FILTER (WHERE ta.parent_id = e.id)               AS parent_matches_uuid_pk,
  COUNT(*) FILTER (WHERE ta.parent_id = e.client_record_id) AS parent_matches_client_record_id
FROM tool_attachments ta
JOIN leads e ON e.workspace_id = ta.workspace_id;
```

| parent_matches_uuid_pk | parent_matches_client_record_id |
|------------------------|----------------------------------|
| **0** | **3** |

Zero attachments were linked via Postgres PK. All live attachments were linked via
`client_record_id`. This is not ambiguous.

---

## 2. Precise Definition of Each ID Field

### 2.1 `id` — Postgres UUID Primary Key

```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
```

- **Generator:** Postgres `gen_random_uuid()` on row INSERT — server-side only
- **Tables:** Every table (`leads`, `jobs`, `tasks`, `tool_attachments`, `clients`,
  `quotes`, `invoices`, `documents`, `crm_history`, `workspaces`, `conversations`,
  `messages`, `room_layouts`, `warehouse_assets`, etc.)
- **Stability:** Immutable from the moment of INSERT. Never changes.
- **Platform scope:** Available on all platforms as a row handle, but only the
  **website** uses `id` as a cross-entity join key (e.g. as `tool_attachments.parent_id`)
- **Android semantics:** Android reads `id` as a server-assigned row handle; it does NOT
  use `id` as the link key for tool attachments.
- **iOS semantics:** Not determinable from this codebase (no iOS-specific code present).

### 2.2 `client_record_id` — Mobile-Generated Cross-Platform UUID

```
Type: text (stored as text, semantically a UUID string)
Tables with this column: leads, jobs, tasks, tool_attachments
Tables WITHOUT this column: clients, quotes, invoices, documents, quote_items,
  invoice_items, room_layouts, crm_history, conversations, messages
```

- **Generator:**
  - Android: `UUID.randomUUID().toString()` at entity creation time, **on-device**, before any Supabase write
  - Website: `crypto.randomUUID()` in `createLead()` / `createJob()` / `createTask()`
    (post-W5 fix — previously leads/jobs were not always populated)
- **Stability:** Set once at creation; never mutated after first INSERT
- **Platform scope:** The **canonical Android cross-platform entity identity**
- **Critical property:** `client_record_id` is assigned **before** a network request.
  This is the foundation of offline-first architecture — entities are identifiable even
  if the server has not confirmed the write.
- **Type discrepancy:** The column is `text`, not `uuid`. The schema migration
  (`security_p0_data_isolation.sql`) added `parent_id` as `uuid` on `tool_attachments`,
  but Android stores `client_record_id` (a text UUID string) in it. Postgres implicitly
  casts valid UUID-format strings during comparison. No data corruption results, but
  the type inconsistency (`client_record_id text` vs `parent_id uuid`) is a schema
  artefact worth noting.

### 2.3 `workspace_id` — Tenant Scope Key

- **Type:** `uuid NOT NULL` on all current tables
- **Origin:** Server-side row in `public.workspaces`
- **Role:** The primary multi-tenant isolation key for ALL data operations
- **Legacy alias:** `business_id` on `quotes`, `invoices`, `tool_attachments` (original column);
  in live production, `business_id = workspace_id` (same UUID)
- **Code proof:** `workspace-data.ts` line 19: `businessId: string | null; // LEGACY — kept for compat, equals workspaceId`

### 2.4 `business_id` — Legacy Workspace Alias

- Was the original tenant scope key before `workspaces` table was introduced
- Lives on: `quotes`, `invoices`, `tool_attachments` (original column), `crm_history`
- In all live environments: `business_id = workspace_id` (same UUID value)
- **Do not introduce new `business_id` references.** Use `workspace_id`.

### 2.5 `client_id` — FK to `public.clients`

- **Type:** `uuid` (NOT NULL on `quotes`/`invoices`; nullable on `leads`/`jobs`)
- **Role:** Links a quote, invoice, lead, or job to a canonical contact record in `public.clients`
- **Android note:** Android does NOT write to `public.clients`. Inline contact data
  (`client_name`, `email`, `phone`) lives on the lead/job row itself.
- **Critical gap:** `public.clients` has **no `client_record_id` column**. Therefore,
  there is no path from `quotes.client_id → clients.id → client_record_id`. The
  quote/invoice domain is structurally disconnected from the Android identity chain.

### 2.6 `lead_id` on `jobs`

- **Type:** `uuid` nullable, FK → `leads.id` (Postgres PK)
- **Populated by:** Website `lead → job` conversion route (`/api/workspace/leads/[id]/convert`)
- **Meaning:** "This job was converted from lead with this Postgres PK"
- **Android note:** Android-created jobs may not carry `lead_id`. Android uses a different
  field name for this linkage concept (not determinable from this codebase).
- **Not to be confused with** `tool_attachments.parent_id` — completely different purposes.

### 2.7 `parent_id` + `parent_type` on `tool_attachments`

- **Type:** `parent_id uuid nullable`, `parent_type text nullable` (`'LEAD' | 'JOB'`)
- **Added by:** `security_p0_data_isolation.sql`
- **Value contract:**
  - **Android writes:** `parent_id = leads.client_record_id` or `jobs.client_record_id`
  - **Website writes (post-fix):** `parent_id = lead.client_record_id` or `job.client_record_id`
  - **Website writes (pre-fix, before W5):** `parent_id = leads.id` or `jobs.id` — **WRONG**
- **Supabase proof:** `parent_matches_uuid_pk = 0`, `parent_matches_client_record_id = 3`

### 2.8 `linked_entity_id` + `linked_entity_type` on `documents`

- **Type:** `text` (both columns)
- **Table:** `documents` only
- **Values set by website:**
  - Quote PDF: `linked_entity_type = 'quote'`, `linked_entity_id = quotes.id` (Postgres UUID string)
  - Invoice PDF: `linked_entity_type = 'invoice'`, `linked_entity_id = invoices.id`
  - Layout quote PDF: `linked_entity_type = 'layout'`, `linked_entity_id = room_layouts.id`
- **Values set by Android documents:** Not determinable from this codebase. Android writes
  directly to `public.documents`. Whether it populates `linked_entity_id` and with which
  namespace is unknown.
- **Document PDF route** (`/api/workspace/documents/[id]/pdf`): Uses
  `.eq('parent_id', doc.linked_entity_id)` to fetch tool_attachments. This is only correct
  if the Android document was created with `linked_entity_id = entity.client_record_id`.

### 2.9 `entity_id` on `crm_history`

- **Type:** `text` nullable
- **Website writes:** `entity_id = leads.id` or `jobs.id` (Postgres PK) via `logHistory()`
- **Task writes:** `entity_id = tasks.id` (Postgres PK) via `logTaskHistory()`
- **Android writes:** Unknown — depends on Android CrmViewModel implementation
- **No unique index on `entity_id`** — it is a lookup field only, not a constraint

### 2.10 `client_event_id` on `crm_history`

- **Type:** `text` nullable, unique where NOT NULL
- **Format:** `"${entityId}:${action}:${timestamp_millis}"`
- **Purpose:** Cross-platform event deduplication on sync
- **Website usage:** Set only for task history events. CRM entity events (leads, jobs)
  do NOT set `client_event_id` from the website.

### 2.11 Chat `id` field in `ChatLeadPayload` / `ChatJobPayload`

- The `id` field in TissChat structured cards (`chat-payloads.ts`) resolves to
  `p.id ?? p.lead_id ?? ''` (for leads) and `p.id ?? p.job_id ?? ''` (for jobs)
- The canonical identity stored in these cards is **ambiguous** — it could be
  either `leads.id` (Postgres PK) or `leads.client_record_id` depending on which
  platform originated the card.
- Cards are used for display only and do not drive database joins. The ambiguity
  is a UI/navigation risk, not a data-integrity risk.

---

## 3. Per-Table Identity Contract

### 3.1 `leads`

| Operation | Correct key |
|-----------|-------------|
| SQL join (website CRM, UI routing) | `id` (Postgres PK) |
| `tool_attachments.parent_id` lookup | **`client_record_id`** |
| `jobs.lead_id` FK source | `id` (Postgres PK) |
| `room_layouts.lead_id` FK source | `id` (Postgres PK) |
| Android sync identity | `client_record_id` |
| Website UI routing (URL params) | `id` |
| Canonical for cross-platform sync | `client_record_id` |
| `updateLead()` / `deleteLead()` parameter | `id` |

**Timestamp contract:** No `created_at` / `updated_at` ISO columns. Only
`created_at_millis: bigint` and `updated_at_millis: bigint`. Any code accessing
`lead.created_at` as a string will receive `undefined` at runtime.

---

### 3.2 `jobs`

| Operation | Correct key |
|-----------|-------------|
| SQL join (website CRM, UI routing) | `id` (Postgres PK) |
| `tool_attachments.parent_id` lookup | **`client_record_id`** |
| FK from lead conversion (`lead_id`) | `lead_id` → `leads.id` |
| `room_layouts.job_id` FK source | `id` (Postgres PK) |
| Android sync identity | `client_record_id` |
| Website UI routing | `id` |
| `updateJob()` / `deleteJob()` parameter | `id` |

**Non-existent columns:** `source_lead_id` does NOT exist. `created_at` / `updated_at`
ISO columns do NOT exist. Only `created_at_millis` and `updated_at_millis`.

---

### 3.3 `tasks`

| Operation | Correct key |
|-----------|-------------|
| SQL join (website) | `id` (Postgres PK) |
| Android sync identity | `client_record_id` (NOT NULL on tasks; always generated) |
| Cross-platform dedup | `client_record_id` |
| `updateTask()` / `deleteTask()` | `id` |
| `crm_history` event logging | `entity_id = id` |

**Note:** `tasks.client_record_id` is `text NOT NULL` — the only table where this
column is guaranteed to be populated. Both website and Android always generate one.

---

### 3.4 `tool_attachments`

This table is the primary location of the cross-platform identity divergence.

| Column | Value written by Android | Value written by Website (post-fix) |
|--------|--------------------------|--------------------------------------|
| `parent_id` | `leads.client_record_id` or `jobs.client_record_id` | `lead.client_record_id` or `job.client_record_id` |
| `parent_type` | `'LEAD'` or `'JOB'` | `'LEAD'` or `'JOB'` |
| `client_record_id` | Own UUID (tool attachment's own identity) | `null` (website does not generate one for attachment rows) |
| `workspace_id` | Set by Android; backfilled from `business_id` for pre-P0 rows | Set by website |
| `id` | Postgres PK — server-assigned | Postgres PK — server-assigned |

**Safe join:**
```typescript
// CORRECT — resolves Android and post-fix website attachments
.eq('parent_id', entity.client_record_id)
.eq('workspace_id', workspaceId)
```

**Unsafe join (pre-fix website):**
```typescript
// WRONG — only resolved website-created attachments before W5 fix
.eq('parent_id', entity.id)  // DO NOT USE
```

**Legacy columns (from bootstrap schema, now dead):** `lead_id uuid`, `job_id uuid`,
`business_id uuid`. These were the original attachment linkage design, superseded by
`parent_id + parent_type` which Android adopted. New code must NOT use these.

---

### 3.5 `documents`

The `documents` table has a **split identity contract** depending on who created the row:

| Origin | `platform` | `linked_entity_type` | `linked_entity_id` value |
|--------|------------|----------------------|--------------------------|
| Website quote PDF | `'web'` | `'quote'` | `quotes.id` (Postgres PK UUID string) |
| Website invoice PDF | `'web'` | `'invoice'` | `invoices.id` (Postgres PK UUID string) |
| Website layout quote | `'web'` | `'layout'` | `room_layouts.id` (Postgres PK UUID string) |
| Android document | `'android'` | Unknown | Unknown — NOT determinable from this codebase |

**Critical ambiguity:** The documents PDF route
(`/api/workspace/documents/[id]/pdf/route.ts`) fetches tool attachments with:
```typescript
.eq('parent_id', doc.linked_entity_id)
```
For website PDFs, `linked_entity_id = quotes.id` — but `tool_attachments.parent_id`
stores `client_record_id`. These namespaces **never match**. Website-generated quote
PDFs will **never see any tool attachments** via this join. (For Android documents,
if Android sets `linked_entity_id = entity.client_record_id`, the join would work.)

This is a known architectural gap, not a bug introduced by W5. The documents PDF route
was documented as "no change needed" in `website-tool-attachment-client-record-id-contract-fix.md`
because `quotes.id` ≠ `client_record_id` is architecturally expected for website documents.
The tool attachment lookup for Android documents relies on `linked_entity_id` storing
`client_record_id`, which Android may or may not do consistently.

**Deduplication key:** `(workspace_id, linked_entity_type, linked_entity_id, type)` —
partial unique index `uq_documents_entity_identity`.

---

### 3.6 `quotes`

| Operation | Correct key |
|-----------|-------------|
| SQL joins | `id` (Postgres PK) |
| `documents.linked_entity_id` | `id` |
| Tenant scope | `business_id` (= `workspace_id`) |
| Client FK | `client_id → clients.id` |
| Android visibility | Quotes exist in a different table from Android documents. Android-created quote-like documents live in `public.documents`, not `public.quotes`. |
| `client_record_id` | **Does not exist on this table.** |
| Timestamp | ISO `created_at` / `updated_at` (timestamptz) |

**No cross-platform tool attachment join is possible from `quotes`.** There is no
`client_record_id` on `quotes` and no FK to any table that carries one.

---

### 3.7 `invoices`

Same contract as `quotes`:

| Operation | Correct key |
|-----------|-------------|
| SQL joins | `id` (Postgres PK) |
| `documents.linked_entity_id` | `id` |
| Tenant scope | `business_id` (= `workspace_id`) |
| Client FK | `client_id → clients.id` |
| `client_record_id` | **Does not exist on this table.** |
| Timestamp | ISO `created_at` / `updated_at` (timestamptz) |

---

### 3.8 `clients`

| Operation | Correct key |
|-----------|-------------|
| SQL joins from quotes/invoices | `id` (Postgres PK) |
| Android visibility | Android does NOT write to `public.clients`. Android carries client data inline on leads/jobs. |
| `client_record_id` | **Does not exist on this table.** |
| Cross-platform? | Website-only concept |

**Dead-end path:** `quotes.client_id → clients.id` cannot be extended to
`client_record_id`. There is no bridge from the website financial system to Android's
entity identity system through the `clients` table.

---

### 3.9 `room_layouts` (Visual Planner)

| Column | Key used | Namespace |
|--------|----------|-----------|
| `lead_id` | `leads.id` | Postgres PK (FK constraint confirmed in `phase_e1_room_layouts.sql`) |
| `job_id` | `jobs.id` | Postgres PK (FK constraint) |
| `workspace_id` | Workspace UUID | Tenant scope |
| `id` | Postgres PK | Row identity |

**No `client_record_id` on this table.** Room layouts are website-only at this time.
If Android ever needs to link a layout to a lead/job, it would need to look up
`leads.id` given `leads.client_record_id`.

---

### 3.10 `crm_history`

| Column | Value |
|--------|-------|
| `entity_id` | Website: `leads.id` / `jobs.id` / `tasks.id` (Postgres PK). Android: unknown. |
| `workspace_id` | Task events and newer events |
| `business_id` | Older CRM events (legacy — same UUID as `workspace_id`) |
| `client_event_id` | Task events only (website); all mobile events (Android/iOS dedup) |

**Dual-scope merger:** `getHistory()` queries both `workspace_id` and `business_id`
scopes and deduplicates by `id`. This is required until all legacy events are migrated.

---

### 3.11 `conversations` + `messages` (TissChat)

| Column | Key used |
|--------|----------|
| `workspace_id` | Tenant scope (all tables) |
| `id` (conversations) | Postgres PK |
| `id` (messages) | **Client-generated UUID** (schema comment: `id uuid PRIMARY KEY` — NOT `DEFAULT gen_random_uuid()`) |
| `sender_id` | `auth.users.id` |

**TissChat messages are the only table where `id` is client-generated, not server-generated.**
This mirrors Android's offline-first pattern. The `id` column serves as both the Postgres PK
and the cross-platform message identity — a successful single-ID architecture.

---

### 3.12 `warehouse_assets` (Planner Asset Library)

| Column | Key used |
|--------|----------|
| `id` | Postgres PK |
| `owner_id` | `auth.users.id` (not `workspace_id`) — user-scoped |
| `source_platform` | `'web'` or `'android'` |

**No `workspace_id` and no `client_record_id`.** Scoped by `owner_id` (auth UUID).
System presets use `source = 'systemPreset'`.

---

## 4. Every Currently Unsafe Join or Ambiguity

### 4.1 CRITICAL: `tool_attachments.parent_id` — namespace collision risk

**Status:** Fixed in W5 for all website code paths. Legacy pre-fix rows that were
written with `parent_id = leads.id` by the website still exist in the database.

**Live rows affected:** Any `tool_attachments` row created by the website CRM before
the W5 fix has `parent_id = leads.id` (Postgres PK). These rows will NOT be found
by queries that correctly use `client_record_id`. They are silently orphaned.

**Mitigation (no migration required):** These orphaned rows are invisible to the
current UI (tools page, lead detail, job detail). They are not displayed, not counted,
and not included in totals. A future optional cleanup could identify them by checking
whether `parent_id NOT IN (SELECT client_record_id FROM leads WHERE ...)`.

---

### 4.2 HIGH: `documents/[id]/pdf` tool attachment lookup for website-generated PDFs

**Route:** `src/app/api/workspace/documents/[id]/pdf/route.ts`  
**Join:** `.eq('parent_id', doc.linked_entity_id)`

For website-generated quote/invoice PDFs:
- `linked_entity_id = quotes.id` (Postgres PK)
- `tool_attachments.parent_id = leads.client_record_id` (mobile UUID)
- These namespaces **never match**

For Android-generated documents:
- `linked_entity_id` may store `client_record_id` (if Android sets it)
- If so, the join would work

**Impact:** Website-generated PDFs cannot include tool attachment line items via the
`documents/[id]/pdf` route. They fall back to `doc.items` (the stored items snapshot).
This is the current behaviour and is architecturally expected given the system separation.

---

### 4.3 MEDIUM: `crm_history.entity_id` namespace ambiguity

- Website writes `entity_id = leads.id` (Postgres PK string)
- Android may write `entity_id = client_record_id` or `entity_id = leads.id`
- No constraint enforces a single namespace
- History feed renders only display text (`details`, `snapshot_json`) — no entity lookup is
  done from `entity_id` at render time, so the ambiguity is currently non-consequential

---

### 4.4 MEDIUM: `documents.linked_entity_id → quotes.id` (website PDFs only)

The `uq_documents_entity_identity` unique index deduplicates on
`(workspace_id, linked_entity_type, linked_entity_id, type)`. This works correctly for
website PDFs (where `linked_entity_id = quotes.id`). If Android ever writes a document
with `linked_entity_id = client_record_id`, it will NOT conflict with the website's
deduplication space — but it also cannot be deduped against any website-created document.
Two separate document rows could exist for the same entity, one created by each platform.

---

### 4.5 LOW: TissChat shared cards — `id` field namespace ambiguity

`ChatLeadPayload.id` and `ChatJobPayload.id` are resolved as `p.id ?? p.lead_id ?? ''`.
The `id` field could contain:
- `leads.id` (Postgres PK) — if card was created by website
- `leads.client_record_id` — if card was created by Android (Android uses `client_record_id`
  as entity identity in shared cards)

Chat card display does not currently perform a database lookup on this `id` — it shows
the card inline in the message. Navigation from a chat card to the lead detail page would
use this `id` as the URL param. If it is a `client_record_id` rather than `leads.id`,
the URL would 404. This is a latent navigation risk, not a data-integrity risk.

---

### 4.6 LOW: `room_layouts.lead_id` / `room_layouts.job_id` — Postgres PK only

Room layouts link to leads/jobs via `leads.id` / `jobs.id` Postgres PKs (FK constraints).
If an Android user deletes and re-creates a lead (rare but possible), the Postgres PK
changes and the layout loses its linkage. A layout linked by `client_record_id` would
survive such an event. This is a low-probability long-term fragility.

---

### 4.7 LOW: `tasks.client_record_id NOT NULL` — only table with hard guarantee

Tasks are the only table where `client_record_id` is always populated. All other tables
(`leads.client_record_id`, `jobs.client_record_id`, `tool_attachments.client_record_id`)
are nullable. Code that assumes `lead.client_record_id` is always present must guard
against null (post-W5 fix, new website leads/jobs always generate one, but rows created
before the fix may still be null).

---

## 5. Recommended Long-Term Architecture (No Migrations, No Production Risk, Evolutionary)

### Principle: Embrace the dual-ID architecture as a defined contract, not an accident

The dual-ID architecture is not a bug to eliminate. It is the correct response to an
offline-first mobile platform sharing a database with a server-rendered website. The two
IDs serve different purposes that cannot be collapsed without breaking one system.

### Step 1 — Harden the documentation barrier (already done via W5 + this audit)

Every new code path involving `tool_attachments`, `leads`, or `jobs` must document
which ID namespace it is operating in. Function names and comments must be explicit
(`lookupLeadByClientRecordId`, not just `lookupLead`).

### Step 2 — Populate `client_record_id` on all website-created entities (already done via W5)

`createLead()` and `createJob()` now generate `client_record_id = crypto.randomUUID()`
if not supplied. This ensures new website-created entities are visible to Android and
can participate in the correct join namespace.

### Step 3 — Add `client_record_id` to `quotes` and `invoices` (future — additive only)

If Android ever needs to query quotes or invoices directly, add a nullable
`client_record_id text` column. Website would auto-generate one on creation
(`input.client_record_id ?? crypto.randomUUID()`). No existing rows would be affected
(column is nullable). This is a pure schema addition — no breaking change.

### Step 4 — Resolve the `documents.linked_entity_id` namespace split (future — low priority)

Consider adding a `linked_entity_client_record_id text` column alongside the existing
`linked_entity_id`. Website PDFs would populate `linked_entity_id = quote.id` as now,
AND `linked_entity_client_record_id = quote.client_record_id` (once Step 3 is done).
Android PDFs would populate `linked_entity_client_record_id = entity.client_record_id`
directly. This resolves the two-namespace ambiguity in the documents table.

### Step 5 — Migrate `room_layouts.lead_id` / `job_id` to `client_record_id` references (future)

If the planner becomes a cross-platform feature, the Postgres FK references (`lead_id`,
`job_id`) should be supplemented with `lead_client_record_id text` and
`job_client_record_id text`. The existing FK columns would remain for backward compatibility.

### Step 6 — Resolve TissChat card `id` ambiguity (future — medium priority)

Add explicit `client_record_id` fields to `ChatLeadPayload` and `ChatJobPayload`.
The website sender would populate both `id` (Postgres PK for navigation) and
`client_record_id` (for Android identity recognition). Android would do the same in
reverse. The normalizer `normLeadPayload()` would extract whichever is present.

---

## 6. Should `client_record_id` Eventually Disappear?

**No. `client_record_id` is architecturally required for offline-first architecture and
should be a permanent, first-class column on all CRM entity tables.**

### Why it cannot be removed:

1. **Offline-first guarantee:** Android creates entities on-device before network
   confirmation. The device must have a stable identity UUID for the entity before
   Supabase acknowledges the INSERT. The Postgres `id` (server-generated) does not
   exist until the INSERT succeeds and the server responds. `client_record_id` is the
   only available stable identity during offline creation.

2. **Conflict resolution:** If two devices create an entity for the same client at
   roughly the same time, conflict resolution compares `client_record_id` values
   (device-generated) to detect collisions. Postgres `id` values cannot be compared
   for this purpose because they are only assigned post-INSERT.

3. **Cross-device referencing:** When Device A creates a lead and Device B creates a
   tool attachment for that lead, Device B must know the lead identity before syncing.
   `client_record_id` enables this — Device A syncs the `client_record_id` to Device B
   via a shared data model, and Device B writes `tool_attachments.parent_id = leadClientRecordId`.
   No network round-trip to learn the Postgres `id` is required.

4. **Historical chain:** Every `tool_attachments` row ever created by Android has
   `parent_id = client_record_id`. Migrating away from this would require a mass data
   migration with risk of data loss. The benefit does not justify the risk.

### When `client_record_id` IS NOT needed:

- `quotes`, `invoices`, `clients`, `room_layouts` — currently website-only tables.
  These do not need `client_record_id` until they become cross-platform tables.
- `documents` — Android writes directly to `documents` but with its own identity scheme.
  A separate `linked_entity_client_record_id` column (see Step 4 above) is the safer
  addition than repurposing `linked_entity_id`.

---

## 7. Does the `documents` Table Already Represent the Future-Safe Architecture?

**Partially. It demonstrates the right intent but with an unresolved namespace split.**

### What the `documents` table does right:

- Uses `text` type for `linked_entity_id` — not `uuid` — allowing any UUID string to be
  stored regardless of origin (Postgres PK strings or `client_record_id` strings)
- `platform` column explicitly tags whether a row originated from `'web'`, `'android'`, etc.
- Partial unique index (`uq_documents_entity_identity`) enables regeneration deduplication
  within a single namespace
- Version column enables regeneration tracking
- Deduplication logic in `persistDocumentAndLog()` uses lookup-before-write to prevent
  inflation — a pattern all mutation functions should follow

### What the `documents` table does wrong (or leaves ambiguous):

- A single `linked_entity_id` column holds values from two different namespaces:
  `quotes.id` (Postgres PK) for website-origin rows and (presumably)
  `entity.client_record_id` for Android-origin rows
- The deduplication index cannot span both namespaces — a website PDF and an Android PDF
  for the same lead will be deduplicated separately (or not at all)
- There is no column that universally identifies "the lead or job this document is for"
  across platforms

### Verdict:

The `documents` table represents a near-future-safe architecture. It needs one addition —
a `linked_entity_client_record_id text` column — to complete the design. Until that column
exists, the deduplication and tool attachment lookup behaviour will remain platform-specific.

---

## 8. Migration Risk Analysis

### 8a. What would break if `client_record_id` vanished from all tables?

| Impact | Severity |
|--------|----------|
| Every Android `tool_attachments` row would become unlinkable — `parent_id` was populated with `client_record_id` values; if those values no longer exist anywhere to JOIN against, all tool attachment lookups return empty | **CRITICAL** |
| Android sync would break — Android uses `client_record_id` as the stable entity identity for UPSERT operations | **CRITICAL** |
| Android offline mode would break — entities cannot be identified before network confirmation | **CRITICAL** |
| All task deduplication (`client_record_id NOT NULL` on tasks) would fail | **HIGH** |
| Website `lookupLeadByClientRecordId()` / `lookupJobByClientRecordId()` helpers return null for all entities — tool attachment recalculation silently skips all updates | **HIGH** |
| Sync diagnostics `parent_mismatch_count` would become meaningless | **LOW** |

**Verdict:** Removing `client_record_id` would cause complete data disconnection between
Android and the website. It would require a complete rewrite of Android sync. Not viable.

---

### 8b. What would break if ALL joins moved to Postgres PK `id`?

| Impact | Severity |
|--------|----------|
| `tool_attachments.parent_id` would need a full data migration to replace all `client_record_id` values with `leads.id` / `jobs.id` values for Android-created rows — requires a JOIN at migration time to do the translation | **CRITICAL** |
| Android would need a protocol change to send `entity.id` (Postgres PK) in `parent_id` instead of `entity.client_record_id` — requires a coordinated app and backend release | **CRITICAL** |
| Any Android entity created offline (before sync) would have no `id` at tool-attachment creation time — the offline-first guarantee is broken | **CRITICAL** |
| Android devices that have not synced post-migration would write old `client_record_id` values into `parent_id`, creating a two-namespace collision even worse than today | **CRITICAL** |
| All historical `tool_attachments.parent_id = client_record_id` rows would need translation | **HIGH** |

**Verdict:** A forced migration to Postgres PKs for all joins is infeasible without a
coordinated Android SDK release, a full data migration, and a rollout blackout window.
Not viable without significant risk.

---

### 8c. What would break if Android changed its `client_record_id` generation?

| Impact | Severity |
|--------|----------|
| If Android switched from random UUID to a deterministic scheme, historical `parent_id` values in `tool_attachments` would still be valid (immutable once written) — no breakage for existing rows | **NONE** for historical data |
| New rows would use the new scheme — backward compatibility depends on whether the new scheme produces the same uniqueness guarantees | **MEDIUM** |
| If Android changed the column name (not value), the website's `lookupLeadByClientRecordId()` queries would fail — but this is a schema-level change requiring a coordinated migration | **HIGH** |

---

## 9. Final Recommendation

### Keep the dual-ID architecture permanently. Converge toward a unified convention within it.

The dual-ID architecture is **not a design flaw to eliminate**. It is the correct
implementation of an offline-first mobile CRM platform. The two IDs serve provably
different functions:

- `id` (Postgres PK) → server-side row handle, website operations, FK constraints,
  SQL joins within the website domain
- `client_record_id` → cross-platform entity identity, offline creation, tool attachment
  linkage, sync deduplication

The correct long-term goal is **not convergence to a single ID** but **explicit documentation
and enforcement of which ID is used in which context**. Every function that touches a
CRM entity must declare its ID namespace. The W5 fix is the model:

```typescript
// EXPLICIT NAMESPACE DECLARATION
// sumToolAttachmentTotals(resolved, 'lead', lead.client_record_id)
// NOT sumToolAttachmentTotals(resolved, 'lead', lead.id)
```

### Convergence path (eventual, not urgent):

The architecture converges toward a single, unified system when:

1. Every CRM entity table has a `client_record_id` column
2. Every entity created by any platform (website, Android, iOS) generates `client_record_id`
3. The `documents.linked_entity_client_record_id` column is added to bridge the document domain
4. TissChat shared cards include both `id` and `client_record_id` explicitly
5. The `room_layouts` table adds `client_record_id`-based linkage for planner sharing

At that point, `tool_attachments.parent_id` could be queried against a single,
universal `client_record_id` namespace for ALL tables — and the lookup helpers
(`lookupLeadByClientRecordId`, `lookupJobByClientRecordId`) would become unnecessary
because all paths would use the same key.

**Until that convergence**, the explicit dual-ID pattern with documented resolver helpers
is the correct and safe architecture. It is the pattern that the W5 fix implements.

---

## 10. Reference: Current ID Usage Summary

```
Table               | Primary ID used   | client_record_id? | Cross-platform?
--------------------|-------------------|-------------------|----------------
leads               | id (PK)           | ✅ text nullable  | ✅ (Android R/W)
jobs                | id (PK)           | ✅ text nullable  | ✅ (Android R/W)
tasks               | id (PK)           | ✅ text NOT NULL  | ✅ (Android R/W)
tool_attachments    | id (PK)           | ✅ text nullable  | ✅ parent_id = CrId
documents           | id (PK)           | ❌ none           | ⚠️ split namespace
quotes              | id (PK)           | ❌ none           | ❌ website only
invoices            | id (PK)           | ❌ none           | ❌ website only
clients             | id (PK)           | ❌ none           | ❌ website only
room_layouts        | id (PK)           | ❌ none           | ❌ website only
crm_history         | id (PK)           | ❌ none           | ⚠️ entity_id split
conversations       | id (PK)           | ❌ none           | ✅ workspace scoped
messages            | id (client-gen)   | ❌ none           | ✅ (client UUID = PK)
warehouse_assets    | id (PK)           | ❌ none           | ⚠️ platform tagged
```

**Legend:** ✅ Safe / present, ❌ Absent, ⚠️ Partial or ambiguous
