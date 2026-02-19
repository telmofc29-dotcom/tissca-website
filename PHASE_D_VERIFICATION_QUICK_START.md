# Phase D Verification — Quick Start Guide

## TL;DR - Verify Phase D Works (< 2 minutes)

```bash
# One command to verify everything
node scripts/verify-phase-d.mjs

# Expected: All checks show ✓ PASS
```

## Before Running Verification

### 1. Environment File

Ensure `.env.local` exists with these 4 required variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxx
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**Don't have these?** Get them from [Supabase Dashboard](https://supabase.com/dashboard) → Settings → API

### 2. Supabase Migrations

Run these in Supabase SQL Editor:

```sql
-- Verify these 3 tables exist:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('invoices', 'invoice_items', 'invoice_payments');
```

**Expected:** All 3 tables listed

## Run Verification

```bash
# Option 1: Direct Node
node scripts/verify-phase-d.mjs

# Option 2: Via npm
npm run verify-phase-d

# On Windows PowerShell
cd c:\Projects\BUILDR
node scripts/verify-phase-d.mjs
```

## What Gets Checked

| Check | What It Does | If Fails |
|-------|-------------|----------|
| **Env Vars** | Checks required variables exist | Fix `.env.local` |
| **Node.js** | Verifies v18+ installed | Update Node.js |
| **Dependencies** | Checks npm packages | Run `npm install` |
| **TypeScript** | Runs `npx tsc --noEmit` | Fix type errors |
| **Build** | Runs `npm run build` | Check build output |

## Expected Output

```
═════════════════════════════════════════════════════════
Phase D Invoice System Verification
═════════════════════════════════════════════════════════

Environment Variables               ✓ PASS
Node.js Version                     ✓ PASS
Dependencies                        ✓ PASS
TypeScript Compilation              ✓ PASS
Production Build                    ✓ PASS

═════════════════════════════════════════════════════════
Overall Status: ✓ PASS
═════════════════════════════════════════════════════════

✓ Phase D is ready for deployment
```

## If Verification Fails

**Problem: Missing environment variables**
```
SUPABASE_SERVICE_ROLE_KEY ✗ FAIL (NOT FOUND)
```
→ Add all 4 required vars to `.env.local`

**Problem: TypeScript errors**
```
TypeScript Compilation ✗ FAIL
[specific error output...]
```
→ Run `npx tsc --noEmit` to see detailed errors

**Problem: Build fails**
```
Production Build ✗ FAIL
```
→ Check `npm run build` output for specific issues

**Need help?** See [docs/PHASE_D_VERIFICATION.md](docs/PHASE_D_VERIFICATION.md) → Troubleshooting

## Next Steps After Verification PASS

### Option 1: Run Development Server

```bash
npm run dev
# Then visit http://localhost:3000/dashboard/app/invoices
```

### Option 2: Run Manual Tests

Follow the test scenarios in [docs/PHASE_D_VERIFICATION.md](docs/PHASE_D_VERIFICATION.md) → Manual Test Plan

Test scenarios cover:
- Creating invoices from quotes
- Invoice detail page
- PDF downloads
- Payment recording
- Client read-only views

### Option 3: Deploy

If verification passes and manual tests succeed:
- Phase D is deployment-ready ✅
- Proceed with staging/production deployment

## Common Issues

### "node: command not found"
- Install Node.js from [nodejs.org](https://nodejs.org)
- v18+ required

### ".env.local not found"
- Copy `.env.local.example` to `.env.local`
- Fill in all 4 required Supabase variables

### "npm modules not installed"
- Run `npm install`

### "Supabase connection failed"
- Check `.env.local` has correct URLs
- Verify Supabase project is active

## File Locations

```
📁 BUILDR/
├── scripts/verify-phase-d.mjs ← Verification script
├── docs/PHASE_D_VERIFICATION.md ← Full documentation
├── PHASE_D_VERIFICATION_SUMMARY.md ← This overview
├── .env.local ← Your configuration
└── package.json ← npm scripts
```

## Commands Cheat Sheet

```bash
# Verification
node scripts/verify-phase-d.mjs
npm run verify-phase-d

# Manual checks
npx tsc --noEmit              # TypeScript only
npm run build                 # Production build only
npm run dev                   # Development server
npm run check-env             # Environment variables only

# Utilities
npm install                   # Install dependencies
git pull                      # Update code
```

## Exit Codes

- **0** = All checks passed ✓
- **1** = One or more checks failed ✗

Useful for CI/CD pipelines:
```bash
npm run verify-phase-d
if [ $? -eq 0 ]; then
  echo "Ready to deploy"
else
  echo "Fix issues before deploying"
fi
```

## Questions?

**Detailed documentation:** [docs/PHASE_D_VERIFICATION.md](docs/PHASE_D_VERIFICATION.md)

**What's in Phase D?**
- 7 API endpoints
- Database schema (3 tables, 10 RLS policies)
- Staff invoice pages (list + detail)
- Client invoice pages (read-only)
- Invoice PDF generation
- Payment tracking

---

**Last Updated:** January 19, 2026  
**Phase:** D (Invoices) — Verification  
**Status:** Ready ✅
