# CRM Client Links Migration Report

**Date:** 2 April 2026  
**Scope:** Production-safe SQL migration for confirmed CRM client FK links  
**Build status:** ✅ PASS (zero errors)  
**Code verification:** ✅ ALL FILES CORRECT (no changes needed)

---

## 1. Final Canonical Relationship Model

```
clients ← leads             (via leads.client_id FK → clients.id, ON DELETE SET NULL)
clients ← jobs              (via jobs.client_id FK → clients.id, ON DELETE SET NULL)
leads   ← jobs              (via jobs.lead_id) [already present]
leads   ← tool_attachments  (via tool_attachments.lead_id)
jobs    ← tool_attachments  (via tool_attachments.job_id)
clients ← quotes            (via quotes.client_id) [already present]
clients ← invoices          (via invoices.client_id) [already present]
```

**Entity lifecycle:**
```
Tool Result → save as tool_attachment (lead_id)
            → Lead (client_id → clients)
            → Convert Lead → Job (lead_id + client_id propagated)
            → Job Detail (client contact from clients table)
```

---

## 2. SQL Migration File

**Path:** `supabase/sql/phase_f2_crm_client_links.sql`

**Contents:**
- `ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL`
- `CREATE INDEX IF NOT EXISTS idx_leads_client_id ON leads(client_id)`
- `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL`
- `CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON jobs(client_id)`

**Properties:**
- Idempotent (safe to run multiple times)
- No DROP, no ALTER COLUMN, no DELETE, no TRUNCATE
- Additive only — 2 columns, 2 indexes
- Nullable FKs with ON DELETE SET NULL

---

## 3. Files Changed (This Pass)

| File | Change |
|------|--------|
| `supabase/sql/phase_f2_crm_client_links.sql` | **CREATED** — production-safe migration |

No code changes were needed. All website code was already aligned from the previous schema truth pass.

---

## 4. Code Verification Results

Every file was verified against the final relationship model:

| File | Status | Details |
|------|--------|---------|
| `src/lib/workspace-data.ts` | ✅ CORRECT | LeadRow, JobRow, ClientRow types correct. createLead/createJob/updateLead/updateJob all handle client_id. getClients/getClientById/createClient functions present. |
| `src/app/api/workspace/leads/route.ts` | ✅ CORRECT | POST and PATCH pass client_id through. |
| `src/app/api/workspace/jobs/route.ts` | ✅ CORRECT | POST and PATCH pass client_id through. |
| `src/app/api/workspace/clients/route.ts` | ✅ CORRECT | GET lists clients, POST creates client. Workspace auth pattern. |
| `src/app/(member)/app/leads/page.tsx` | ✅ CORRECT | Fetches clients, resolveClientId() creates client records, handleConvertToJob() propagates client_id. Form has Client name/email/phone/address fields. |
| `src/app/(member)/app/leads/[id]/page.tsx` | ✅ CORRECT | Fetches client by client_id, displays from client object, handleConvertToJob() propagates client_id. |
| `src/app/(member)/app/jobs/page.tsx` | ✅ CORRECT | Job type includes client_id and lead_id. |

---

## 5. Next Recommended Implementation Steps

These are the logical next steps after running the migration. **None are implemented yet.**

### Step 1: Lead → Job Conversion Finalisation
- Ensure tool_attachments re-link from lead_id to job_id on conversion
- Status transition: lead → 'won', job → 'scheduled'
- Edge cases: converting a lead that already has a job

### Step 2: Job Detail Page
- Build `/app/jobs/[id]/page.tsx` (similar to leads/[id]/page.tsx)
- Fetch and display client contact from clients table via `job.client_id`
- Show linked lead info via `job.lead_id`
- Show tool attachments linked to the job

### Step 3: Add to Existing Lead / Add to Existing Job Hardening
- Tool attachment save flow: picker for existing leads/jobs
- Client picker/search on lead and job forms (instead of inline creation only)
- Client dedup logic (match by email within business)
