# BUILDR Phase A (Foundation) - Setup Guide

## Overview

Phase A implements the core authentication, subscription, and access control system. This guide walks through the setup process.

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (https://supabase.com)
- Stripe account (https://stripe.com) - for future Phase B

## Step 1: Install Dependencies

```bash
npm install @supabase/supabase-js @prisma/client prisma stripe
npm install -D prisma
```

## Step 2: Set Up Supabase

1. Create a new Supabase project at https://supabase.com
2. Go to **Settings > API**
3. Copy the following to `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` (Project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon public key)
   - `SUPABASE_SERVICE_ROLE_KEY` (service_role key - KEEP SECRET)

### Enable Email Authentication in Supabase

1. Go to **Authentication > Providers**
2. Enable **Email**
3. Configure email settings as needed

## Step 3: Set Up PostgreSQL Database

1. In Supabase, go to **SQL Editor**
2. Create a new query
3. Copy the content from your Prisma schema
4. Run the migration

OR use Prisma CLI:

```bash
# Copy .env.local.example to .env.local
cp .env.local.example .env.local

# Fill in DATABASE_URL from Supabase
# Then run migration:
npx prisma migrate dev --name init
```

## Step 4: Generate Prisma Client

```bash
npx prisma generate
```

## Step 5: Configure Environment Variables

Create `.env.local`:

```env
# Database
DATABASE_URL="postgresql://postgres:password@db.supabase.co:5432/postgres?schema=public&sslmode=require"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJh..."
SUPABASE_SERVICE_ROLE_KEY="eyJh..."

# Stripe (Phase B - leave empty for now)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""

# Application
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
NODE_ENV="development"
```

## Step 6: Test Authentication

Run the development server:

```bash
npm run dev
```

Test the authentication flow:

1. **Sign Up**: POST to `/api/auth/signup`
   ```json
   {
     "email": "user@example.com",
     "password": "password123",
     "name": "John Doe"
   }
   ```

2. **Sign In**: POST to `/api/auth/signin`
   ```json
   {
     "email": "user@example.com",
     "password": "password123"
   }
   ```

3. **Get Profile**: GET to `/api/user/profile` with Authorization header
   ```
   Authorization: Bearer {session_token}
   ```

## What's Implemented (Phase A)

✅ **Authentication**
- User signup with email/password
- User sign in
- Session management (Supabase)
- Password reset ready (not UI yet)

✅ **Database**
- User accounts
- Profiles (country, currency, trade type, rates)
- Subscriptions (free vs premium)
- Quotes and invoices structure
- Clients management

✅ **Subscription**
- Free tier (default for all users)
- Premium tier (Stripe-ready)
- Tier switching logic
- Feature access control

✅ **Access Control**
- Public content (no login required)
- Protected routes (login required)
- Premium-only features
- Feature availability by subscription tier

✅ **API Routes**
- `/api/auth/signup` - Create new account
- `/api/auth/signin` - Sign in
- `/api/auth/signout` - Sign out
- `/api/user/profile` - Get/update profile
- `/api/subscription` - Get subscription status

## What's Next (Phase B)

- User dashboards and pages
- Stripe integration for payment processing
- Quote and invoice generation UI
- Premium upsell flow
- Admin dashboard for oversight
- Financial reporting panel

## Key Files

- `prisma/schema.prisma` - Database schema
- `src/lib/supabase.ts` - Supabase client
- `src/lib/db.ts` - Database operations (Prisma)
- `src/lib/access-control.ts` - Authorization middleware
- `src/types/auth.ts` - Type definitions
- `src/app/api/auth/*` - Authentication endpoints
- `src/app/api/user/*` - User endpoints
- `src/config/brand.ts` - Feature flags and pricing

## Common Issues

### "Missing Supabase environment variables"
- Check `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### "DATABASE_URL not set"
- Make sure you've copied the PostgreSQL connection string from Supabase
- It should look like: `postgresql://postgres:password@db.supabase.co:5432/postgres?...`

### "Prisma client not generated"
- Run: `npx prisma generate`

### Database migration fails
- Check PostgreSQL connection is working
- Verify Supabase database is accessible
- Try: `npx prisma db push` instead of migrate

## Testing Checklist

- [ ] User can sign up with email/password
- [ ] User can sign in with credentials
- [ ] User can update profile (country, currency, trade type, rates)
- [ ] Free tier has correct feature access
- [ ] Premium tier has correct feature access
- [ ] Subscription status returns correctly
- [ ] API routes return proper authorization errors

## Next Steps

1. Create user dashboard pages
2. Implement Stripe integration
3. Add quote/invoice generation
4. Build admin dashboard
5. Deploy to production

---

For detailed API documentation, see `src/app/api/*/route.ts` files.
