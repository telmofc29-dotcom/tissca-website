# Supabase Authentication Setup Guide

This document explains how to configure Supabase authentication for the BUILDR application.

## Quick Start

1. **Get your Supabase credentials:**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Select your project
   - Navigate to **Settings > API**
   - Copy the following values:
     - Project URL (Your API URL)
     - Anon (public) key
     - Service Role secret

2. **Copy the environment template:**
   ```bash
   cp .env.local.example .env.local
   ```

3. **Fill in your credentials in `.env.local`:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-here
   ```

4. **Verify your setup:**
   ```bash
   npm run check-env
   ```
   You should see:
   ```
   ✓ NEXT_PUBLIC_SUPABASE_URL
   ✓ NEXT_PUBLIC_SUPABASE_ANON_KEY
   ✓ SUPABASE_SERVICE_ROLE_KEY
   ```

5. **Restart the development server:**
   ```bash
   npm run dev
   ```

## Important Notes

### Environment Variables

- **Do NOT wrap values in quotes** in `.env.local`
  - ✗ Wrong: `NEXT_PUBLIC_SUPABASE_URL="https://..."`
  - ✓ Correct: `NEXT_PUBLIC_SUPABASE_URL=https://...`

- **`.env.local` is NOT committed to git** - it's in `.gitignore`
  - Each developer must create their own `.env.local`
  - Each environment (dev, staging, prod) has its own credentials

- **Restart `npm run dev` after changing `.env.local`**
  - Next.js reads env vars once at startup
  - Changes to `.env.local` require restarting the dev server

### Variable Purpose

| Variable | Type | Usage | Where to Get |
|----------|------|-------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Browser, API routes | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Browser auth only | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Server-side operations | Supabase Dashboard > Settings > API |

- **Public variables** (NEXT_PUBLIC_*) are visible in browser bundles - they're safe because Supabase auth has row-level security
- **Secret variables** should never be exposed to the browser

## Troubleshooting

### "Failed to fetch" on signup

1. Check that Supabase variables are set:
   ```bash
   npm run check-env
   ```

2. Verify the URL is correct (no trailing slashes):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   ```

3. Check browser console (F12) for detailed error messages

4. Ensure you've restarted `npm run dev` after editing `.env.local`

### "Supabase is not configured"

This error means one or more required env vars are missing:

1. Run: `npm run check-env`
2. Copy `.env.local.example` to `.env.local` if it doesn't exist
3. Fill in all required variables from Supabase Dashboard
4. Restart `npm run dev`

### Network errors (net::ERR_NAME_NOT_RESOLVED)

This typically means the Supabase URL is invalid:

1. Double-check the URL from Supabase Dashboard
2. Remove any extra spaces or quotes
3. Ensure it's a valid HTTPS URL starting with `https://`

## For Production Deployment

1. **Set environment variables in your deployment platform:**
   - Vercel: Project Settings > Environment Variables
   - AWS: Lambda environment variables
   - Docker: Pass as --env flags or in .env

2. **Use a different Supabase project for production**
   - Never use the same project for dev and production

3. **Rotate your Service Role Secret regularly**
   - Supabase Dashboard > Settings > API > Service Role Secret > Rotate

4. **Enable additional security:**
   - Supabase Dashboard > Authentication > Providers > Email > Configure SMTP
   - Set up email templates for password resets and confirmations

## Development vs. Production

### Development (.env.local)
- Can be a test/staging Supabase project
- Easier for testing
- Not committed to git

### Production
- Use a dedicated production Supabase project
- Set env vars through your deployment platform
- Never commit secrets to git
- Regularly audit API keys and regenerate them

## API Rate Limits

- Supabase has rate limits on auth endpoints
- Default: 120 requests per minute per IP
- See: [Supabase Documentation](https://supabase.com/docs/guides/auth)

## More Information

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [BUILDR README](./README.md)
