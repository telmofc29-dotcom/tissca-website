# CRM Schema Reconciliation Report

**Date:** 2026-04-02  
**Scope:** Proof-based audit of production CRM schema → code reconciliation  
**Build status:** ✅ PASS (zero errors)

---

## 1. Problem Statement

The previous pass (Phase 3-4) added `client_email`, `client_phone`, and `client_address` columns to `LeadRow` and attempted to write them directly to the Supabase-native `leads` table. **These columns do not exist on the real `leads` table.** A canonical `clients` table already exists with full contact fields, proven by the `quotes.client_id` FK relationship.

This reconciliation pass removes the wrong duplicate contact fields and wires the code to the real `clients` table via a `client_id` foreign key.

---

## 2. Schema Audit Findings

### 2a. `clients` table (Supabase-native — canonical contact source)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| business_id | uuid | FK → businesses(id), NOT NULL |
| name | varchar(255) | NOT NULL |
| email | varchar(255) | |
| phone | varchar(50) | |
| address_line_1 | varchar(255) | |
| address_line_2 | varchar(255) | |
| city | varchar(100) | |
| postcode | varchar(20) | |
| country | varchar(100) | Default 'GB' |
| company_name | varchar(255) | |
| vat_number | varchar(50) | |
| notes | text | |
| is_active | boolean | Default true |
| created_at / updated_at | timestamptz | |

**Indexes:** business_id, email, is_active. **RLS:** enabled.

### 2b. `leads` table (Supabase-native — no CREATE TABLE in codebase)
Confirmed to exist via `phase_e1_room_layouts.sql` FK reference `public.leads(id)` with uuid type.

**Known columns (from code usage):** `id` (uuid), `business_id` (uuid), `name`, `status`, `source`, `value_estimate`, `follow_up_date`, `notes`, `tags`, `created_at`, `updated_at`.

**Does NOT have:** `client_email`, `client_phone`, `client_address`, `client_id` (yet).

### 2c. `quotes` table — proves the FK pattern
```sql
client_id uuid not null references public.clients(id) on delete cascade
```
This is the canonical pattern for linking entities to the `clients` table.

### 2d. Prisma models (legacy fallback)
- `Lead`: NO `name`, NO `business_id`, NO client fields.
- `Client`: `id` (cuid), `userId`, `name`, `email`, `phone`, `address`.
- Existing `/api/clients/route.ts` uses Prisma auth pattern (userId + cuid) — NOT workspace-scoped.

---

## 3. Classification

| Area | Previous State | Verdict |
|------|---------------|---------|
| `client_email/phone/address` on leads | Assumed these columns exist | **WRONG** — columns don't exist |
| `clients` table | Ignored | **Already exists** as canonical contact source |
| `quotes.client_id` FK | Not referenced | **Proves** the correct FK pattern |
| `leads.client_id` column | Not present | **Needs migration** (one safe column) |
| workspace client CRUD | Missing | **Added** (getClients, getClientById, createClient) |
| `/api/workspace/clients` | Missing | **Created** (GET + POST) |

---

## 4. Required Migration

```sql
-- Add client_id FK to leads table (same pattern as quotes.client_id)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_leads_client_id ON leads(client_id);
```

This replaces the three wrong columns (`client_email`, `client_phone`, `client_address`) from the previous migration recommendation with ONE correct FK column.

---

## 5. Files Changed

### 5a. `src/lib/workspace-data.ts` — Data layer reconciliation
- `LeadRow`: `client_email/phone/address` → `client_id: string | null`
- `CreateLeadInput`: same replacement
- `createLead()`: 3-field spread → single `client_id` spread
- `updateLead()`: 3 if-checks → 1 `client_id` if-check
- `getLeads()` Prisma fallback: 3 contact mappings → `client_id` mapping
- **Added:** `ClientRow` type (16 fields matching Supabase-native `clients` table)
- **Added:** `CreateClientInput` type (name + optional email/phone/address_line_1/city/postcode/company_name)
- **Added:** `getClients(resolved)` — list active clients, sorted by name
- **Added:** `getClientById(resolved, clientId)` — single client by ID + business_id
- **Added:** `createClient(resolved, input)` — insert into clients table

### 5b. `src/app/api/workspace/leads/route.ts` — API reconciliation
- POST: `client_email/phone/address` → `client_id`
- PATCH: 3 contact field if-checks → 1 `client_id` if-check

### 5c. `src/app/api/workspace/clients/route.ts` — NEW
- GET: list clients (workspace auth, business_id scoped, active only)
- POST: create client (requires name, optional email/phone/address_line_1/city/postcode/company_name)

### 5d. `src/app/(member)/app/leads/page.tsx` — UI reconciliation
- `Lead` type: `client_id` replaces 3 contact fields
- **Added:** `ClientInfo` type for client lookup
- `LeadFormData`: `client_name/client_email/client_phone/client_address` (form fields that create a client record)
- **Added:** `clientsMap` state (Map<id, ClientInfo>)
- `fetchLeads()`: also fetches `/api/workspace/clients`, builds clientsMap
- **Added:** `resolveClientId()` — creates client record from form fields, returns id
- `handleCreate()`: calls resolveClientId() → passes client_id to lead creation
- `openEditPanel()`: populates form fields from clientsMap lookup by lead.client_id
- `handleUpdate()`: calls resolveClientId() → passes client_id to lead update
- Form JSX: added "Client name" field, kept email/phone/address fields

### 5e. `src/app/(member)/app/leads/[id]/page.tsx` — Lead detail reconciliation
- `Lead` type: `client_id` replaces 3 contact fields
- **Added:** `ClientInfo` type + `client` state
- `fetchData()`: fetches clients when lead has client_id, stores linked client
- Client contact section: reads from fetched `client` object, not lead fields
- Shows client name, email, phone, address from the `clients` table

---

## 6. Design Decisions

1. **`clients` table = canonical contact source of truth.** Proven by production schema (DATABASE_SCHEMA.sql) and quotes.client_id FK.
2. **leads.client_id = nullable FK → clients.** Same pattern as quotes.client_id, but nullable since early-stage leads may not have a client yet.
3. **Form fields transparently create client records.** The user fills in "Client name", "Email", "Phone", "Address" on the lead form. These create a `clients` row and link it via `client_id`.
4. **Existing `/api/clients` route is SEPARATE from `/api/workspace/clients`.** Different auth patterns (Prisma userId vs workspace business_id). Both remain valid for their respective contexts.
5. **General Tool edit mode is UNAFFECTED.** Only touches `tool_attachments`, independent of contact schema.

---

## 7. What Remains

| Item | Status |
|------|--------|
| Run migration SQL in Supabase | Pending (one ALTER TABLE + INDEX) |
| Lead → Job conversion with client_id | Works — job creation doesn't touch contact fields |
| Client update flow (edit existing linked client) | Creates new client on each edit — dedup/update refinement can come later |
| Client picker/search UI | Future enhancement — current inline creation works |
