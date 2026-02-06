'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase, getSupabaseEnv } from '@/lib/supabase';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface UserProfile {
  fullName?: string;
  email: string;
}

export function AuthNav() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [serverSessionValid, setServerSessionValid] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Validate server session by making a request to server
  const validateServerSession = async (token?: string) => {
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch('/api/user/me', { headers });
      setServerSessionValid(response.ok);
    } catch (error) {
      console.error('Failed to validate server session:', error);
      setServerSessionValid(false);
    }
  };

  useEffect(() => {
    // Check if Supabase is configured
    const env = getSupabaseEnv();
    if (!env || !supabase) {
      setIsLoading(false);
      return;
    }

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name,
        });
        fetchUserProfile(session.access_token);
        // Validate that server also has this session
        validateServerSession(session.access_token);
      } else {
        setUser(null);
        setProfile(null);
        setServerSessionValid(false);
      }
      setIsLoading(false);
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name,
        });
        fetchUserProfile(session.access_token);
        validateServerSession(session.access_token);
      } else {
        setUser(null);
        setProfile(null);
        setServerSessionValid(false);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const fetchUserProfile = async (token: string) => {
    try {
      const response = await fetch('/api/user/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setServerSessionValid(false);
    setIsDropdownOpen(false);
    router.push('/');
    router.refresh();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  if (isLoading) {
    return null;
  }

  // Only show user dropdown if both client and server sessions are valid
  // On sign-in page specifically, only show if server session is valid to prevent false "logged in" state
  if (!user || !serverSessionValid || (pathname === '/login' && !serverSessionValid)) {
    // Not logged in - Show Sign in and Create account buttons
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="px-4 py-2 h-10 flex items-center text-sm font-medium text-primary hover:text-accent transition-colors border border-primary rounded hover:bg-gray-50"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="px-4 py-2 h-10 flex items-center text-sm font-medium bg-primary text-white rounded hover:bg-accent transition-colors"
        >
          Create account
        </Link>
      </div>
    );
  }

  // Logged in - Show user profile with settings dropdown
  const displayName = profile?.fullName || user.name || user.email;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 h-10 px-4 py-2 text-sm font-medium text-primary hover:text-accent transition-colors rounded hover:bg-gray-50"
        aria-haspopup="menu"
        aria-expanded={isDropdownOpen}
        title="Account menu"
      >
        <span className="max-w-[150px] truncate">{displayName}</span>
        {/* Settings/Chevron icon */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          className={`transition-transform flex-shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {isDropdownOpen && (
        <div 
          className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded shadow-lg z-50"
          role="menu"
          aria-orientation="vertical"
        >
          <nav className="flex flex-col py-1">
            <Link
              href="/account"
              className="px-4 py-3 text-sm text-secondary hover:bg-gray-50 transition-colors flex items-center gap-2"
              onClick={() => setIsDropdownOpen(false)}
              role="menuitem"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                <path d="M2 13.5a6 6 0 0 1 12 0" />
              </svg>
              <span>Account</span>
            </Link>
            <Link
              href="/account/settings"
              className="px-4 py-3 text-sm text-secondary hover:bg-gray-50 transition-colors flex items-center gap-2"
              onClick={() => setIsDropdownOpen(false)}
              role="menuitem"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8" cy="8" r="1" />
                <path d="M8 3v2M8 11v2M13 8h-2M3 8h2" />
                <path d="M11.66 4.34l-1.42 1.42M4.34 11.66l-1.42 1.42M11.66 11.66l-1.42-1.42M4.34 4.34l-1.42-1.42" />
              </svg>
              <span>Settings</span>
            </Link>
            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={handleLogout}
              className="px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors text-left font-medium flex items-center gap-2 w-full"
              role="menuitem"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M13 8H6M11 6l2 2-2 2" />
                <path d="M8 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h4" />
              </svg>
              <span>Log out</span>
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
