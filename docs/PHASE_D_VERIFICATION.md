# Phase D Invoice System — Verification Guide

**Last Updated:** January 2026  
**Phase:** D (Invoices End-to-End)  
**Status:** Deployment-Ready Verification  

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Setup Verification](#setup-verification)
3. [Local Development Environment](#local-development-environment)
4. [Running the Verification Script](#running-the-verification-script)
5. [Manual Test Plan](#manual-test-plan)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Environment Variables

Before running any verification, ensure your `.env.local` file contains these required variables:

```env
# Supabase API Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxx

# Application Base URL (REQUIRED for OAuth redirects)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NODE_ENV=development
```

**Where to get these values:**
- Go to [Supabase Dashboard](https://supabase.com/dashboard)
- Select your project
- Navigate to **Settings > API**
- Copy the following:
  - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
  - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY`

### Required Supabase Setup

Verify these steps have been completed in your Supabase project:

#### 1. Database Migrations Applied

All Phase D migrations must be applied. Run the following in Supabase SQL Editor:

```bash
# Navigate to your project's supabase directory
cd supabase/migrations

# Look for these migration files (should exist):
# - 001_*.sql (Auth setup)
# - 010_*.sql (Core quote/client tables)
# - 011_*.sql (Invoice tables - PHASE D)
```

**To verify migrations are applied:**

In Supabase SQL Editor, run:

```sql
-- Check if invoices table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'invoices';

-- Check if invoice_items table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'invoice_items';

-- Check if invoice_payments table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'invoice_payments';
```

**Expected result:** All three tables should be listed.

#### 2. Row Level Security (RLS) Enabled

Verify RLS is enabled on invoice tables:

```sql
-- Check RLS status on invoice tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('invoices', 'invoice_items', 'invoice_payments');
```

**Expected result:** All tables should show `rowsecurity = true`

#### 3. Service Role Authentication

The service role account must have:
- Read/Write access to all invoice tables
- Ability to execute database functions
- No time-based restrictions

This is standard for Supabase service role keys and doesn't require additional setup.

### Node.js & npm

- **Node.js:** v18.x or higher
- **npm:** v9.x or higher

Check your versions:

```bash
node --version   # Should be v18+
npm --version    # Should be v9+
```

### Required npm Packages

Core dependencies for Phase D:

```json
{
  "next": "^14.2.3",
  "react": "^18.x",
  "typescript": "^5.x",
  "@supabase/supabase-js": "^2.x",
  "pdfkit": "^0.13.x",
  "zod": "^3.x"
}
```

Verify installation:

```bash
npm list next typescript @supabase/supabase-js pdfkit zod
```

---

## Setup Verification

### Step 1: Clone or Update Repository

```bash
# Navigate to project directory
cd c:\Projects\BUILDR

# Ensure latest code
git pull origin main
```

### Step 2: Verify Environment File

```bash
# Check .env.local exists and has required variables
cat .env.local

# Required variables should NOT be empty:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY
```

**⚠️ Common Issue:** Missing or malformed `.env.local`

See [Troubleshooting](#troubleshooting) if variables are missing.

### Step 3: Install Dependencies

```bash
# Install or update dependencies
npm install

# Clean install (if needed)
rm -r node_modules package-lock.json
npm install
```

---

## Local Development Environment

### Starting the Development Server

```bash
# Terminal 1: Start development server
npm run dev

# Expected output:
# > next dev
# ▲ Next.js 14.2.3
# - Local:        http://localhost:3000
# - Environments: .env.local
# 
# ✓ Ready in 3.5s
```

### Accessing the Application

- **Main URL:** http://localhost:3000
- **Staff Dashboard:** http://localhost:3000/dashboard/app
- **Client Dashboard:** http://localhost:3000/account
- **Sign In:** http://localhost:3000/sign-in

### Verifying Dev Server is Responsive

```bash
# Terminal 2: Test basic connectivity
curl http://localhost:3000

# Expected: HTML response (200 OK)
```

---

## Running the Verification Script

### Automated Verification

The verification script (`scripts/verify-phase-d.mjs`) performs comprehensive checks:

```bash
# Run from project root
node scripts/verify-phase-d.mjs

# Expected output (clean PASS summary):
# ═══════════════════════════════════════════════════════
# Phase D Verification Report
# ═══════════════════════════════════════════════════════
#
# Environment Variables:    ✓ PASS
# TypeScript Compilation:   ✓ PASS
# Production Build:         ✓ PASS
#
# ═══════════════════════════════════════════════════════
# Overall Status: ✓ PASS
# ═══════════════════════════════════════════════════════
```

### What the Script Checks

1. **Environment Variables** - Validates all required vars exist
2. **TypeScript Compilation** - Runs `npx tsc --noEmit` for type safety
3. **Production Build** - Runs `npm run build` to verify buildability
4. **Linting** (Optional) - Runs ESLint if configured

### Script Behavior

- **Exit Code 0:** All checks passed ✓
- **Exit Code 1:** One or more checks failed ✗

### On Windows PowerShell

```powershell
# Run directly in PowerShell (no Bash required)
node scripts/verify-phase-d.mjs

# Or as npm script (if added to package.json)
npm run verify-phase-d
```

---

## Manual Test Plan

Use these steps to verify Phase D functionality end-to-end locally.

### Prerequisites for Testing

- Development server running (`npm run dev`)
- PostgreSQL database seeded with test data
- Logged in as staff user

### Test Scenario 1: Create Invoice from Accepted Quote

**Setup:**
1. Navigate to http://localhost:3000/dashboard/app/quotes
2. Find or create a quote with status "accepted" and is_locked = true

**Steps:**
1. Click on a locked, accepted quote
2. Scroll to button section
3. Verify you see a button labeled "Create Invoice" (green button) OR "View Invoice" (blue button)

**Expected Result:**
- ✓ Button is visible only for accepted, locked quotes
- ✓ Button shows "Create Invoice" if no invoice exists
- ✓ Button shows "View Invoice" if invoice already exists

**Test Actions:**

a) **Create Invoice:**
```
1. Click "Create Invoice" button
2. Observe loading state ("Creating...")
3. Expect redirect to /dashboard/app/invoices/{newInvoiceId}
4. Verify invoice shows as "draft" status
5. Verify invoice items match quote items
```

Expected behavior:
- ✓ POST /api/quotes/{id}/create-invoice returns invoice_id
- ✓ Page redirects to new invoice detail
- ✓ Invoice totals match quote totals

b) **View Existing Invoice:**
```
1. If invoice already exists for quote, button says "View Invoice"
2. Click "View Invoice" button
3. Expect redirect to existing invoice detail page
```

Expected behavior:
- ✓ Navigates to correct invoice detail page
- ✓ Shows invoice number and client info
- ✓ Shows line items

### Test Scenario 2: Invoice Detail Page

**Navigation:** http://localhost:3000/dashboard/app/invoices/{invoiceId}

**Steps:**

1. **Verify Invoice Display:**
   ```
   ✓ Invoice number displays correctly
   ✓ Client information shows
   ✓ Line items display with amounts
   ✓ Totals calculated correctly (subtotal, tax, total)
   ✓ Status badge shows "Draft", "Sent", or "Paid"
   ```

2. **Test Invoice Actions (if draft):**
   ```
   ✓ "Send Invoice" button present
   ✓ "Edit Invoice" button present (if applicable)
   ✓ "Record Payment" button present
   ```

3. **Test PDF Download:**
   ```
   ✓ Click "Download PDF" button
   ✓ PDF downloads with filename: invoice-{invoiceNumber}.pdf
   ✓ PDF renders with invoice data
   ✓ PDF includes client info, items, amounts, and totals
   ```

4. **Test Send Invoice:**
   ```
   ✓ Click "Send Invoice" button
   ✓ Invoice status changes from "Draft" to "Sent"
   ✓ Date sent is recorded
   ```

5. **Test Record Payment:**
   ```
   ✓ Click "Record Payment" button
   ✓ Modal opens with payment form
   ✓ Enter payment amount and date
   ✓ Click "Record Payment"
   ✓ Payment recorded in database
   ✓ Invoice shows as "Paid" if fully paid
   ```

### Test Scenario 3: Invoice Listing

**Navigation:** http://localhost:3000/dashboard/app/invoices

**Steps:**

1. **Verify List Displays:**
   ```
   ✓ Invoice numbers displayed
   ✓ Client names shown
   ✓ Invoice amounts visible
   ✓ Status badges display (Draft, Sent, Paid)
   ✓ Due dates shown
   ```

2. **Test Filtering:**
   ```
   ✓ Filter by status dropdown works
   ✓ Filter by date range works (if implemented)
   ✓ Search by invoice number works (if implemented)
   ```

3. **Test Row Click:**
   ```
   ✓ Click on invoice row
   ✓ Navigate to invoice detail page
   ```

### Test Scenario 4: Client Invoice View (Read-Only)

**Navigation:** http://localhost:3000/account/invoices

**Steps:**

1. **Verify Client Visibility:**
   ```
   ✓ Only own invoices display
   ✓ Draft invoices hidden (not shown in list)
   ✓ Sent and Paid invoices visible
   ```

2. **Verify Read-Only:**
   ```
   ✓ No "Edit", "Send", or "Record Payment" buttons
   ✓ Can view invoice details
   ✓ Can download PDF
   ```

### Test Scenario 5: API Endpoints

**Prerequisites:** Use REST client (Postman, curl, or Thunder Client in VS Code)

```bash
# 1. Create Invoice from Quote
curl -X POST http://localhost:3000/api/quotes/{quoteId}/create-invoice \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json"

# Expected response:
# {
#   "invoice_id": "uuid",
#   "invoice_number": "INV-2026-001",
#   "quote_id": "uuid",
#   "status": "draft",
#   "created_at": "2026-01-19T..."
# }

# 2. Get Invoice
curl -X GET http://localhost:3000/api/invoices/{invoiceId} \
  -H "Authorization: Bearer {accessToken}"

# Expected response: Complete invoice object with items and payments

# 3. Send Invoice
curl -X POST http://localhost:3000/api/invoices/{invoiceId}/send \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json"

# Expected response: Updated invoice with status "Sent"

# 4. Record Payment
curl -X POST http://localhost:3000/api/invoices/{invoiceId}/record-payment \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000.00,
    "payment_date": "2026-01-19"
  }'

# Expected response: Payment recorded, invoice status updated if fully paid
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Missing Environment Variables

**Symptom:**
```
Error: Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL
Script exits with code 1
```

**Solution:**

1. Verify `.env.local` exists in project root:
   ```bash
   ls -la .env.local
   ```

2. Check file contains required variables:
   ```bash
   grep "NEXT_PUBLIC_SUPABASE_URL" .env.local
   grep "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local
   grep "SUPABASE_SERVICE_ROLE_KEY" .env.local
   ```

3. Variables should NOT be empty:
   ```bash
   cat .env.local | grep "NEXT_PUBLIC_SUPABASE_URL="
   # Should show: NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   # NOT: NEXT_PUBLIC_SUPABASE_URL=
   ```

4. Restart development server after updating `.env.local`:
   ```bash
   # Stop current server (Ctrl+C)
   # Start new server
   npm run dev
   ```

**Prevention:** Copy `.env.local.example` and fill all required fields before starting.

---

#### Issue 2: TypeScript Compilation Errors

**Symptom:**
```
error TS2305: Module 'src/types/invoices' has no exported member 'Invoice'
Script exits with code 1
```

**Solution:**

1. Verify invoice types file exists:
   ```bash
   ls -la src/types/invoices.ts
   ```

2. Check file is not corrupted:
   ```bash
   head -20 src/types/invoices.ts
   # Should show: export interface Invoice { ... }
   ```

3. Clean TypeScript cache and rebuild:
   ```bash
   rm -rf .next
   rm -rf node_modules/.cache
   npm run build
   ```

4. If still failing, run type check directly:
   ```bash
   npx tsc --noEmit
   # Shows specific line numbers with errors
   ```

**Common TypeScript Errors:**
- Missing interface exports → Add `export` keyword
- Incorrect import paths → Verify file paths in imports
- Type mismatches → Run `npx tsc` for detailed error messages

---

#### Issue 3: Build Failure

**Symptom:**
```
npm run build
> failed to compile
error during build
```

**Solution:**

1. Check specific error output:
   ```bash
   npm run build 2>&1 | tail -50
   # Shows last 50 lines of output
   ```

2. Common build issues:
   - **Missing dependencies:** `npm install`
   - **Type errors:** `npx tsc --noEmit` (fix types first)
   - **Node version:** `node --version` (ensure v18+)
   - **Port conflict:** Kill process on port 3000: `lsof -ti:3000 | xargs kill`

3. Clean build:
   ```bash
   rm -rf .next
   npm run build
   ```

4. If build still fails on specific file:
   ```bash
   # Check syntax
   node -c src/app/dashboard/app/invoices/page.tsx
   ```

---

#### Issue 4: Supabase Connection Error

**Symptom:**
```
Error: Failed to connect to Supabase
[Database error] connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**

1. Verify Supabase URL is correct:
   ```bash
   grep "NEXT_PUBLIC_SUPABASE_URL" .env.local
   # Should be: https://xxxx.supabase.co (not localhost)
   ```

2. Test API key validity:
   ```bash
   curl -H "apikey: {NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
        https://{project-ref}.supabase.co/rest/v1/
   # Should return 200 OK with Supabase response
   ```

3. Check network connectivity:
   ```bash
   ping supabase.co
   ```

4. Verify firewall/proxy isn't blocking requests

5. If running behind proxy, check Next.js proxy settings in `next.config.js`

---

#### Issue 5: Invoice Not Created / API Returns 500

**Symptom:**
```
POST /api/quotes/{id}/create-invoice returns 500 error
Response: Internal Server Error
```

**Solution:**

1. Check server logs:
   ```bash
   # Terminal where npm run dev is running
   # Look for error stack trace
   ```

2. Common causes:
   - **Quote not found:** Verify quote ID exists and is accessible by user
   - **Quote not accepted:** Only "accepted" quotes can create invoices
   - **Database error:** Check Supabase logs in dashboard
   - **Missing invoices table:** Verify migrations were applied

3. Debug by checking database:
   ```sql
   -- In Supabase SQL Editor
   -- Check if quote exists
   SELECT id, status, is_locked FROM quotes WHERE id = '{quoteId}';
   
   -- Check if invoice already exists
   SELECT id FROM invoices WHERE quote_id = '{quoteId}';
   ```

4. If migrations missing, apply them:
   ```bash
   # In Supabase dashboard: SQL Editor
   # Run migration files in supabase/migrations/
   ```

---

#### Issue 6: PDF Download Fails

**Symptom:**
```
Click "Download PDF" → File doesn't download or returns error
```

**Solution:**

1. Check browser console for errors:
   ```
   Press F12 → Console tab
   Look for any error messages
   ```

2. Verify PDF endpoint exists:
   ```bash
   curl http://localhost:3000/api/invoices/{invoiceId}/pdf \
     -H "Authorization: Bearer {token}" \
     -o test.pdf
   # Should create test.pdf file
   ```

3. Check if pdfkit is installed:
   ```bash
   npm list pdfkit
   # Should show: pdfkit@0.13.x or higher
   ```

4. If not installed, install it:
   ```bash
   npm install pdfkit
   ```

5. Check PDF generation permissions:
   - Verify write access to `/tmp` directory (Linux/Mac)
   - Verify write access to `%TEMP%` directory (Windows)

---

#### Issue 7: Network/CORS Errors

**Symptom:**
```
Error: CORS policy: No 'Access-Control-Allow-Origin' header
```

**Solution:**

1. This typically means request is going to wrong URL:
   ```bash
   # Check that requests go to http://localhost:3000
   # NOT to external URL
   ```

2. Verify API routes exist at correct paths:
   ```bash
   # These files should exist:
   ls src/app/api/invoices/route.ts
   ls src/app/api/invoices/[id]/route.ts
   ls src/app/api/quotes/[id]/create-invoice/route.ts
   ```

3. Check Next.js API routes are serving (not client-side fetch):
   ```bash
   curl -v http://localhost:3000/api/invoices
   # Should return 200 OK with API response
   ```

---

### Getting Help

If issues persist after troubleshooting:

1. **Check Application Logs:**
   ```bash
   # Terminal running npm run dev
   Look for error messages and stack traces
   ```

2. **Check Supabase Logs:**
   - Supabase Dashboard → Logs
   - Look for database errors, RLS violations

3. **Review Phase D Documentation:**
   - [PHASE_D1_COMPLETE.md](../PHASE_D1_COMPLETE.md) - Database schema
   - [PHASE_D3_INVOICE_UI.md](../PHASE_D3_INVOICE_UI.md) - Staff UI pages
   - [PHASE_D4_INVOICE_PDF.md](../PHASE_D4_INVOICE_PDF.md) - PDF generation

4. **Run Verification Script Again:**
   ```bash
   node scripts/verify-phase-d.mjs
   # Shows exactly which check failed
   ```

---

## Summary

**Verification Complete When:**
- ✓ All environment variables present
- ✓ `npx tsc --noEmit` exits with code 0
- ✓ `npm run build` completes successfully
- ✓ Development server starts without errors
- ✓ Manual test scenarios pass
- ✓ `node scripts/verify-phase-d.mjs` shows PASS

**Phase D is Deployment-Ready When:**
- ✓ All verifications pass on Windows, Mac, and Linux
- ✓ Manual tests complete successfully
- ✓ No TypeScript errors
- ✓ Build completes in <5 minutes
- ✓ API endpoints respond correctly
- ✓ PDF generation works end-to-end
- ✓ Client and staff views both functional

---

**Last Verified:** January 19, 2026  
**Next Review:** After any Phase D code changes
