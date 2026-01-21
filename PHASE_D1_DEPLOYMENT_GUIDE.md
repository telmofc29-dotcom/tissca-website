# Phase D1: Invoice Database Layer - Deployment Guide

## File Location
**SQL Migration:** `supabase/sql/phase_d1_invoices.sql`

## Prerequisites
✅ Phase C0 (role-based dashboard) must be applied  
✅ Phase C1 (quotes schema) must be applied  
✅ Phase C3 (acceptance flow) must be applied  

## How to Run in Supabase

### Step 1: Open Supabase SQL Editor
1. Go to [Supabase Dashboard](https://supabase.com)
2. Select your **BUILDR** project
3. Click **SQL Editor** in the left sidebar
4. Click **+ New Query** button

### Step 2: Copy & Paste the Migration
1. Open `supabase/sql/phase_d1_invoices.sql` from the repository
2. Copy entire contents (Ctrl+A, Ctrl+C)
3. Paste into the Supabase SQL Editor text area

### Step 3: Execute
1. Click **Run** button (or press Ctrl+Enter)
2. Wait for success message at bottom
3. You should see: ✅ "Success. No rows returned."

### Step 4: Verify (Optional)
In the SQL Editor, run this to verify tables exist:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('invoices', 'invoice_items', 'invoice_payments')
ORDER BY table_name;
```

Expected result: 3 rows (invoices, invoice_items, invoice_payments)

---

## What Gets Created

### Tables (3)
1. **invoices** - Invoice records with status, dates, totals, payment tracking
2. **invoice_items** - Line items (material, labour, custom) with VAT per line
3. **invoice_payments** - Payment log with method and amount tracking

### Indexes (7)
- `invoices(business_id, issue_date)` - Fast lookup by business & date
- `invoices(business_id, status)` - Fast lookup by status
- `invoices(client_id, issue_date)` - Fast lookup by client
- `invoice_items(invoice_id)` - Fast lookup of items per invoice
- `invoice_payments(invoice_id)` - Fast lookup of payments per invoice
- Plus 2 more single-column indexes for common queries

### Constraints
- **CHECK:** All numeric fields >= 0 (prevents negative amounts)
- **UNIQUE:** `(business_id, invoice_number)` per business
- **FOREIGN KEY:** Links to `businesses`, `clients`, `quotes`
- **CASCADE DELETE:** Payments & items deleted when invoice deleted

### RLS Policies (10)
| Role | Access Level | Operations |
|------|--------------|------------|
| **Staff** | Full within business | CREATE, READ, UPDATE, DELETE |
| **Client** | Read-only own invoices | READ only |
| **Accountant** | Read-only within business | READ only |
| **Admin** | Full access | READ all invoices |

---

## Troubleshooting

### Error: "relation 'public.businesses' does not exist"
→ Phase C0 migration not applied. Run Phase C0 first.

### Error: "relation 'public.clients' does not exist"
→ Phase C1 migration not applied. Run Phase C1 first.

### Error: "relation 'public.quotes' does not exist"
→ Phase C3 migration not applied. Run Phase C3 first.

### Error: "permission denied for schema public"
→ Wrong user logged in. Use your Supabase project owner or role with DDL permissions.

### "Success. No rows returned" (good!)
→ Migration applied successfully. Run the verification query above to confirm.

---

## Schema Diagram

```
┌─────────────────────┐
│  businesses         │
│  (from Phase C0)    │
└──────────┬──────────┘
           │ (business_id FK)
           │
┌──────────▼──────────┐         ┌──────────────────┐
│  invoices           │◄────────┤  quotes          │
│  ├─ invoice_number  │         │  (from Phase C1) │
│  ├─ status          │         └──────────────────┘
│  ├─ issue_date      │
│  ├─ due_date        │
│  ├─ subtotal        │
│  ├─ vat_total       │
│  ├─ total           │
│  ├─ amount_paid     │
│  └─ balance_due     │
│       │ (client_id FK)
│       │
│   ┌───▼────────────────────┐
│   │  clients               │
│   │  (from Phase C0)       │
│   └────────────────────────┘
│
├─ invoice_items (FK to invoices)
│  ├─ description
│  ├─ qty
│  ├─ unit_price
│  ├─ vat_rate
│  └─ line_total
│
└─ invoice_payments (FK to invoices)
   ├─ amount
   ├─ method
   └─ reference
```

---

## What's NOT Included (Phase D2+)

❌ API routes (will be added in D2)  
❌ TypeScript types (will be added in D2)  
❌ Invoice creation from quotes (will be added in D2)  
❌ Invoice PDF generation (will be added in D2)  
❌ UI pages (will be added in D3)  
❌ Payment tracking UI (will be added in D3)

---

## Notes

- All numeric fields use `numeric(12, 2)` for GBP currency precision
- VAT calculated per line item (not just total)
- Invoice numbers are business-specific (e.g., INV-2025-001 per business)
- RLS policies match existing Phase C pattern (staff/client/accountant/admin)
- Invoice status workflow: draft → sent → partially_paid → paid (or cancelled)
- Payments are immutable (insert-only, no update/delete of payment records)

---

**Status:** ✅ Ready to deploy to Supabase

**Est. Runtime:** < 5 seconds
