# Phase C0 - Scope Lock & Naming Cleanup — COMPLETE ✅

**BUILDR is a construction/renovation SaaS platform, not a marketplace.**

This phase locks the scope and establishes a single source of truth for all role definitions.

---

## Changes Made

### 1. Single Source of Truth: `src/lib/roles.ts`

**New file** providing centralized role configuration:

```typescript
export type UserRole = 'admin' | 'staff' | 'accountant' | 'client';

export const ROLE_DASHBOARDS: Record<UserRole, string> = {
  admin: '/dashboard/admin',
  accountant: '/dashboard/accountant',
  staff: '/dashboard/app',
  client: '/dashboard/client',
};

export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  admin: 'Administrator',
  staff: 'Contractor',
  accountant: 'Accountant',
  client: 'Client',
};

// + Role descriptions
// + Subscription features & plans
// + Helper functions (isContractor, canCreateQuotes, etc.)
```

**All new imports should use:**
```typescript
import { UserRole, ROLE_DASHBOARDS } from '@/lib/roles';
```

### 2. Locked Roles (4 Total)

| Role | Purpose | Dashboard | Can Create Quotes |
|------|---------|-----------|-------------------|
| **admin** | BUILDR system administrator | `/dashboard/admin` | ❌ |
| **staff** | Contractor creating quotes/invoices | `/dashboard/app` | ✅ |
| **accountant** | Financial professional reviewing invoices | `/dashboard/accountant` | ❌ |
| **client** | End customer receiving quotes/invoices | `/dashboard/client` | ❌ |

### 3. Removed References

✅ **Removed "business" role** - replaced with "staff"
- Old: `role: 'business'`
- New: `role: 'staff'` (contractor)

✅ **No marketplace language anywhere** - BUILDR is construction-focused
- Removed supplier/retailer mentions (none found)
- All terminology updated to construction industry

### 4. Updated Components

| File | Change | Status |
|------|--------|--------|
| `src/lib/roles.ts` | **NEW** - Single source of truth | ✅ Created |
| `src/types/roles.ts` | Re-exports from lib/roles.ts (backward compatible) | ✅ Updated |
| `docs/DATABASE_SCHEMA.sql` | Updated role enum: removed 'business' | ✅ Updated |
| `src/app/api/auth/setup-profile/route.ts` | Changed: role='staff' (was 'business') | ✅ Updated |
| `src/components/layout/DashboardShell.tsx` | Updated role type: removed 'business' | ✅ Updated |
| `src/app/dashboard/app/page.tsx` | Function: ContractorDashboard (was BusinessDashboard) | ✅ Updated |
| `src/app/dashboard/app/page.tsx` | Role check: 'staff' & 'accountant' (was 'business' & 'staff') | ✅ Updated |
| `src/app/dashboard/app/materials/page.tsx` | Role check: 'staff' & 'accountant' | ✅ Updated |

### 5. Route Stability

**NO breaking route changes** - All routes remain functional:
- ✅ `/dashboard/app` - Still works for staff/accountant
- ✅ `/dashboard/admin` - Still works for admin
- ✅ `/dashboard/accountant` - Still works for accountant
- ✅ `/dashboard/client` - Still works for client
- ✅ All API routes unchanged

---

## Backward Compatibility

**Old code importing from `src/types/roles.ts` still works:**

```typescript
// ✅ Still valid (re-exported from src/lib/roles.ts)
import { UserRole, ROLE_DASHBOARDS } from '@/types/roles';
```

**But prefer new import path:**

```typescript
// ✅ Preferred (direct source of truth)
import { UserRole, ROLE_DASHBOARDS } from '@/lib/roles';
```

---

## TypeScript Status

**Before Phase C0:**
- 120+ routes compiled
- Some references to deprecated "business" role

**After Phase C0:**
```bash
npm run build
# ✅ Compiled successfully (0 errors)
# ✅ All role types updated
# ✅ No deprecated role references in active code
```

### Type Check Commands

```bash
# Check all TypeScript files
npx tsc --noEmit

# Check specific role-related files
npx tsc --noEmit src/lib/roles.ts src/types/roles.ts
```

---

## Migration Guide (For Existing Code)

If you have code referencing the old "business" role:

```typescript
// ❌ OLD
if (profile.role === 'business') { ... }

// ✅ NEW
if (profile.role === 'staff') { ... }
```

```typescript
// ❌ OLD
const ROLE_DASHBOARDS = {
  business: '/dashboard/app',
  // ...
};

// ✅ NEW - Use from lib/roles.ts
import { ROLE_DASHBOARDS } from '@/lib/roles';
```

---

## Database Migration

If you already have a Supabase database with the old schema:

```sql
-- Update role column constraint
ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'staff', 'accountant', 'client'));

-- Update existing 'business' roles to 'staff'
UPDATE profiles SET role = 'staff' WHERE role = 'business';
```

**For fresh Supabase setup:** Use the updated `docs/DATABASE_SCHEMA.sql` directly.

---

## Documentation Updates

### Updated Files

1. **`docs/DATABASE_SCHEMA.sql`**
   - Updated header: mentions "Phase C0"
   - Role enum: only admin, staff, accountant, client
   - Comments clarified for construction SaaS

2. **`docs/PHASE_B_SETUP.md`**
   - Renamed to Phase C0 (scope lock)
   - Updated role descriptions
   - Clarified "staff" = contractor
   - Single source of truth section added

### Role Descriptions (For Users)

- **Administrator** - BUILDR system administrator
- **Contractor** - Staff member creating quotes and invoices
- **Accountant** - Financial professional reviewing invoices and generating reports
- **Client** - End customer receiving quotes and invoices

---

## Project Status

### ✅ Complete (Phase C0)

- Single source of truth for roles (`src/lib/roles.ts`)
- All roles locked to: admin, staff, accountant, client
- No "business" role in active code
- No marketplace language in UI/types/comments
- All routes stable (no breaking changes)
- TypeScript: 0 errors
- Backward compatible with existing code

### 📋 Next Phases

**Phase D:** Implement quotes & invoices
**Phase E:** Implement accountant reporting
**Phase F:** Stripe billing integration

---

## Files Summary

**New:**
- `src/lib/roles.ts` (120+ lines) - Single source of truth

**Modified:**
- `src/types/roles.ts` - Now re-exports from lib/roles
- `docs/DATABASE_SCHEMA.sql` - Updated schema
- `src/app/api/auth/setup-profile/route.ts` - staff role
- `src/components/layout/DashboardShell.tsx` - Updated types
- `src/app/dashboard/app/page.tsx` - Contractor dashboard
- `src/app/dashboard/app/materials/page.tsx` - Role checks

**Total Changes:** ~50 lines of refactoring + 120 lines of new centralized config

---

## Verification Checklist

- ✅ `src/lib/roles.ts` created and exported
- ✅ `src/types/roles.ts` re-exports from lib/roles
- ✅ Database schema updated (no 'business' role)
- ✅ Setup profile endpoint uses 'staff' role
- ✅ All dashboards support new role types
- ✅ No breaking route changes
- ✅ All files compile (npm run build successful)
- ✅ TypeScript types consistent across codebase
- ✅ No marketplace language anywhere
- ✅ Role descriptions updated for construction industry

---

## How to Use Moving Forward

**When you need to reference roles:**

```typescript
// ✅ Import from single source of truth
import { 
  UserRole, 
  ROLE_DASHBOARDS, 
  ROLE_DISPLAY_NAMES, 
  isContractor,
  canCreateQuotes 
} from '@/lib/roles';

// ✅ Use role types with confidence
const userDashboard = ROLE_DASHBOARDS[userRole];
const displayName = ROLE_DISPLAY_NAMES[userRole];

// ✅ Use helper functions
if (isContractor(userRole)) { ... }
if (canCreateQuotes(userRole)) { ... }
```

---

**Phase C0 Status: 🎉 COMPLETE & READY FOR NEXT PHASE**
