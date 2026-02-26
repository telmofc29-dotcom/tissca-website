'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getSupabaseEnv, getOrCreateAppProfile } from '@/lib/supabase';
import { PasswordInput } from '@/components/ui/password-input';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const env = getSupabaseEnv();
    if (!env) {
      setSupabaseConfigured(false);
      setError(
        'Supabase is not configured. Run "npm run check-env" to verify environment variables.'
      );
      console.error('[SignIn] Supabase environment variables not found.');
    }
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      console.log(`[SignIn] Attempting to sign in with email: ${email}`);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error(
          `[SignIn] Authentication error - Code: ${error.name}, Message: ${error.message}`
        );
        setError(error.message);
        setIsLoading(false);
        return;
      }

      if (!data.user) {
        console.error('[SignIn] No user returned from Supabase');
        setError('Sign in failed. Please try again.');
        setIsLoading(false);
        return; 
      }

      console.log(`[SignIn] Successfully signed in. User ID: ${data.user.id}`);
      console.log(`[SignIn] User email: ${data.user.email}`);
      console.log(`[SignIn] Setting session cookies...`);

      // Set session cookies on server so middleware can see the session
      const sessionResponse = await fetch('/api/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: data.session?.access_token,
          refreshToken: data.session?.refresh_token,
        }),
      });

      if (!sessionResponse.ok) {
        console.error('[SignIn] Failed to set session cookies');
        setError('Failed to complete sign in. Please try again.');
        setIsLoading(false);
        return;
      }

      console.log(`[SignIn] Session cookies set successfully`);

      // Ensure app profile exists
      await getOrCreateAppProfile(data.user);
      console.log(`[SignIn] Resolving post-login route from /api/user/me...`);

      let destination = '/dashboard';
      try {
        const meResponse = await fetch('/api/user/me', {
          headers: {
            Authorization: `Bearer ${data.session?.access_token}`,
          },
        });

        if (meResponse.ok) {
          const meData = await meResponse.json();
          // Platform staff is a global product-admin concern (tissca_staff), separate from per-workspace roles in workspace_members.
          if (meData?.is_platform_staff === true) {
            destination = '/admin';
          }
        }
      } catch (meError) {
        console.error('[SignIn] Failed to resolve /api/user/me route check:', meError);
      }

      console.log(`[SignIn] Redirecting to ${destination}...`);

      // Clear any previous errors
      setError('');
      
      // Push after proof-based route resolution
      router.push(destination);
      
      // Refresh to ensure latest server state
      setTimeout(() => {
        router.refresh();
      }, 100);
    } catch (err: any) {
      const errorMsg = err.message || 'An error occurred';
      console.error('[SignIn] Exception during sign-in:', err);
      setError(errorMsg);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Sign in</h1>
          <p className="text-secondary">Welcome back to TISSCA</p>
        </div>

        <form onSubmit={handleSignIn} className="bg-white p-8 rounded shadow-md">
          {error && (
            <div className="mb-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <h3 className="font-semibold text-red-900 mb-1">Sign-in Error</h3>
                <p className="text-red-700 text-sm mb-2">{error}</p>
                {!supabaseConfigured && (
                  <p className="text-red-600 text-xs mt-2">
                    💡 Hint: Run <code className="bg-red-100 px-1 rounded">npm run check-env</code> to
                    verify environment variables are set correctly.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-secondary mb-2">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!supabaseConfigured || isLoading}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded text-black bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="you@example.com"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-secondary mb-2">
              Password
            </label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!supabaseConfigured || isLoading}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded text-black bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={!supabaseConfigured || isLoading}
            className="w-full bg-primary text-white py-2 rounded font-medium hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-secondary text-sm mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary font-medium hover:text-accent">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
