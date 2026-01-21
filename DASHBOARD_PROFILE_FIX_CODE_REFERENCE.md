# Dashboard Profile Fix - Code Changes Reference

## Quick Lookup Table

| File | Change Type | Key Updates |
|------|------------|-------------|
| `src/lib/supabase.ts` | **NEW FUNCTIONS** | `getSupabaseClient()`, `getUserProfile()` |
| All Dashboard Pages (4) | Client init + Profile fetch | Singleton + auto-create |
| All List Pages (3) | Client init + Profile fetch | Singleton + auto-create |
| All Detail Pages (6) | Client init + Profile fetch | Singleton + auto-create |
| `DashboardShell.tsx` | Client init | Singleton client |

---

## Core Library Changes

### File: `src/lib/supabase.ts`

#### Change 1: Singleton Client (BEFORE)
```typescript
// ❌ OLD: Created new instance every time
export const supabase = (() => {
  const env = getSupabaseEnv();
  if (!env) return null as any;
  return createClient(env.url, env.anonKey);
})();
```

#### Change 1: Singleton Client (AFTER)
```typescript
// ✅ NEW: Single instance cached
let supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    const env = getSupabaseEnv();
    if (!env) {
      console.warn('[Supabase] Client not initialized - missing env vars');
      return null;
    }
    supabaseClient = createClient(env.url, env.anonKey);
    console.log('[Supabase] Browser client initialized (singleton)');
  }
  return supabaseClient;
}

export const supabase = (() => {
  if (typeof window === 'undefined') {
    return null as any;
  }
  return getSupabaseClient();
})();
```

#### Change 2: New Function - getUserProfile (ADDED)
```typescript
/**
 * Get user profile from user_profile table
 * If profile doesn't exist, creates a default one automatically
 * Resolves the 404 error on dashboard load
 */
export async function getUserProfile(userId: string) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('[Supabase] Client not initialized');
  }

  // Try to fetch existing profile
  let { data: profile, error } = await client
    .from('user_profile')
    .select('*')
    .eq('userId', userId)
    .single();

  // If profile doesn't exist, create a default one
  if (error && error.code === 'PGRST116') {
    console.log(`[Profile] Creating default profile for user ${userId}`);
    
    const { data: newProfile, error: createError } = await client
      .from('user_profile')
      .insert({
        userId,
        displayName: 'New User',
        country: 'GB',
        currency: 'GBP',
        units: 'metric',
      })
      .select()
      .single();
    
    if (createError) {
      console.error('[Profile] Failed to create default profile:', createError);
      throw createError;
    }
    
    profile = newProfile;
  } else if (error) {
    console.error('[Profile] Failed to fetch profile:', error);
    throw error;
  }

  return profile;
}
```

---

## Dashboard Page Changes (Pattern)

### File: `src/app/dashboard/app/page.tsx` (Example)

#### Import Section
```typescript
// ❌ OLD
import { createClient } from '@supabase/supabase-js';

// ✅ NEW
import { getSupabaseClient, getUserProfile } from '@/lib/supabase';
```

#### Component Initialization
```typescript
// ❌ OLD
export default function ContractorDashboard() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({...});
  const [loading, setLoading] = useState(true);

// ✅ NEW
export default function ContractorDashboard() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({...});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
```

#### useEffect Hook - Profile Fetch
```typescript
// ❌ OLD
useEffect(() => {
  const loadData = async () => {
    try {
      // Get user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/sign-in');
        return;
      }

      // Get user profile to verify role
      const { data: profile } = await supabase
        .from('profiles')          // ❌ WRONG TABLE
        .select('role, business_id')
        .eq('id', user.id)
        .single();

      if (!profile) {
        router.push('/sign-in');
        return;
      }

      // Only allow staff and accountant roles
      if (!['staff', 'accountant'].includes(profile.role)) {
        router.push('/dashboard/' + profile.role);
        return;
      }

      setUserRole(profile.role);
      setStats({...});
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setLoading(false);
    }
  };

  loadData();
}, [supabase, router]);

// ✅ NEW
useEffect(() => {
  const loadData = async () => {
    try {
      if (!supabase) {
        setError('Supabase not configured');
        setLoading(false);
        return;
      }

      // Get user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.log('[Dashboard] No user found, redirecting to sign-in');
        router.push('/sign-in');
        return;
      }

      console.log(`[Dashboard] Loading profile for user ${user.id}`);

      // Get user profile (with auto-create if missing)
      const profile = await getUserProfile(user.id);

      if (!profile) {
        console.error('[Dashboard] Profile is null after fetch/create');
        setError('Failed to load profile. Please sign in again.');
        setLoading(false);
        return;
      }

      console.log('[Dashboard] Profile loaded:', { 
        role: profile.role || 'N/A', 
        business_id: profile.businessId || 'N/A' 
      });

      const role = profile.role || 'staff';
      const businessId = profile.businessId;

      // Only allow staff and accountant roles
      if (!['staff', 'accountant'].includes(role)) {
        console.log(`[Dashboard] User role ${role} not allowed, redirecting`);
        router.push('/dashboard/' + role);
        return;
      }

      setUserRole(role);

      // TODO: Load stats from database
      setStats({
        quotes: 12,
        invoices: 8,
        revenue: 45000,
        clients: 6,
      });

      setLoading(false);
    } catch (error) {
      console.error('[Dashboard] Error loading data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard');
      setLoading(false);
    }
  };

  loadData();
}, [supabase, router]);
```

#### Loading & Error UI
```typescript
// ❌ OLD
if (loading) {
  return <div>Loading...</div>;
}

return (
  <DashboardShell {...props}>
    {/* content */}
  </DashboardShell>
);

// ✅ NEW
if (loading) {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  );
}

if (error) {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mb-4 text-4xl">⚠️</div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Failed to Load Dashboard
        </h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            setError('');
            window.location.reload();
          }}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

return (
  <DashboardShell {...props}>
    {/* content */}
  </DashboardShell>
);
```

---

## List Page Changes (Pattern)

### File: `src/app/dashboard/app/quotes/page.tsx` (Example)

#### Module-Level Client (REMOVED)
```typescript
// ❌ OLD - at module level
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const navItems = [...];

export default function StaffQuotesPage() {
  // ...
}

// ✅ NEW - no module-level client, created inside component
const navItems = [...];

export default function StaffQuotesPage() {
  const supabase = getSupabaseClient();
  // ...
}
```

#### Profile Fetch Update
```typescript
// ❌ OLD
const { data: profileData, error: profileError } = await supabase
  .from('profiles')
  .select('role, business_id')
  .eq('id', user.id)
  .single();

if (profileError || !profileData) {
  router.push('/auth/login');
  return;
}

setUserRole(profileData.role);

let query = supabase
  .from('quotes')
  .select('*')
  .eq('business_id', profileData.business_id)

// ✅ NEW
const profileData = await getUserProfile(user.id);

if (!profileData) {
  router.push('/auth/login');
  return;
}

setUserRole(profileData.role);

let query = supabase
  .from('quotes')
  .select('*')
  .eq('business_id', profileData.businessId)
```

---

## Component Changes

### File: `src/components/layout/DashboardShell.tsx`

#### Import Change
```typescript
// ❌ OLD
import { createClient } from '@supabase/supabase-js';

// ✅ NEW
import { getSupabaseClient } from '@/lib/supabase';
```

#### Client Initialization
```typescript
// ❌ OLD
export function DashboardShell({...props}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);
      setLoading(false);
    };
    getUser();
  }, [supabase.auth]);

// ✅ NEW
export function DashboardShell({...props}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = getSupabaseClient();
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const getUser = async () => {
      if (!supabase) {
        console.warn('[DashboardShell] Supabase not configured');
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);
      setLoading(false);
    };
    getUser();
  }, [supabase]);
```

---

## Summary of All File Changes

| File | Type | Changes |
|------|------|---------|
| `src/lib/supabase.ts` | Added | Singleton client + getUserProfile function |
| `src/app/dashboard/app/page.tsx` | Modified | Imports, client init, profile fetch, error handling |
| `src/app/dashboard/admin/page.tsx` | Modified | Imports, client init, profile fetch, error handling |
| `src/app/dashboard/accountant/page.tsx` | Modified | Imports, client init, profile fetch, error handling |
| `src/app/dashboard/client/page.tsx` | Modified | Imports, client init, profile fetch, error handling |
| `src/app/dashboard/app/quotes/page.tsx` | Modified | Imports, client init, profile fetch |
| `src/app/dashboard/app/invoices/page.tsx` | Modified | Imports, client init, profile fetch |
| `src/app/dashboard/app/materials/page.tsx` | Modified | Imports, client init, profile fetch, column names |
| `src/app/dashboard/app/quotes/[id]/page.tsx` | Modified | Imports, client init, profile fetch, column names |
| `src/app/dashboard/app/invoices/[id]/page.tsx` | Modified | Imports, client init, profile fetch, column names |
| `src/app/dashboard/app/quotes/new/page.tsx` | Modified | Imports, client init, profile fetch, column names |
| `src/app/dashboard/client/quotes/page.tsx` | Modified | Imports, client init, profile fetch, column names |
| `src/app/dashboard/client/invoices/page.tsx` | Modified | Imports, client init, profile fetch, column names |
| `src/app/dashboard/client/quotes/[id]/page.tsx` | Modified | Imports, client init, profile fetch |
| `src/app/dashboard/client/invoices/[id]/page.tsx` | Modified | Imports, client init, profile fetch |
| `src/components/layout/DashboardShell.tsx` | Modified | Imports, client init |

---

## Verification Checklist

After applying changes:

### Code Compilation
```bash
✅ npm run build  # Should compile without errors
```

### No TypeScript Errors
```bash
✅ npx tsc --noEmit  # Should have zero errors
```

### Lint Check
```bash
✅ npm run lint  # Should pass all rules
```

### Search for Old Patterns
```bash
# Should return ZERO results
grep -r "createClient(" src/app/dashboard --include="*.tsx"
grep -r "from('profiles')" src/app/dashboard --include="*.tsx"
```

### Console Check
Open DevTools Console and:
```
✅ [Supabase] Browser client initialized (singleton)  // Appears ONCE
❌ Multiple GoTrueClient instances detected           // Should NOT appear
```

### Network Check
Open DevTools Network and sign in:
```
✅ POST /api/auth/callback (201)
✅ GET /rest/v1/user_profile (200)
❌ 404 GET /rest/v1/profiles                         // Should NOT appear
```

---

## Column Name Mapping

If you see errors about undefined properties, check these mappings:

| Old Name | New Name | Usage |
|----------|----------|-------|
| `profile.role` | `profile.role` | No change needed |
| `profile.business_id` | `profile.businessId` | Update all uses |
| `profile.client_id` | `profile.clientId` | Update all uses |

**Example**:
```typescript
// ❌ OLD
.eq('business_id', profileData.business_id)

// ✅ NEW
.eq('business_id', profileData.businessId)
```

---

## Rollback Instructions

If needed, to revert these changes:

### Revert Core Library
Keep old export, add singleton wrapper:
```typescript
export const supabase = (() => {
  const env = getSupabaseEnv();
  if (!env) return null as any;
  return createClient(env.url, env.anonKey);
})();
```

### Revert Dashboard Pages
Change back to:
```typescript
const { data: profile, error } = await supabase
  .from('profiles')
  .select('role, business_id')
  .eq('id', user.id)
  .single();
```

### Remove Error State
Remove error UI and go back to simple loading:
```typescript
if (loading) {
  return <div>Loading...</div>;
}
```

---

## Testing Commands

Run these to verify changes work:

```bash
# Build
npm run build

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Run dev server
npm run dev

# Then test in browser:
# 1. Go to /sign-in
# 2. Sign in with valid account
# 3. Should see spinner, then dashboard loads
# 4. Check console for [Supabase], [Dashboard], [Profile] logs
# 5. Check Network for /rest/v1/user_profile (not /profiles)
# 6. Check Cookies for sb-*-auth-token
```

---

## Key Differences

| Aspect | Old | New |
|--------|-----|-----|
| Client instances | Multiple (one per component) | Single (singleton) |
| Profile table | `profiles` | `user_profile` |
| Profile fetch | Query fails if missing | Auto-creates default |
| Client code | `createClient(...)` | `getSupabaseClient()` |
| Error handling | None (blank page) | Spinner + error UI |
| Column names | `business_id` | `businessId` |
| Console logs | None | Detailed [prefix] logs |

---

## Final Checklist

- [ ] All imports updated to use `getSupabaseClient` and `getUserProfile`
- [ ] All dashboard pages have error state handling
- [ ] No `createClient()` calls remain in dashboard files
- [ ] No `from('profiles')` queries remain
- [ ] All column names updated (`businessId`, not `business_id`)
- [ ] Code compiles without errors
- [ ] No TypeScript errors
- [ ] Lint passes
- [ ] Tested sign-in flow
- [ ] Verified dashboard loads
- [ ] Checked console for errors
- [ ] Verified network requests are clean
- [ ] Confirmed cookies are set
- [ ] Page refresh maintains session
