# TISSCA Sync Contract (Web + Android)

Last updated: 3 February 2026

## 1) Auth Identity Rules
- Single identity provider: Supabase Auth.
- The same Supabase project is used by web and Android.
- The Supabase user id (`auth.users.id`) is the canonical identity for all services.
- Email verification redirects to:
  - https://www.tissca.com/auth/verified
  - https://www.tissca.com/auth/verified/

## 2) Environment Configuration (Web)
Set these in .env.local (no hardcoding in code):
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_BASE_URL=https://www.tissca.com

Supabase Site URL and redirect URLs must include:
- https://www.tissca.com
- https://www.tissca.com/auth/verified
- https://www.tissca.com/auth/verified/
 - http://localhost:3000/auth/verified (temporary for local testing)

## 3) Profile Source of Truth
Table: `public.profiles`

Minimum fields:
- id (uuid, primary key, references auth.users.id)
- email (text, not null)
- full_name (text)
- company_name (text)
- phone (text)
- plan (text, one of: free | pro | team)
- created_at (timestamptz)
- updated_at (timestamptz)

Rules:
- On first login, a profile row is upserted if missing.
- Web and Android both read/write the same profile row.

## 4) Plan Tiers
- free: Base access, standard limits.
- pro: Professional tier with higher limits and branding controls.
- team: Team tier with multi-user capabilities (future expansion).

## 5) Feature Gating Helpers (Web)
- `isPro(plan)` returns true for `pro` and `team`.
- `isTeam(plan)` returns true for `team`.
