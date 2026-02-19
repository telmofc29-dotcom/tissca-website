# BUILDR Phase A - Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         React Components + Next.js Pages             │  │
│  │  - Login/Signup UI                                   │  │
│  │  - User Dashboard                                    │  │
│  │  - Profile Settings                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Auth Context (useAuth hook)                 │  │
│  │  - Session management                                │  │
│  │  - User state                                        │  │
│  │  - Subscription tier                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │      Supabase Client (Public API)                    │  │
│  │  - Direct auth with Supabase                         │  │
│  │  - Real-time listeners                               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         │                    │                    │
    HTTP/HTTPS             HTTP/HTTPS         HTTP/HTTPS
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    NEXT.JS SERVER                            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            API Routes (/app/api/)                    │  │
│  │  - /auth/signup, /signin, /signout                   │  │
│  │  - /user/profile (GET/PUT)                           │  │
│  │  - /subscription (GET/POST)                          │  │
│  │  - /quotes, /invoices (future)                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │        Middleware & Access Control                   │  │
│  │  - getAccessContext()                                │  │
│  │  - protectRoute()                                    │  │
│  │  - canAccessFeature()                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Database Operations (Prisma)                 │  │
│  │  - upsertUser()                                      │  │
│  │  - updateUserProfile()                               │  │
│  │  - getSubscription()                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │      Supabase Server Client (Admin APIs)             │  │
│  │  - Service role authentication                       │  │
│  │  - Admin user management (future)                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                                    │
    HTTP/REST                          HTTP/REST (TLS)
         │                                    │
         ▼                                    ▼
┌──────────────────────────┐      ┌────────────────────────────┐
│   SUPABASE AUTH          │      │   POSTGRESQL DATABASE      │
│                          │      │  (Supabase Hosted)         │
│ - User accounts          │      │                            │
│ - Email/password         │      │ Tables:                    │
│ - Sessions               │      │  - User                    │
│ - JWTs                   │      │  - UserProfile             │
│                          │      │  - Subscription            │
│                          │      │  - Quote                   │
│                          │      │  - Invoice                 │
│                          │      │  - Client                  │
│                          │      │  - PricingProfile          │
└──────────────────────────┘      └────────────────────────────┘
```

## Authentication Flow

### Signup Flow

```
User Sign Up
    ↓
[Client] POST /api/auth/signup
    ├─ Email, password, name
    ↓
[Server] Validate input
    ↓
[Supabase Auth] Create auth user
    ├─ Returns: user ID, session
    ↓
[Prisma] Create user record + profile + subscription
    ├─ User table
    ├─ UserProfile (country, currency defaults)
    ├─ Subscription (tier: 'free', status: 'active')
    ↓
[Server] Return user + session to client
    ↓
[Client] Store session in Supabase client
    ├─ localStorage (automatically)
    ├─ Update auth context
    ├─ Redirect to /dashboard
    ↓
Done
```

### Sign In Flow

```
User Sign In
    ↓
[Client] POST /api/auth/signin
    ├─ Email, password
    ↓
[Server] Validate input
    ↓
[Supabase Auth] Authenticate user
    ├─ Returns: user ID, session
    ↓
[Prisma] Fetch user + subscription
    ↓
[Server] Return user + session
    ↓
[Client] Store session
    ├─ Update auth context
    ├─ Fetch subscription tier
    ├─ Redirect to /dashboard
    ↓
Done
```

### Access Control Flow

```
User requests protected resource
    ↓
[Middleware] Check route protection level
    ├─ public: Always allowed
    ├─ authenticated: Requires login
    ├─ premium: Requires login + premium tier
    ├─ admin: Requires admin role (future)
    ↓
[Authorization] Extract Bearer token from header
    ↓
[Supabase] Verify JWT token
    ├─ Valid? Continue
    ├─ Invalid? Return 401
    ↓
[Prisma] Get user with subscription
    ↓
[Feature Check] Can user access this feature?
    ├─ Check FEATURE_ACCESS mapping
    ├─ Allowed? Return data
    ├─ Not allowed? Return 403
    ↓
Done
```

## Database Schema Overview

### User (Supabase Auth ↔ Database)

```
User (Prisma)
├─ id: string (CUID)
├─ email: string (unique)
├─ supabaseId: string (linked to Supabase auth)
├─ name: string?
├─ emailVerified: DateTime?
├─ createdAt: DateTime
├─ updatedAt: DateTime
└─ Relations
   ├─ subscription: Subscription
   ├─ profile: UserProfile
   ├─ quotes: Quote[]
   └─ invoices: Invoice[]
```

### Subscription

```
Subscription
├─ tier: 'free' | 'premium'
├─ status: 'active' | 'cancelled' | 'expired' | 'unpaid'
├─ stripeCustomerId: string?
├─ stripeSubscriptionId: string?
└─ Renewal dates (for future billing)
```

### UserProfile

```
UserProfile
├─ country: string (default: 'GB')
├─ currency: string (default: 'GBP')
├─ units: 'metric' | 'imperial'
├─ tradeType: string? (e.g., 'painter')
├─ businessName: string?
├─ businessLogo: string? (URL)
├─ dailyRate: float?
└─ monthlyRate: float?
```

## Key Design Decisions

### 1. Supabase Auth + Prisma Database

- **Why**: Supabase handles authentication (secure, battle-tested). Prisma manages relational data.
- **Benefit**: Separation of concerns. Auth is handled by Supabase, business logic in Prisma.
- **Trade-off**: Two systems to manage, but each is best-in-class.

### 2. JWT-Based Server Authentication

- **Why**: API routes need to verify requests from the client.
- **How**: Client sends `Authorization: Bearer {token}` header.
- **Verification**: Server validates JWT with Supabase service role.

### 3. Free Tier Default

- **Why**: All users start with free tier. No need for signup flow variation.
- **Future**: Premium subscription created at signup, but tier remains 'free' until payment.

### 4. Feature Access Mapping

- **FEATURE_ACCESS** object defines what each tier can do.
- **Centralized**: Single source of truth (doesn't require database lookup).
- **Consistent**: Server and client use same mapping.

### 5. Profile Completeness

- **UserProfile** created automatically on user creation.
- **Optional fields**: Country/currency defaults provided.
- **User can update**: Profile endpoint allows changes anytime.

## Implementation Status

### Phase A (Foundation) - Current

✅ Complete:
- User authentication (signup/signin/signout)
- User profiles (country, currency, trade type, rates)
- Subscription tiers (free/premium)
- Access control (feature mapping)
- API routes for auth and profiles
- Type safety (TypeScript)
- Database schema (Prisma)

🚧 Ready for Phase B:
- User dashboard pages
- Stripe integration
- Quote/invoice generation
- Admin dashboard
- Analytics and reporting

❌ Future phases:
- Mobile app authentication
- SSO (Google, GitHub)
- Advanced permissions
- Rate limiting
- Audit logs

## Security Considerations

### Authentication

- ✅ Passwords never stored (Supabase manages)
- ✅ JWTs issued by Supabase (signed, time-limited)
- ✅ Service role key never exposed to client
- ✅ Environment variables for secrets

### Authorization

- ✅ Feature access checked per request
- ✅ Subscription status verified before allowing premium features
- ✅ User cannot modify other users' data (userId checks)

### Database

- ✅ Prisma prevents SQL injection
- ✅ Row-level security (future: RLS policies in Supabase)
- ✅ Encrypted connection to database

### API Endpoints

- ⚠️ Rate limiting (implement in Phase B)
- ⚠️ CORS configuration (implement in Phase B)
- ⚠️ Request validation (add zod/joi in Phase B)

## Testing Strategy

### Unit Tests (Future)

```typescript
// Test FEATURE_ACCESS mapping
- canAccessFeature(tier, feature) ✓
- Feature boundaries respected

// Test database operations
- upsertUser()
- updateUserProfile()
```

### Integration Tests (Future)

```
- Full signup flow
- Full signin flow
- Profile update flow
- Subscription status retrieval
```

### E2E Tests (Future)

```
- User signup → email verification → signin → profile setup → dashboard
- Free user tries premium feature → sees upgrade prompt
- Premium user accesses premium features → succeeds
```

## Monitoring & Logging

### Current

- ✅ Error logging to console
- ✅ Prisma logging (errors and warnings)

### Phase B

- Structured logging (Winston, Pino)
- Error tracking (Sentry)
- Performance monitoring
- Analytics pipeline

## Next Steps

1. **Create dashboard pages** (Phase B)
2. **Integrate Stripe** (Phase B)
3. **Build quote/invoice system** (Phase B)
4. **Admin oversight panel** (Phase B)
5. **Deploy to staging** (verify auth flow)
6. **Load testing** (prepare for scale)

---

For implementation details, see:
- [Phase A Setup Guide](./PHASE_A_SETUP.md)
- [Authentication Types](./src/types/auth.ts)
- [Database Operations](./src/lib/db.ts)
- [Supabase Configuration](./src/lib/supabase.ts)
