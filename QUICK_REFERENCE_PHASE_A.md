# BUILDR Phase A - Quick Reference

## Authentication

### Sign Up a User

```typescript
// Client side
const { signUp } = useAuth();
await signUp('user@example.com', 'password123', 'John Doe');
```

### Sign In a User

```typescript
const { signIn } = useAuth();
await signIn('user@example.com', 'password123');
```

### Get Current User

```typescript
const { user, isLoggedIn, tier } = useAuth();

if (isLoggedIn) {
  console.log(`Logged in as ${user.email} on ${tier} tier`);
}
```

### Sign Out

```typescript
const { signOut } = useAuth();
await signOut();
```

## Access Control

### Check if User Can Access Feature

```typescript
import { canAccessFeature } from '@/types/auth';

if (canAccessFeature(tier, 'remove_watermark')) {
  // Show premium feature
}
```

### Protected API Routes

```typescript
// Automatic protection via middleware
import { protectRoute } from '@/lib/access-control';

export async function GET(req: NextRequest) {
  const error = await protectRoute(req, 'premium');
  if (error) return error; // User not premium
  
  // Rest of route logic
}
```

## Database Operations

### Get Current User

```typescript
import { getUserBySupabaseId } from '@/lib/db';

const user = await getUserBySupabaseId(supabaseId);
// Returns: { id, email, subscription, profile, ... }
```

### Update User Profile

```typescript
import { updateUserProfile } from '@/lib/db';

await updateUserProfile(userId, {
  country: 'US',
  currency: 'USD',
  tradeType: 'painter',
  dailyRate: 150,
});
```

### Get Subscription

```typescript
import { getSubscription } from '@/lib/db';

const sub = await getSubscription(userId);
console.log(sub.tier); // 'free' or 'premium'
```

## Environment Variables

Required for Phase A:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://...
```

Future (Phase B):

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Common Patterns

### Protected Page (Client-side)

```typescript
'use client';

import { useAuth } from '@/context/auth-context';
import { redirect } from 'next/navigation';

export default function DashboardPage() {
  const { isLoggedIn, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!isLoggedIn) redirect('/auth/login');

  return <div>Dashboard content</div>;
}
```

### Premium Feature Gate

```typescript
'use client';

import { useAuth } from '@/context/auth-context';
import { canAccessFeature } from '@/types/auth';

export function PremiumFeature() {
  const { tier } = useAuth();

  if (!canAccessFeature(tier, 'remove_watermark')) {
    return (
      <div className="bg-yellow-50 p-4 rounded">
        <p>This feature requires Premium</p>
        <button>Upgrade to Premium</button>
      </div>
    );
  }

  return <div>Premium content here</div>;
}
```

### API Route with Auth

```typescript
// POST /api/user/quotes
import { getUserBySupabaseId } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.admin.getUserById(
    authHeader.replace('Bearer ', '').split('.')[0]
  );

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Get user from database
  const dbUser = await getUserBySupabaseId(user.id);

  // Do something with user data
  const body = await req.json();
  
  // Return response
  return NextResponse.json({ success: true });
}
```

## Debugging

### Check User Auth State

```typescript
const { user, isLoggedIn, tier, loading } = useAuth();

console.log('Logged in:', isLoggedIn);
console.log('User:', user?.email);
console.log('Tier:', tier);
console.log('Loading:', loading);
```

### Test API Endpoint

```bash
# Get auth token first
# Then:

curl -X POST http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "GB",
    "currency": "GBP",
    "tradeType": "painter"
  }'
```

### View Database

```bash
# Open Prisma Studio
npx prisma studio

# Runs on http://localhost:5555
# View, edit, delete records in real-time
```

## Feature Access Reference

### Free Tier

- view_public_content
- save_calculator_results
- generate_quotes (basic, watermarked)
- generate_invoices (basic, watermarked)

### Premium Tier

- Everything in Free tier
- view_no_ads
- access_mobile_app
- upload_business_logo
- remove_watermark
- save_clients

## Stripe Integration (Phase B Preview)

```typescript
// When you're ready for Phase B:

// 1. Install Stripe
npm install stripe

// 2. Create checkout session
export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  
  const session = await stripe.checkout.sessions.create({
    // Configuration here
  });
  
  return NextResponse.json({ sessionId: session.id });
}

// 3. Handle webhook
export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const sig = req.headers.get('stripe-signature')!;
  
  const event = stripe.webhooks.constructEvent(
    await req.text(),
    sig,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
  
  // Update subscription in database based on event
}
```

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── signup/route.ts
│   │   │   ├── signin/route.ts
│   │   │   └── signout/route.ts
│   │   ├── user/
│   │   │   └── profile/route.ts
│   │   └── subscription/
│   │       └── route.ts
│   └── (public)/
│       ├── auth/
│       │   ├── login/page.tsx (Phase B)
│       │   └── signup/page.tsx (Phase B)
│       └── dashboard/
│           └── page.tsx (Phase B)
├── context/
│   └── auth-context.tsx
├── lib/
│   ├── supabase.ts
│   ├── db.ts
│   └── access-control.ts
├── types/
│   └── auth.ts
└── config/
    └── brand.ts
```

## Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Missing Supabase env vars" | `.env.local` incomplete | Fill in all required vars |
| "DATABASE_URL not set" | PostgreSQL URL missing | Add Supabase connection string |
| "Prisma client not found" | Client not generated | Run `npx prisma generate` |
| "401 Unauthorized" | Token invalid/missing | Check Authorization header |
| "403 Forbidden" | User tier doesn't allow feature | Check subscription tier |
| "User not found" | Supabase ID mismatch | Verify supabaseId in database |

## Performance Tips

1. **Use auth context sparingly** - It's global state, cache results when possible
2. **Batch database queries** - Get user + subscription in one query
3. **Cache subscription tier** - Check once per session, not per request
4. **Lazy load premium features** - Only fetch if tier allows

## Links

- [Supabase Docs](https://supabase.com/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Phase A Setup](./PHASE_A_SETUP.md)
- [Architecture Overview](./ARCHITECTURE_PHASE_A.md)
