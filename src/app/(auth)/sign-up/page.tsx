'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getSupabaseEnv } from '@/lib/supabase';
import { PasswordInput } from '@/components/ui/password-input';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if Supabase is configured on component mount
    const env = getSupabaseEnv();
    if (!env) {
      setSupabaseConfigured(false);
      setError('Supabase is not configured. Check your environment variables.');
      console.error('[SignUp] Supabase environment variables not found.');
      console.error('[SignUp] Run: npm run check-env');
    } else {
      console.log('[SignUp] Supabase configured and ready.');
    }
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!supabaseConfigured) {
      setError('Supabase is not configured. Cannot sign up.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      console.log('[SignUp] Attempting signup for:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.tissca.com'}/auth/verified`,
        },
      });

      if (error) {
        console.error('[SignUp] Supabase error:', error.code, error.message);
        setError(error.message || 'An error occurred during signup');
      } else if (data.user) {
        console.log('[SignUp] Success! User created:', data.user.id);
        // Redirect to sign-in or check email page
        router.push('/login?message=Check your email to confirm your account');
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'An unexpected error occurred';
      console.error('[SignUp] Exception:', errorMessage, err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Create account</h1>
          <p className="text-secondary">Join TISSCA today</p>
        </div>

        <form onSubmit={handleSignUp} className="bg-white p-8 rounded shadow-md">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              <div className="font-semibold mb-1">Error</div>
              <div>{error}</div>
              {!supabaseConfigured && (
                <div className="text-xs mt-2 text-red-600">
                  Run <code className="bg-red-100 px-1 rounded">npm run check-env</code> to verify setup
                </div>
              )}
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
              disabled={isLoading || !supabaseConfigured}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded text-black bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
              placeholder="you@example.com"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-secondary mb-2">
              Password
            </label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading || !supabaseConfigured}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded text-black bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
              placeholder="••••••••"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-secondary mb-2">
              Confirm password
            </label>
            <PasswordInput
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading || !supabaseConfigured}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded text-black bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !supabaseConfigured}
            className="w-full bg-primary text-white py-2 rounded font-medium hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-secondary text-sm mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-medium hover:text-accent">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
