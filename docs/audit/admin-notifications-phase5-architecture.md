# TISSCA Admin Notifications — Phase 5 Architecture
## Enterprise Operational Workflow Infrastructure

**Date:** 30 May 2026  
**Scope:** Architecture audit, DB schema additions, workflow design, security analysis, phased rollout strategy.  
**Method:** Proof-based audit of existing codebase. Additive only. Zero destructive migrations.  
**Build state entering Phase 5:** 172/172 ✓ exit 0

---

## EXECUTIVE SUMMARY

TISSCA is transitioning from a read-only notification inbox to an enterprise operational workflow infrastructure. This document defines the complete architecture for Phase 5: staff assignment, operational state machine, My Workbench, private notes, escalation, audit trail, and multi-workspace isolation.

**Nothing in Phase 5 breaks the existing system.** Every addition is schema-additive, API-additive, and UI-additive. All existing Phase 1–4 behaviour is preserved unchanged.

---

## PART 1 — EXISTING SYSTEM AUDIT

### 1.1 Database Schema (Verified)

#### `public.platform_events` — CONFIRMED SOLID
- Append-only event log. Service-role writes only.
- `module` CHECK: `feedback | crm | invoices | quotes | planner | chat | sync | subscription | admin | release | ai | accountant`
- `severity` CHECK: `info | low | medium | high | critical`
- `source` CHECK: `system | webhook | api | cron | user_action`
- `idempotency_key` UNIQUE — dedup on retry confirmed working
- RLS: enabled, no client SELECT policy — staff reads are API-mediated only ✅
- Columns for Phase 5 reuse: `workspace_id`, `user_id`, `actor_staff_id`, `entity_type`, `entity_id`, `metadata`

#### `public.admin_notifications` — FOUNDATION GOOD, NEEDS STATUS COLUMN
- Per-staff fan-out inbox
- **Already has schema stubs for Phase 5:** `assigned_to`, `assigned_at`, `handled_by`, `handled_at`, `escalated`, `escalated_at`, `escalation_reason`
- **Missing:** `workflow_status` column (the core operational state machine)
- **Missing:** `claimed_at` timestamp
- RLS: `staff_see_own_notifications` SELECT policy by `staff_user_id = auth.uid()` ✅
- RLS: `staff_update_own_notifications` UPDATE policy ✅
- **Gap:** No superadmin override policy for cross-staff visibility

#### `public.tissca_staff` — VERIFIED WORKING
- Columns: `user_id`, `role`, `is_active`
- Current roles in use: `superadmin`, `admin`, `engineer`, `accountant`
- `support` role is **mentioned in UI placeholder** (`"e.g. admin, support, ops"`) but has no DB CHECK constraint — any string is accepted
- **No VALID_ROLES constraint exists server-side** in the PATCH route — role is stored verbatim. This is a gap.
- Staff editor at `/admin/users` is a **free-text input** — role can be misspelled. Audit finding: **low risk currently, medium risk at scale**.

### 1.2 API Surface (Verified)

| Endpoint | Method | Auth | Description | Phase 5 status |
|---|---|---|---|---|
| `GET /api/admin/notifications` | GET | Staff Bearer | List inbox | ✅ KEEP UNCHANGED |
| `GET /api/admin/notifications/count` | GET | Staff Bearer | Bell count | ✅ KEEP UNCHANGED |
| `PATCH /api/admin/notifications/:id/read` | PATCH | Staff Bearer | Mark read | ✅ KEEP UNCHANGED |
| `PATCH /api/admin/notifications/:id/dismiss` | PATCH | Staff Bearer | Dismiss | ✅ KEEP UNCHANGED |
| `PATCH /api/admin/notifications/read-all` | PATCH | Staff Bearer | Mark all read | ✅ KEEP UNCHANGED |

**New routes needed for Phase 5** (additive):

| Endpoint | Method | Description |
|---|---|---|
| `PATCH /api/admin/notifications/:id/claim` | PATCH | Claim ownership |
| `PATCH /api/admin/notifications/:id/assign` | PATCH | Reassign (superadmin only) |
| `PATCH /api/admin/notifications/:id/status` | PATCH | Change workflow_status |
| `PATCH /api/admin/notifications/:id/escalate` | PATCH | Escalate with reason |
| `PATCH /api/admin/notifications/:id/resolve` | PATCH | Resolve |
| `PATCH /api/admin/notifications/:id/reopen` | PATCH | Reopen |
| `POST /api/admin/notifications/:id/notes` | POST | Add private note |
| `GET /api/admin/notifications/:id/notes` | GET | Get private notes (owner + superadmin) |
| `GET /api/admin/notifications/:id/activity` | GET | Audit timeline |
| `GET /api/admin/workbench` | GET | My Workbench queue |

### 1.3 Auth / Role Model (Verified)

```
requireStaff() in _auth.ts:
  → supabase.auth.getUser(Bearer token)        [proof-based]
  → tissca_staff WHERE user_id = ? AND is_active = true
  → returns { userId, staffRole }
```

- `staffRole` is currently used in `_auth.ts` but **not enforced** in notification action routes — any active staff can mark-read, dismiss, etc. regardless of role.
- Phase 5 must add role checks to new operational routes.
- `superadmin` must be able to override assignment and view cross-staff notes.

### 1.4 Staff Role Findings

#### Finding A: No DB-level role CHECK constraint on `tissca_staff.role`
- **Impact:** Free-text role can be misspelled (`"Superadmin"` vs `"superadmin"`).
- **Recommendation:** Add a DB CHECK constraint as part of Phase 5 schema migration. Safe additive change.
- **Valid roles to constrain to:** `superadmin | admin | engineer | accountant | support`

#### Finding B: `support` role exists in UI placeholder but nowhere else
- Not in `fanOutAdminNotifications` role sets
- Not in `requirePlatformStaffRole` calls
- Not in any fan-out target for subscription/invoice notifications
- **Recommendation:** Formally define `support` role in Phase 5 as the tier that handles customer-facing issues. Add fan-out targets for feedback notifications to include `support`.

#### Finding C: Staff editor uses free-text input — no dropdown
- **Risk:** Low for current team. Medium at scale.
- **Recommendation:** Phase 5 should convert the staff role field to a `<select>` in the users page editor.

#### Finding D: No `display_name` on `tissca_staff`
- The workbench and global inbox need to show "Being handled by [name]".
- Currently the only join path is `tissca_staff.user_id → auth.users → user_profiles.full_name`.
- **Recommendation:** Phase 5 API routes should join `user_profiles` for display names on `assigned_to` lookups.

### 1.5 Multi-Workspace Readiness

- `platform_events.workspace_id` exists ✅
- `admin_notifications` does NOT have a `workspace_id` column — it inherits from the joined `platform_events` event
- `tissca_staff` has no `workspace_id` column — staff are currently global platform staff, not per-workspace
- **Finding:** Current model is single-tenant platform staff with workspace context on events only. Multi-workspace staff segmentation (Phase 5+) requires `tissca_staff_workspace_permissions` or similar junction table.
- **Safe now:** Filter by `platform_events.workspace_id` at query time in API routes. The joined select already returns `workspace_id` via `platform_events`.

---

## PART 2 — OPERATIONAL STATE MACHINE

### 2.1 Workflow Status Values

```
NEW            — Arrived, unread, unclaimed
INVESTIGATING  — Claimed by a staff member; actively working
WAITING_USER   — Blocked; waiting for user response
WAITING_ENGINEER — Blocked; waiting for engineering action
WAITING_ACCOUNTANT — Blocked; waiting for billing/finance action
ESCALATED      — Transferred to higher/different role
RESOLVED       — Issue handled and closed
DISMISSED      — Noise; irrelevant; no action needed
REOPENED       — Was resolved, new information arrived
```

### 2.2 State Transition Rules

```
NEW → INVESTIGATING      (via: claim)
NEW → DISMISSED          (via: dismiss — existing)
NEW → ESCALATED          (via: escalate — with required reason)

INVESTIGATING → WAITING_*       (via: status update)
INVESTIGATING → ESCALATED       (via: escalate)
INVESTIGATING → RESOLVED        (via: resolve)
INVESTIGATING → DISMISSED       (via: dismiss)

WAITING_* → INVESTIGATING       (via: status update — back to active)
WAITING_* → ESCALATED           (via: escalate)
WAITING_* → RESOLVED            (via: resolve)

ESCALATED → INVESTIGATING       (via: claim — by escalation target)
ESCALATED → RESOLVED            (via: resolve)

RESOLVED → REOPENED             (via: reopen)

REOPENED → INVESTIGATING        (via: claim)
REOPENED → RESOLVED             (via: resolve)
```

### 2.3 Terminal States

`DISMISSED` and `RESOLVED` are soft-terminal — the row stays forever. `REOPENED` can always exit terminal.

**Rule:** Status changes are only persisted to `notification_activity` (audit trail). The `admin_notifications.workflow_status` column is the current state. History is in `notification_activity`.

### 2.4 Ownership Rules

```
assigned_to = null:
  → Any permitted staff may claim
  → UI shows: "Unclaimed — available"

assigned_to = X:
  → Only X may take action (mark read, change status, add notes, resolve)
  → Other staff see: "Being handled by [X name]"
  → Superadmin may reassign at any time
  → X may explicitly reassign to another staff member

Claim = atomic operation:
  UPDATE admin_notifications
  SET assigned_to = caller_id,
      claimed_at = now(),
      workflow_status = 'INVESTIGATING'
  WHERE id = ? AND (assigned_to IS NULL OR assigned_to = caller_id)
  RETURNING id
```

The `WHERE assigned_to IS NULL OR assigned_to = caller_id` guard prevents double-claiming. If 0 rows are updated, the claim was lost to another staff member and a 409 Conflict is returned.

---

## PART 3 — DB SCHEMA ADDITIONS

All additions are strictly additive. No existing columns are modified. No existing constraints are dropped.

### 3.1 `admin_notifications` — Add `workflow_status` and `claimed_at`

```sql
-- Phase 5 Migration: admin_notifications additions
-- Idempotent. Run in Supabase SQL Editor.

-- Add workflow_status column
DO $$ BEGIN
  ALTER TABLE public.admin_notifications
    ADD COLUMN workflow_status text NOT NULL DEFAULT 'NEW';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Add CHECK constraint on workflow_status
DO $$ BEGIN
  ALTER TABLE public.admin_notifications
    ADD CONSTRAINT admin_notif_workflow_status_check
    CHECK (workflow_status IN (
      'NEW', 'INVESTIGATING', 'WAITING_USER', 'WAITING_ENGINEER',
      'WAITING_ACCOUNTANT', 'ESCALATED', 'RESOLVED', 'DISMISSED', 'REOPENED'
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add claimed_at (nullable — only set when first claimed)
DO $$ BEGIN
  ALTER TABLE public.admin_notifications
    ADD COLUMN claimed_at timestamptz;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Index: My Workbench query (assigned_to + workflow_status)
CREATE INDEX IF NOT EXISTS idx_admin_notif_workbench
  ON public.admin_notifications (assigned_to, workflow_status)
  WHERE assigned_to IS NOT NULL;

-- Index: Global inbox status filter
CREATE INDEX IF NOT EXISTS idx_admin_notif_status
  ON public.admin_notifications (workflow_status, created_at DESC);
```

### 3.2 `tissca_staff` — Add Role CHECK Constraint

```sql
-- Phase 5 Migration: formalize tissca_staff roles
DO $$ BEGIN
  ALTER TABLE public.tissca_staff
    ADD CONSTRAINT tissca_staff_role_check
    CHECK (role IN ('superadmin', 'admin', 'engineer', 'accountant', 'support'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

**IMPORTANT:** Run `SELECT DISTINCT role FROM public.tissca_staff;` BEFORE applying this migration. If any row has a non-conforming role value (e.g. `"Superadmin"` or `"ops"`), the constraint will fail. Remediate those rows first.

### 3.3 New Table: `notification_activity` — Immutable Audit Trail

```sql
-- Phase 5 Migration: notification_activity table
-- Append-only. Never UPDATE or DELETE rows.

CREATE TABLE IF NOT EXISTS public.notification_activity (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source notification
  notification_id uuid        NOT NULL REFERENCES public.admin_notifications(id) ON DELETE CASCADE,

  -- Actor
  actor_id        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Action type
  action          text        NOT NULL,
  -- e.g: CREATED | VIEWED | CLAIMED | ASSIGNED | STATUS_CHANGED | ESCALATED
  --      NOTE_ADDED | RESOLVED | DISMISSED | REOPENED | REASSIGNED

  -- Payload
  from_status     text,       -- previous workflow_status (for STATUS_CHANGED)
  to_status       text,       -- new workflow_status
  from_assignee   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  to_assignee     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  note_preview    text,       -- first 200 chars of note if action = NOTE_ADDED
  reason          text,       -- escalation reason, resolution note, etc.
  metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb,

  -- Timestamp
  occurred_at     timestamptz NOT NULL DEFAULT now()
);

-- CHECK constraint on action
DO $$ BEGIN
  ALTER TABLE public.notification_activity
    ADD CONSTRAINT notif_activity_action_check
    CHECK (action IN (
      'CREATED', 'VIEWED', 'CLAIMED', 'ASSIGNED', 'REASSIGNED',
      'STATUS_CHANGED', 'ESCALATED', 'NOTE_ADDED', 'RESOLVED',
      'DISMISSED', 'REOPENED', 'READ', 'READ_ALL'
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notif_activity_notification_id
  ON public.notification_activity (notification_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_notif_activity_actor_id
  ON public.notification_activity (actor_id)
  WHERE actor_id IS NOT NULL;

-- RLS: staff can read activity for notifications they own or are assigned to
-- Superadmin can read all activity (enforced server-side via service-role)
ALTER TABLE public.notification_activity ENABLE ROW LEVEL SECURITY;

-- Service-role inserts only. No client-side write policy.
-- Read policy: staff see activity for their own notifications
DO $$ BEGIN
  CREATE POLICY "staff_see_own_activity"
    ON public.notification_activity
    FOR SELECT
    USING (
      notification_id IN (
        SELECT id FROM public.admin_notifications
        WHERE staff_user_id = auth.uid()
           OR assigned_to   = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

### 3.4 New Table: `notification_notes` — Private Staff Notes

```sql
-- Phase 5 Migration: notification_notes table
-- Private operational notes. Only visible to author + superadmin (enforced server-side).

CREATE TABLE IF NOT EXISTS public.notification_notes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source notification
  notification_id uuid        NOT NULL REFERENCES public.admin_notifications(id) ON DELETE CASCADE,

  -- Author
  author_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Content
  body            text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 10000),

  -- Note type (for future filtering)
  note_type       text        NOT NULL DEFAULT 'investigation',
  -- Values: investigation | escalation | resolution | internal

  -- Soft-delete (never hard-delete)
  is_deleted      boolean     NOT NULL DEFAULT false,
  deleted_at      timestamptz,

  -- Timestamps
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- CHECK on note_type
DO $$ BEGIN
  ALTER TABLE public.notification_notes
    ADD CONSTRAINT notif_notes_type_check
    CHECK (note_type IN ('investigation', 'escalation', 'resolution', 'internal'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notif_notes_notification_id
  ON public.notification_notes (notification_id, created_at DESC)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_notif_notes_author_id
  ON public.notification_notes (author_id);

-- RLS: CRITICAL — private notes protection
ALTER TABLE public.notification_notes ENABLE ROW LEVEL SECURITY;

-- SELECT: author sees their own notes
-- Superadmin read-all is enforced server-side using service-role client (bypasses RLS)
DO $$ BEGIN
  CREATE POLICY "note_author_can_read"
    ON public.notification_notes
    FOR SELECT
    USING (author_id = auth.uid() AND is_deleted = false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- INSERT: authenticated staff only (validated server-side; policy is defence-in-depth)
DO $$ BEGIN
  CREATE POLICY "staff_can_insert_notes"
    ON public.notification_notes
    FOR INSERT
    WITH CHECK (author_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- UPDATE: author can soft-delete their own notes
DO $$ BEGIN
  CREATE POLICY "author_can_update_own_notes"
    ON public.notification_notes
    FOR UPDATE
    USING (author_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

**SECURITY NOTE:** The `note_author_can_read` policy means a superadmin using the **client-side** Supabase session can only see their own notes. The superadmin's ability to read all notes must be served through the **service-role API route** (`/api/admin/notifications/:id/notes`), which bypasses RLS. This is intentional and correct.

---

## PART 4 — COMPLETE SECURITY ANALYSIS

### 4.1 Authentication Model (Unchanged)

All `/api/admin/*` routes use `requireStaff()`:
```
Bearer token → supabase.auth.getUser() → tissca_staff.is_active = true
```
Fail-closed: any DB error returns 500, never grants access.

### 4.2 Authorization Matrix for New Routes

| Route | Who can call | Guard |
|---|---|---|
| `PATCH /claim` | Any active staff | `assigned_to IS NULL` (atomic) |
| `PATCH /assign` | Superadmin only | `staffRole === 'superadmin'` server-side |
| `PATCH /status` | Assigned staff or superadmin | `assigned_to = caller OR role = superadmin` |
| `PATCH /escalate` | Assigned staff or superadmin | Same + requires reason text |
| `PATCH /resolve` | Assigned staff or superadmin | Same |
| `PATCH /reopen` | Any active staff (alerts team) | No restriction |
| `POST /notes` | Assigned staff or superadmin | `assigned_to = caller OR role = superadmin` |
| `GET /notes` | Author OR superadmin | service-role query with explicit filter |
| `GET /activity` | Owner, assigned, or superadmin | service-role query with explicit filter |
| `GET /workbench` | Any active staff | Only returns rows where `assigned_to = caller` |

### 4.3 Private Notes Leakage Prevention

Three-layer defence:
1. **RLS policy:** `author_id = auth.uid()` on client-side reads
2. **API route:** service-role client, explicit `WHERE author_id = ? OR superadmin_flag`
3. **No client-direct DB access:** all note reads go through `/api/admin/notifications/:id/notes`

The GET notes route must:
```typescript
if (staffRole === 'superadmin') {
  // return all non-deleted notes for this notification
  .eq('notification_id', notifId).eq('is_deleted', false)
} else {
  // return only caller's notes
  .eq('notification_id', notifId).eq('author_id', userId).eq('is_deleted', false)
}
```

### 4.4 Assignment Security

- `assigned_to` is ALWAYS set server-side from the validated Bearer token user ID
- The claim route NEVER trusts a `userId` from the request body for `assigned_to`
- The assign route (superadmin) accepts a `targetUserId` but validates it is an active staff member before writing
- Atomic claim prevents TOCTOU race:
  ```sql
  UPDATE admin_notifications
  SET assigned_to = $caller_id, claimed_at = now(), workflow_status = 'INVESTIGATING'
  WHERE id = $notif_id AND (assigned_to IS NULL OR assigned_to = $caller_id)
  ```

### 4.5 Multi-Workspace Isolation

- Workbench query: `WHERE assigned_to = userId` — already scoped to caller
- Global inbox: `WHERE staff_user_id = userId` — already scoped to caller
- Notes and activity: scoped by `notification_id`, which chains back to `admin_notifications.staff_user_id`
- For future multi-workspace staff: add `workspace_ids text[]` to `tissca_staff` and filter `platform_events.workspace_id IN (staff_workspace_ids)` at query time
- **No cross-workspace data leakage is possible with the current schema** — the fan-out step already limits which staff receive which notification

### 4.6 Audit Trail Immutability

- `notification_activity` rows are INSERT-only via service-role
- No RLS UPDATE policy on `notification_activity`
- Application code must never call UPDATE/DELETE on this table
- Even superadmin cannot delete activity rows through the API

---

## PART 5 — MY WORKBENCH ARCHITECTURE

### 5.1 Data Model

The Workbench is a **filtered view** of `admin_notifications` plus `notification_notes`. No new table required.

```
My Workbench = admin_notifications WHERE assigned_to = current_user

Sections:
  "Assigned to me"     → assigned_to = me, workflow_status IN ('INVESTIGATING', 'WAITING_*', 'REOPENED')
  "Escalated to me"    → escalated = true, assigned_to = me
  "Resolved by me"     → handled_by = me, workflow_status = 'RESOLVED' — last 30 days
  "My notes"           → notification_notes WHERE author_id = me
```

### 5.2 Route: `GET /api/admin/workbench`

```typescript
// Returns the calling staff member's workbench grouped by section
{
  assigned: AdminNotification[];      // active items
  escalated: AdminNotification[];     // escalated active items
  resolved_recent: AdminNotification[]; // last 30 days
  notes_count: number;                // total private notes authored
}
```

Performance: all queries are indexed on `(assigned_to, workflow_status)` via `idx_admin_notif_workbench`.

### 5.3 Page Route: `/admin/workbench`

New page. Does NOT replace `/admin/notifications`. The global inbox and personal workbench coexist.

```
/admin/notifications   → Global operational inbox (all staff, all unresolved)
/admin/workbench       → Personal queue (my assigned items + my notes)
```

### 5.4 AdminShell Sidebar Change

Add "Workbench" nav item with a badge showing count of active assigned items.

---

## PART 6 — ESCALATION STRATEGY

### 6.1 Manual Escalation Flow

```
Staff member hits "Escalate" button
→ Modal opens requiring:
    1. Escalation reason (required, min 20 chars)
    2. Escalate to role: [engineer | accountant | superadmin]
→ On submit:
    PATCH /api/admin/notifications/:id/escalate
    body: { reason, escalate_to_role }

Server:
    1. Validates caller is current assigned_to or superadmin
    2. Sets escalated = true, escalated_at = now(), escalation_reason = reason
    3. Sets workflow_status = 'ESCALATED'
    4. Creates new admin_notifications rows for all active staff with the target role
       (fan-out to escalation target — new inbox rows)
    5. Appends notification_activity row: action = 'ESCALATED'
    6. Does NOT remove the original assignee's notification row
```

### 6.2 Escalation Fan-Out

When escalating to a role, the same `fanOutAdminNotifications(eventId, [targetRole])` mechanism is reused. This creates new `admin_notifications` rows for target-role staff. They receive it in their inbox as a NEW item, linked to the same `platform_events` event.

**This means:** one `platform_events` event can have multiple `admin_notifications` rows for different staff at different stages. The `notification_activity` table tracks the escalation chain.

### 6.3 Auto-Escalation (Design Only — NOT Implemented This Phase)

Requires a cron job (Vercel Cron or pg_cron). Architecture:

```
cron: runs every 15 minutes
→ SELECT all admin_notifications WHERE
    workflow_status = 'NEW'
    AND is_read = false
    AND created_at < now() - INTERVAL

Thresholds by severity:
  critical:  1 hour  → escalate to superadmin
  high:      4 hours → escalate to admin
  medium:    24 hours → digest (no immediate escalation)
  low/info:  48 hours → digest

Action: call fanOutAdminNotifications for superadmin/admin roles with a generated
platform_event of type 'admin.auto_escalation' module='admin' severity='high'
linking back to the original event via metadata.original_event_id.
```

**Implementation gate:** Do not implement until a Vercel Cron endpoint is established and tested in a non-production environment first.

---

## PART 7 — GLOBAL INBOX VS WORKBENCH VISIBILITY RULES

### What Everyone Can See (Global Inbox)

```
admin_notifications joined with platform_events:
  - Title, body, module, severity
  - workflow_status (e.g. "Being handled by X")
  - assigned_to display name (via user_profiles join)
  - escalated state
  - timestamps
  - source
```

### What Only Assigned Staff + Superadmin Can See

```
notification_notes (private):
  - Investigation notes
  - Draft troubleshooting
  - Internal discussion
  - Partial work

notification_activity detail:
  - Full escalation reason text
  - Resolution notes
```

### Global Inbox Claim Lock UI

When `assigned_to IS NOT NULL`:
```
[🔒 Being investigated by Jane Smith · since 2h ago]
[Reassign — superadmin only]    [View details →]
```

When `assigned_to IS NULL`:
```
[Unclaimed — available]
[Claim this issue]
```

---

## PART 8 — DUPLICATE WORK PREVENTION

### Atomic Claim (Server-Side)

The claim operation uses a conditional UPDATE that returns the updated row count:

```typescript
const { count } = await supabase
  .from('admin_notifications')
  .update({ assigned_to: userId, claimed_at: now, workflow_status: 'INVESTIGATING' })
  .eq('id', notifId)
  .is('assigned_to', null);   // OR .or(`assigned_to.is.null,assigned_to.eq.${userId}`)

if (!count || count === 0) {
  return NextResponse.json({ error: 'Already claimed by another staff member' }, { status: 409 });
}
```

### UI State

The notifications page receives `assigned_to` data from the list API. If `assigned_to !== null && assigned_to !== currentUser`:
- Claim button is **hidden**
- Status shows "Being handled by [name]"
- Actions (status change, resolve, dismiss) are **disabled**

This UI state is **advisory** — the authoritative check is the server-side atomic operation.

---

## PART 9 — ACTIVITY TIMELINE DESIGN

### Timeline Events (stored in `notification_activity`)

```
🔔 CREATED       — Notification arrived in system
👁 VIEWED        — Staff member opened detail drawer
✋ CLAIMED        — [Name] claimed this issue
🔄 STATUS_CHANGED — Status changed from X to Y
📝 NOTE_ADDED     — Investigation note added (first 200 chars shown)
⬆ ESCALATED      — Escalated to [role]: "[reason]"
↩ REASSIGNED      — Reassigned from [A] to [B]
✅ RESOLVED       — Resolved by [Name]: "[resolution note]"
🚫 DISMISSED      — Dismissed by [Name]
🔁 REOPENED       — Reopened by [Name]
```

### Activity Timeline UI (inside Detail Drawer)

The existing detail drawer gets an "Activity" tab alongside "Details" and "Notes":

```
Activity tab (in drawer):
  [vertical timeline, newest first]
  ✅ Resolved · Jane Smith · 3 min ago
  📝 Note added · Jane Smith · 1h ago
  ✋ Claimed · Jane Smith · 1h 5m ago
  🔔 Created · System · 1h 7m ago
```

---

## PART 10 — EMAIL DIGEST DESIGN (Design Only)

### Digest Triggers

| Severity | Trigger | Recipient |
|---|---|---|
| critical | Unresolved > 1h | superadmin |
| high | Daily 09:00 | admin, superadmin |
| medium/low | Weekly Monday 09:00 | superadmin |
| Escalated | Immediately | target role + superadmin |
| Resolved today | Daily 18:00 | assigned staff |

### Digest Content

```
Subject: [TISSCA Ops] 3 unresolved critical alerts · 30 May 2026

  CRITICAL (3)
  ├── subscription.payment_failed · workspace "Acme Ltd" · 2h unresolved
  ├── subscription.payment_failed · workspace "Globe Inc" · 4h unresolved
  └── subscription.cancelled · workspace "TechStart" · 1h 30m unresolved

  HIGH (1)
  └── feedback.new (blocked user) · 5h unresolved

  [View in TISSCA ops →]
```

### Implementation Gate

Do NOT implement email digests until:
1. A scheduled function mechanism is chosen (Vercel Cron)
2. The existing `email-intelligence` module is audited for reuse
3. Digest opt-out per staff member is designed

---

## PART 11 — REALTIME STRATEGY

### Events That Deserve Realtime

| Event | Mechanism |
|---|---|
| New critical alert | Supabase Realtime NOTIFY on `admin_notifications` INSERT where severity=critical |
| Direct assignment (claim) | Supabase Realtime channel per staff user |
| Escalation received | Same per-user channel |

### Events That Do NOT Need Realtime

| Event | Why |
|---|---|
| new medium/low/info | 30s polling acceptable |
| read/dismiss | Local state update suffices |
| status change | Polling acceptable |

### Safe Realtime Implementation Rules

```
1. Always scope Realtime channel to: staff_user_id = current user
   (Never subscribe to all admin_notifications rows — no cross-staff leakage)

2. Use Postgres Changes: table=admin_notifications, filter=staff_user_id=eq.{userId}

3. On new row received via Realtime:
   - If severity = critical: show toast immediately
   - If direct assignment: show toast + workbench badge update
   - Otherwise: refresh count only (no toast)

4. Do NOT implement broad table-level Realtime subscriptions
```

---

## PART 12 — NOTIFICATION GROUPING STRATEGY (Design Only)

### Grouping Rules

```
Group when:
  Same module + same event_type + same workspace_id + occurred within 30 min window

Example groups:
  "12 feedback submissions in the last 30 minutes" (feedback.new)
  "3 payment failures for workspace X" (subscription.payment_failed)
  "5 login issues reported" (feedback.new with section=auth)

Do NOT group:
  Critical alerts (always individual)
  Subscription cancellations (always individual)
  Cross-workspace events (never group across workspaces)
```

### Implementation Gate

Grouping requires a `notification_groups` table or a `group_id` column on `admin_notifications`. Design only this phase. Implement only after Phase 5 core workflow is stable.

---

## PART 13 — PHASED ROLLOUT STRATEGY

### Phase 5A — Schema + Core Workflow (Priority 1)

**DB Changes:** (run in order, verify rollback safe)
1. `admin_notifications` — add `workflow_status` + `claimed_at` + indexes
2. `tissca_staff` — add role CHECK constraint (after role audit)
3. `notification_activity` — new table
4. `notification_notes` — new table

**API Changes (additive):**
5. `PATCH /api/admin/notifications/:id/claim`
6. `PATCH /api/admin/notifications/:id/status`
7. `PATCH /api/admin/notifications/:id/resolve`
8. `PATCH /api/admin/notifications/:id/reopen`
9. Record `notification_activity` rows in existing mark-read + dismiss routes (additive)

**UI Changes:**
10. Claim button on notification card (when `assigned_to = null`)
11. "Being handled by X" state (when `assigned_to != null`)
12. Status badge on cards
13. Resolve button in detail drawer

**Verification:** `npm run build` → 172+/172 ✓

---

### Phase 5B — Private Notes + Activity Timeline (Priority 2)

**API Changes:**
14. `POST /api/admin/notifications/:id/notes`
15. `GET /api/admin/notifications/:id/notes`
16. `GET /api/admin/notifications/:id/activity`

**UI Changes:**
17. Notes panel in detail drawer (private, owner + superadmin only)
18. Activity timeline tab in detail drawer
19. Note count indicator on workbench items

**Verification:** Build + manual test note privacy (confirm non-author cannot read)

---

### Phase 5C — Escalation + Superadmin Override (Priority 3)

**API Changes:**
20. `PATCH /api/admin/notifications/:id/escalate`
21. `PATCH /api/admin/notifications/:id/assign` (superadmin only)

**UI Changes:**
22. Escalate button (with modal for reason + target role)
23. Superadmin reassign control
24. Escalation reason visible in activity timeline

**Verification:** Build + test escalation fan-out to target role staff

---

### Phase 5D — My Workbench (Priority 4)

**API Changes:**
25. `GET /api/admin/workbench`

**UI Changes:**
26. `/admin/workbench` page
27. Sidebar nav item + badge count
28. Workbench sections: Assigned, Escalated, Resolved (recent), Notes

**Verification:** Build + confirm workbench only shows caller's items

---

### Phase 5E — Staff Role Editor Hardening (Priority 5)

**UI Changes:**
29. Convert staff role field from free-text input to `<select>` with valid options
30. Add role description tooltip per role

**API Changes (additive):**
31. Server-side VALID_ROLES validation in `PATCH /api/admin/users/:id`

**Verification:** Build + confirm invalid role rejected with 400

---

### Future Phases (Not Phase 5)

| Phase | Scope |
|---|---|
| Phase 6 | Email digests (Vercel Cron + email-intelligence module) |
| Phase 7 | Supabase Realtime for critical alerts and direct assignments |
| Phase 8 | Notification grouping |
| Phase 9 | Auto-escalation cron |
| Phase 10 | Multi-workspace staff segmentation (`tissca_staff_workspace_permissions`) |
| Phase 11 | Mobile push (APNs/FCM via Expo or platform-specific) |
| Phase 12 | AI clustering + priority scoring |

---

## PART 14 — SCHEMA MIGRATION FILE CHECKLIST

Before running migrations:
- [ ] `SELECT DISTINCT role FROM public.tissca_staff;` — verify all values are in allowlist
- [ ] Confirm `admin_notifications` has no rows with `workflow_status` column already (should not exist)
- [ ] Run in Supabase SQL Editor, not via any ORM migration runner
- [ ] Verify each migration block completes without error before proceeding to next

Migration file to create: `scripts/migrate-admin-notifications-phase5a.sql`

---

## PART 15 — FILES TO CREATE/MODIFY (Phase 5A)

### New files:
```
scripts/migrate-admin-notifications-phase5a.sql   — DB migration
src/app/api/admin/notifications/[id]/claim/route.ts
src/app/api/admin/notifications/[id]/status/route.ts
src/app/api/admin/notifications/[id]/resolve/route.ts
src/app/api/admin/notifications/[id]/reopen/route.ts
src/app/api/admin/workbench/route.ts              — Phase 5D
src/app/(admin)/admin/workbench/page.tsx          — Phase 5D
```

### Modified files (additive only):
```
src/app/(admin)/admin/notifications/page.tsx      — Add claim button, status badge, owner display
src/app/api/admin/notifications/[id]/read/route.ts  — Record activity (non-fatal)
src/app/api/admin/notifications/[id]/dismiss/route.ts — Record activity (non-fatal)
src/components/AdminShell.tsx                      — Add workbench nav item (Phase 5D)
```

### DO NOT MODIFY:
```
src/lib/admin-notifications.ts                    — Core event emission unchanged
src/app/api/admin/notifications/route.ts          — Query already returns assigned_to
src/app/api/admin/notifications/count/route.ts    — Unchanged
scripts/migrate-admin-notifications-phase2.sql    — Existing migration, never modify
```

---

## PART 16 — REGRESSION VERIFICATION CHECKLIST

After each phase deployment:

- [ ] `npm run build` → must produce `✓ Generating static pages (N/172)` exit 0
- [ ] GET `/api/admin/notifications` → returns existing notifications with `assigned_to` (may be null)
- [ ] Bell badge polling → still works at 30s cadence
- [ ] Mark read → still decrements bell count and dispatches `admin-notif-count-changed`
- [ ] Dismiss → still removes from default inbox view
- [ ] Feedback notification → still creates platform_event + admin_notifications rows
- [ ] Invoice created notification → still emits
- [ ] Subscription payment_failed → still emits critical notification
- [ ] `workflow_status` defaults to `'NEW'` for all new and existing rows ✅ (DEFAULT clause)

---

## SUMMARY TABLE

| Area | Current State | Phase 5 Target | Effort |
|---|---|---|---|
| Workflow states | none (binary read/dismissed) | 9-state machine | 5A |
| Ownership / claim | `assigned_to` column exists, unused | Atomic claim with conflict detection | 5A |
| Audit trail | none | `notification_activity` table | 5A |
| Private notes | none | `notification_notes` table, author+superadmin only | 5B |
| Escalation | `escalated` boolean exists, unused | Manual escalation with fan-out | 5C |
| Workbench | none | `/admin/workbench` page | 5D |
| Role validation | free-text, no constraint | `<select>` + DB CHECK | 5E |
| Support role | undefined | Formally added to role allowlist + fan-out | 5E |
| Realtime | polling only | Critical + assignment only | Phase 7 |
| Email digests | none | Design done | Phase 6 |
| Auto-escalation | none | Architecture designed | Phase 9 |
| Grouping | none | Architecture designed | Phase 8 |
| Multi-workspace staff | global staff only | Architecture designed | Phase 10 |

---

*Document version: 1.0 · 30 May 2026 · TISSCA Phase 5 Architecture*
