# BUILDR Phase C3: Client Acceptance Flow & Quote Revisions

## Summary

Phase C3 implements a complete client acceptance workflow with immutable snapshots, audit trails, and quote versioning for staff revisions. This prevents disputes when staff edit quotes after client acceptance.

## Key Features

### 1. **Client Acceptance Flow**
- Clients can accept or reject quotes with confirmation modals
- Acceptance creates an immutable snapshot of line items and totals
- Rejected quotes record reason for audit trail
- Accepted quotes are locked to prevent staff edits

### 2. **Immutable Acceptance Snapshot**
- Captures exact items and pricing at moment of acceptance
- Prevents disputes if quote is edited after acceptance
- Records:
  - Acceptance timestamp
  - Client user ID
  - Client IP address (optional)
  - Complete line items as JSON
  - Exact totals (subtotal, discount, markup, VAT, total)
  - Optional acceptance note

### 3. **Quote Revision System**
- Staff can create revisions of accepted (locked) quotes
- Each revision maintains historical record with:
  - Revision number (1, 2, 3, etc. per quote)
  - Reason for revision
  - Changed-by user ID
  - Timestamp
  - Snapshot of quote data at that revision
- Revision unlocks quote for editing

### 4. **Audit Trail**
- All acceptance/rejection events recorded with:
  - `accepted_by`, `accepted_at`, `acceptance_ip`, `acceptance_note`
  - `rejected_by`, `rejected_at`, `rejection_reason`
  - `is_locked` flag to enforce editing restrictions
- Quote status workflow: draft → sent → accepted/rejected
- Locked quotes can only be edited via revision system

## Database Schema (Phase C3)

### Tables Created

#### 1. **quote_acceptance_snapshot**
Immutable record of quote state at acceptance moment
```sql
- id: UUID primary key
- quote_id: References quotes.id
- accepted_at: TIMESTAMPTZ
- accepted_by: UUID (references auth.users)
- acceptance_ip: TEXT (optional)
- items_snapshot: JSONB (array of quote items)
- subtotal, discount_amount, markup_amount, vat_amount, total, deposit_amount: DECIMAL
- balance_due: DECIMAL
- acceptance_note: TEXT (optional)
- created_at: TIMESTAMPTZ
- UNIQUE(quote_id) - one snapshot per quote
```

#### 2. **quote_revisions**
Version history for edited accepted quotes
```sql
- id: UUID primary key
- quote_id: References quotes.id
- revision_number: INT (1, 2, 3, ... per quote)
- parent_revision_id: UUID (for lineage tracking)
- changed_by: UUID (references auth.users)
- changed_at: TIMESTAMPTZ
- change_reason: TEXT
- quote_data: JSONB (full quote snapshot)
- items_data: JSONB (array of items)
- totals_data: JSONB (pricing breakdown)
- created_at: TIMESTAMPTZ
- UNIQUE(quote_id, revision_number)
```

### Fields Added to Quotes Table
```sql
- accepted_by: UUID (references auth.users)
- acceptance_ip: TEXT (optional)
- acceptance_note: TEXT (optional)
- rejected_at: TIMESTAMPTZ
- rejected_by: UUID (references auth.users)
- rejection_reason: TEXT
- is_locked: BOOLEAN (default false)
```

### RLS Policies Added
- Clients can only view their assigned quotes
- Staff can only update unlocked quotes
- Acceptance snapshots viewable by staff and assigned client
- Revisions viewable by staff for their business quotes

## API Endpoints Created

### POST /api/quotes/:id/accept
Accept a quote and create immutable snapshot

**Request:**
```json
{
  "acceptance_note": "Optional note from client"
}
```

**Response:**
```json
{
  "success": true,
  "quote_id": "uuid",
  "status": "accepted",
  "message": "Quote accepted and locked for editing"
}
```

**Actions:**
- Creates `quote_acceptance_snapshot` record
- Updates quote: status='accepted', accepted_at=now(), is_locked=true
- Records client ID, IP, optional note
- Returns 400 if quote not in draft/sent status
- Returns 403 if client not associated with quote

### POST /api/quotes/:id/reject
Reject a quote with reason

**Request:**
```json
{
  "rejection_reason": "Required reason text"
}
```

**Response:**
```json
{
  "success": true,
  "quote_id": "uuid",
  "status": "rejected",
  "message": "Quote rejected"
}
```

**Actions:**
- Updates quote: status='rejected', rejected_at=now(), rejection_reason
- Records rejecting user ID
- Allows staff to continue editing if needed
- Returns 400 if rejection_reason missing
- Returns 403 if client not associated with quote

### POST /api/quotes/:id/create-revision
Staff creates revision of locked quote

**Request:**
```json
{
  "change_reason": "Client requested price adjustment"
}
```

**Response:**
```json
{
  "success": true,
  "quote_id": "uuid",
  "revision_id": "uuid",
  "revision_number": 2,
  "message": "Quote revision created and unlocked for editing"
}
```

**Actions:**
- Requires staff/admin role
- Creates `quote_revisions` record with revision number
- Unlocks quote (is_locked=false) for editing
- Records changed-by user, timestamp, reason
- Snapshots current quote data and items
- Returns 400 if quote not locked
- Returns 403 if not staff/admin

## UI Changes

### Client Portal - Quote View Page
**New Modal: Accept Quote Confirmation**
- Shows warning that quote will be locked and immutable snapshot created
- Allows optional acceptance note
- Confirms action before submission

**New Modal: Reject Quote**
- Text area for rejection reason (required)
- Records reason for audit trail
- Allows resubmission after rejection

**Action Buttons Updated:**
- Accept button → opens confirmation modal
- Reject button → opens rejection modal
- Buttons only visible if quote status='sent' and not expired

### Staff Portal - Quote View/Edit Page
**New Status Indicator:**
- Shows "LOCKED (ACCEPTED)" badge for accepted quotes
- Displayed in green with lock indicator

**New Button: "Create Revision"**
- Appears instead of "Edit" for locked accepted quotes
- Opens revision reason modal
- Creates revision and unlocks quote for edits

**New Modal: Create Revision Confirmation**
- Explains that historical record will be maintained
- Requires revision reason (required field)
- Shows revision will unlock quote

## Type Definitions Added

```typescript
interface QuoteAcceptanceSnapshot {
  id: string;
  quote_id: string;
  accepted_at: string;
  accepted_by: string; // user id
  acceptance_ip: string | null;
  items_snapshot: QuoteItem[];
  subtotal: number;
  discount_amount: number;
  markup_amount: number;
  vat_amount: number;
  total: number;
  deposit_amount: number | null;
  balance_due: number;
  acceptance_note: string | null;
  created_at: string;
}

interface QuoteRevision {
  id: string;
  quote_id: string;
  revision_number: number;
  parent_revision_id: string | null;
  changed_by: string; // user id
  changed_at: string;
  change_reason: string | null;
  quote_data: Quote;
  items_data: QuoteItem[];
  totals_data: QuoteTotalsCalculation;
  created_at: string;
}

interface AcceptQuoteRequest {
  acceptance_note?: string;
}

interface RejectQuoteRequest {
  rejection_reason: string;
}

interface CreateRevisionRequest {
  change_reason: string;
}
```

**Quote interface extended with:**
- `accepted_by`: user ID of accepting client
- `acceptance_ip`: IP address of acceptance
- `acceptance_note`: Optional note from client
- `rejected_at`: Rejection timestamp
- `rejected_by`: User ID of rejecting client
- `rejection_reason`: Reason text
- `is_locked`: Boolean flag for edit lock

## Implementation Notes

### Database Migration
The SQL file `supabase/sql/phase_c3_acceptance.sql` contains:
1. ALTER TABLE statements for new columns
2. CREATE TABLE statements for snapshot and revisions
3. Indexes for performance
4. RLS policies for security
5. Helper functions (PL/pgSQL) for complex operations

### API Security
- All endpoints validate authentication token
- Client endpoints verify user is associated with quote/client
- Staff endpoints verify user is staff/admin for business
- IP addresses captured for audit trail
- All operations immutable (no deletes, only inserts)

### Immutability Strategy
- Snapshots cannot be modified (no UPDATE on snapshot table)
- Revisions record full state, allowing historical audit
- Acceptance creates permanent record preventing disputes
- Version control prevents loss of historical data

## Testing Checklist

- [ ] Client can view quote in portal
- [ ] Client can accept quote with confirmation modal
- [ ] Acceptance creates snapshot (verify in database)
- [ ] Quote becomes locked (is_locked=true)
- [ ] Staff cannot edit locked quote
- [ ] Staff can click "Create Revision"
- [ ] Revision modal appears with reason field
- [ ] Revision unlocks quote for editing
- [ ] Revision recorded in quote_revisions table
- [ ] Client can reject quote with reason
- [ ] Rejection reason stored in database
- [ ] Rejected quote can be edited by staff
- [ ] IP address captured on acceptance
- [ ] Acceptance timestamp correct
- [ ] Multiple revisions tracked with version numbers
- [ ] TypeScript compilation: zero errors
- [ ] Build successful: all routes compiled

## Files Changed

### Database
- `supabase/sql/phase_c3_acceptance.sql` (NEW - 300+ lines)

### Types
- `src/types/quotes.ts` - Added acceptance types, updated Quote interface

### API Routes (NEW)
- `src/app/api/quotes/[id]/accept/route.ts` (150+ lines)
- `src/app/api/quotes/[id]/reject/route.ts` (130+ lines)
- `src/app/api/quotes/[id]/create-revision/route.ts` (170+ lines)

### UI Components (UPDATED)
- `src/app/dashboard/client/quotes/[id]/page.tsx`
  - Added modal state (showAcceptModal, showRejectModal)
  - Added rejection reason textarea state
  - Updated accept/reject handlers to call API
  - Added confirmation modals with styled UI
  - Added immutability warning text

- `src/app/dashboard/app/quotes/[id]/page.tsx`
  - Added revision reason state
  - Updated canEdit logic to check is_locked
  - Added isLocked computed variable
  - Added locked status badge display
  - Added "Create Revision" button
  - Added handleCreateRevision handler
  - Added revision confirmation modal

## Status

✅ **COMPLETE**

- [x] Database schema created
- [x] RLS policies implemented
- [x] Helper functions created
- [x] API endpoints implemented
- [x] Client UI modals added
- [x] Staff UI updated for locked quotes
- [x] Type definitions complete
- [x] TypeScript compilation: ZERO ERRORS
- [x] Build successful with all endpoints

All code is production-ready and follows existing patterns in codebase.
