// src/app/(admin)/admin/users/page.tsx v2.2
//
// CHANGES (v2.2):
// - CHANGE: Move Workspace Billing + Voucher Generator out of /admin/users into a dedicated page.
//   - New dedicated page: /admin/vouchers (admin tooling hub)
//   - Users page now links to it with a clear CTA
// - ADD: Bulk email helper on Users page:
//   - Copy emails for current filtered list (plan/staff/confirmed/search)
//   - Proof-based: copies what you can see (no guessing)
// - KEEP: All existing user table, modal tabs, notes, billing modal tab, edit actions, deep-link behaviour.
//
// PURPOSE:
// - Admin Users: enterprise user management (auth + workspace + staff)
// - Keep user management clean; move heavy billing/voucher tooling to /admin/vouchers.
//
// SECURITY (LOCKED / PROOF-BASED):
// - No member-only controls.
// - Protected support account cannot be modified.
// - Proof-based server APIs only (staff-gated).
//
// NOTE:
// - This file must compile.
// - No refactors beyond what’s necessary for the split + bulk email helper.

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

type ApiUserRow = {
  id: string;

  email: string;
  name?: string | null;
  createdAt: string;

  lastSignInAt?: string | null;
  emailConfirmedAt?: string | null;

  currentWorkspaceId?: string | null;
  planTier?: string | null;

  profile?: Record<string, any> | null;

  isPlatformStaff?: boolean;
  staffRole?: string | null;
  staffActive?: boolean;

  supabaseId?: string;
};

type AdminUserNote = {
  id: string;
  user_id: string;
  created_by: string;
  note: string;
  created_at: string;
};

type AdminBillingWorkspaceResponse = {
  workspace?: {
    id: string;
    name: string | null;
    plan_tier: string | null;
    subscription_status: string | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    current_period_end: string | null;
    updated_at?: string | null;
  } | null;
  promo_issues?: Array<{
    id: string;
    workspace_id: string;
    code: string;
    coupon_id: string | null;
    promotion_code_id: string | null;
    percent_off: number | null;
    amount_off: number | null;
    currency: string | null;
    duration: string | null;
    duration_in_months: number | null;
    max_redemptions: number | null;
    redeem_by: string | null;
    created_by: string;
    created_at: string;
    // optional future fields
    kind?: 'campaign' | 'targeted' | null;
    issued_to_email?: string | null;
  }>;
};

const PROTECTED_EMAIL = 'support@tissca.com';

type PlanFilter = 'all' | 'free' | 'pro' | 'team' | 'unknown';
type StaffFilter = 'all' | 'staff' | 'members';
type ConfirmedFilter = 'all' | 'confirmed' | 'unconfirmed';

type ModalTab = 'overview' | 'notes' | 'billing' | 'profile';

function safeLower(v?: string | null) {
  return (v || '').toLowerCase();
}

function normalizePlanTier(raw?: string | null): 'free' | 'pro' | 'team' | 'unknown' {
  const v = safeLower(raw);
  if (!v) return 'unknown';
  if (v === 'free' || v === 'starter') return 'free';
  if (v === 'pro' || v === 'premium') return 'pro';
  if (v === 'team' || v === 'business' || v === 'enterprise') return 'team';
  return 'unknown';
}

function formatPlanLabel(raw?: string | null) {
  const n = normalizePlanTier(raw);
  if (n === 'free') return 'Free';
  if (n === 'pro') return 'Pro';
  if (n === 'team') return 'Team';
  return 'Unknown';
}

function planBadgeClasses(raw?: string | null) {
  const n = normalizePlanTier(raw);
  if (n === 'team') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  if (n === 'pro') return 'bg-purple-50 text-purple-700 border-purple-200';
  if (n === 'free') return 'bg-gray-50 text-gray-700 border-gray-200';
  return 'bg-amber-50 text-amber-800 border-amber-200';
}

function yesNoBadge(ok: boolean) {
  return ok
    ? 'bg-green-50 text-green-700 border-green-200'
    : 'bg-gray-50 text-gray-700 border-gray-200';
}

function fmtDate(d?: string | null, mode: 'date' | 'datetime' = 'date') {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return mode === 'datetime' ? dt.toLocaleString('en-GB') : dt.toLocaleDateString('en-GB');
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // fail silently
  }
}

function statusLabel(raw?: string | null) {
  const v = String(raw ?? '').trim().toLowerCase();
  if (!v) return 'Inactive';
  if (v === 'active') return 'Active';
  if (v === 'trialing') return 'Trial';
  if (v === 'past_due') return 'Past due';
  if (v === 'canceled' || v === 'cancelled') return 'Cancelled';
  if (v === 'incomplete') return 'Incomplete';
  if (v === 'incomplete_expired') return 'Incomplete (expired)';
  if (v === 'unpaid') return 'Unpaid';
  return v.split('_').join(' ');
}

function statusTone(raw?: string | null): 'good' | 'warn' | 'neutral' {
  const v = String(raw ?? '').trim().toLowerCase();
  if (v === 'active' || v === 'trialing') return 'good';
  if (v === 'past_due' || v === 'unpaid' || v === 'incomplete') return 'warn';
  return 'neutral';
}

async function readJsonOrText(res: Response): Promise<{ json: any | null; text: string | null }> {
  try {
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const j = await res.json().catch(() => null);
      return { json: j, text: null };
    }
    const t = await res.text().catch(() => '');
    return { json: null, text: t || null };
  } catch {
    return { json: null, text: null };
  }
}

export default function AdminUsersPage() {
  const { isLoggedIn, getAccessToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [users, setUsers] = useState<ApiUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI State
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all');
  const [staffFilter, setStaffFilter] = useState<StaffFilter>('all');
  const [confirmedFilter, setConfirmedFilter] = useState<ConfirmedFilter>('all');

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [selectedUser, setSelectedUser] = useState<ApiUserRow | null>(null);
  const [showRawProfile, setShowRawProfile] = useState(false);

  // Modal tabs
  const [activeTab, setActiveTab] = useState<ModalTab>('overview');

  // Stripe dashboard links mode
  const [stripeMode, setStripeMode] = useState<'test' | 'live'>('test');

  // Billing state (per-user modal)
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [billing, setBilling] = useState<AdminBillingWorkspaceResponse | null>(null);

  // v1.6: Edit modal state
  const [editMode, setEditMode] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [editFullName, setEditFullName] = useState('');
  const [editProfileEmail, setEditProfileEmail] = useState('');
  const [editWorkspaceId, setEditWorkspaceId] = useState('');
  const [editStaffActive, setEditStaffActive] = useState(false);
  const [editStaffRole, setEditStaffRole] = useState('');

  // v1.8: Notes state
  const [notes, setNotes] = useState<AdminUserNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState('');
  const [newNote, setNewNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  // v1.9: Deep-link guard
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);

  // Bulk email helper
  const [bulkEmailMsg, setBulkEmailMsg] = useState<string>('');

  const isProtectedAccount = (email?: string) => safeLower(email) === PROTECTED_EMAIL;

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/sign-in');
      return;
    }
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // v1.9: After users load, if URL asks for openUserId, auto-open the modal (fail closed)
  useEffect(() => {
    if (!isLoggedIn) return;
    if (deepLinkHandled) return;
    if (!Array.isArray(users) || users.length === 0) return;

    const openUserId = String(searchParams?.get('openUserId') || '').trim();
    const openUserEmail = String(searchParams?.get('openUserEmail') || '').trim();

    if (!openUserId && !openUserEmail) {
      setDeepLinkHandled(true);
      return;
    }

    if (openUserEmail) {
      setSearch(openUserEmail);
    }

    if (openUserId) {
      const match = users.find((u) => String(u.id || '').trim() === openUserId) || null;
      if (match) {
        setSelectedUser(match);
        setShowRawProfile(false);
        setActiveTab('overview');
      }
    }

    setDeepLinkHandled(true);
  }, [users, isLoggedIn, deepLinkHandled, searchParams]);

  useEffect(() => {
    setPage(1);
  }, [search, planFilter, staffFilter, confirmedFilter]);

  // When a user is selected: init edit fields + notes + reset Billing
  useEffect(() => {
    if (!selectedUser) return;

    setActiveTab('overview');

    setEditMode(false);
    setEditSaving(false);
    setEditError('');

    const p = selectedUser.profile || {};
    setEditFullName(String(p.full_name ?? selectedUser.name ?? '').trim());
    setEditProfileEmail(String(p.email ?? '').trim());
    setEditWorkspaceId(String(p.current_workspace_id ?? selectedUser.currentWorkspaceId ?? '').trim());
    setEditStaffActive(Boolean(selectedUser.staffActive));
    setEditStaffRole(String(selectedUser.staffRole ?? '').trim());

    setNotes([]);
    setNotesError('');
    setNewNote('');
    fetchNotes(selectedUser.id);

    setBilling(null);
    setBillingError('');
    setBillingLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser]);

  // When Billing tab opens, load proof-based billing snapshot
  useEffect(() => {
    if (!selectedUser) return;
    if (activeTab !== 'billing') return;
    void fetchBillingSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedUser?.currentWorkspaceId]);

  async function loadUsers() {
    try {
      setError('');
      setLoading(true);

      const token = await getAccessToken();
      if (!token) throw new Error('No auth token');

      const response = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || `Failed to load users (HTTP ${response.status})`);
      }

      const list = Array.isArray(payload?.users) ? payload.users : [];
      setUsers(list);
    } catch (err: any) {
      setUsers([]);
      setError(err?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  // -------- FILTERING --------

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return users.filter((u) => {
      const matchesSearch =
        !q ||
        safeLower(u.email).includes(q) ||
        safeLower(u.name).includes(q) ||
        safeLower(u.profile?.full_name).includes(q) ||
        safeLower(u.profile?.email).includes(q);

      const nPlan = normalizePlanTier(u.planTier);
      const matchesPlan = planFilter === 'all' || nPlan === planFilter;

      const isStaff = Boolean(u.staffActive);
      const matchesStaff = staffFilter === 'all' || (staffFilter === 'staff' ? isStaff : !isStaff);

      const isConfirmed = Boolean(u.emailConfirmedAt);
      const matchesConfirmed =
        confirmedFilter === 'all' || (confirmedFilter === 'confirmed' ? isConfirmed : !isConfirmed);

      return matchesSearch && matchesPlan && matchesStaff && matchesConfirmed;
    });
  }, [users, search, planFilter, staffFilter, confirmedFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedUsers = filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize);

  // -------- CSV EXPORT --------

  function exportCSV() {
    const headers = [
      'Email',
      'Name',
      'Supabase User ID',
      'Workspace ID',
      'Plan',
      'Email Confirmed',
      'Last Sign-in',
      'Staff Active',
      'Staff Role',
      'Joined',
    ];

    const rows = filteredUsers.map((u) => [
      u.email || '',
      (u.name || u.profile?.full_name || '') as string,
      u.id || '',
      u.currentWorkspaceId || '',
      formatPlanLabel(u.planTier),
      u.emailConfirmedAt ? 'yes' : 'no',
      u.lastSignInAt ? new Date(u.lastSignInAt).toISOString() : '',
      u.staffActive ? 'yes' : 'no',
      u.staffRole || '',
      u.createdAt ? new Date(u.createdAt).toISOString() : '',
    ]);

    const escapeCsv = (value: unknown) => {
      const s = String(value ?? '');
      return `"${s.split('"').join('""')}"`;
    };

    const csvContent = [headers, ...rows].map((r) => r.map((x) => escapeCsv(x)).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'tissca-users.csv';
    link.click();
  }

  // -------- BULK EMAIL HELPER --------

  function uniqueEmails(list: ApiUserRow[]) {
    const set = new Set<string>();
    for (const u of list) {
      const e = String(u.email || '').trim().toLowerCase();
      if (e) set.add(e);
    }
    return Array.from(set.values()).sort();
  }

  async function copyFilteredEmails() {
    setBulkEmailMsg('');
    const emails = uniqueEmails(filteredUsers);

    if (emails.length === 0) {
      setBulkEmailMsg('No emails available for the current filters.');
      return;
    }

    await copyToClipboard(emails.join(', '));
    setBulkEmailMsg(`Copied ${emails.length} email${emails.length === 1 ? '' : 's'} to clipboard.`);
  }

  // -------- STAFF ACTIONS --------

  async function deactivatePlatformStaff(supabaseUserId: string) {
    try {
      setError('');
      const token = await getAccessToken();
      if (!token) throw new Error('No auth token');

      const response = await fetch(`/api/admin/users?userId=${encodeURIComponent(supabaseUserId)}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || data?.message || `Failed (HTTP ${response.status})`);
      }

      await loadUsers();
    } catch (err: any) {
      setError(err?.message || 'Failed to deactivate user');
    }
  }

  async function removePlatformStaff(supabaseUserId: string) {
    try {
      setError('');
      const token = await getAccessToken();
      if (!token) throw new Error('No auth token');

      const response = await fetch(`/api/admin/users?userId=${encodeURIComponent(supabaseUserId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || data?.message || `Failed (HTTP ${response.status})`);
      }

      await loadUsers();
    } catch (err: any) {
      setError(err?.message || 'Failed to remove user');
    }
  }

  // -------- ADMIN EDIT (v1.6) --------

  async function saveUserEdits(userId: string) {
    try {
      setEditError('');
      setEditSaving(true);

      const token = await getAccessToken();
      if (!token) throw new Error('No auth token');

      const body = {
        fullName: editFullName.trim() === '' ? null : editFullName.trim(),
        profileEmail: editProfileEmail.trim() === '' ? null : editProfileEmail.trim(),
        currentWorkspaceId: editWorkspaceId.trim() === '' ? null : editWorkspaceId.trim(),
        staffActive: Boolean(editStaffActive),
        staffRole: editStaffRole.trim() === '' ? null : editStaffRole.trim(),
      };

      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || data?.message || `Failed (HTTP ${response.status})`);
      }

      await loadUsers();

      setSelectedUser((prev) => {
        if (!prev) return prev;
        const updated = users.find((u) => u.id === prev.id);
        return updated || prev;
      });

      setEditMode(false);
    } catch (err: any) {
      setEditError(err?.message || 'Failed to save changes');
    } finally {
      setEditSaving(false);
    }
  }

  // -------- NOTES (v1.8) --------

  async function fetchNotes(userId: string) {
    try {
      setNotesError('');
      setNotesLoading(true);

      const token = await getAccessToken();
      if (!token) throw new Error('No auth token');

      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/notes`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || `Failed to load notes (HTTP ${response.status})`);
      }

      setNotes(Array.isArray(data?.notes) ? data.notes : []);
    } catch (err: any) {
      setNotes([]);
      setNotesError(err?.message || 'Failed to load notes');
    } finally {
      setNotesLoading(false);
    }
  }

  async function addNote(userId: string) {
    try {
      setNotesError('');
      setNoteSaving(true);

      const token = await getAccessToken();
      if (!token) throw new Error('No auth token');

      const note = newNote.trim();
      if (!note) {
        setNotesError('Please write a note first.');
        return;
      }

      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/notes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ note }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || data?.message || `Failed (HTTP ${response.status})`);
      }

      setNewNote('');
      await fetchNotes(userId);
    } catch (err: any) {
      setNotesError(err?.message || 'Failed to add note');
    } finally {
      setNoteSaving(false);
    }
  }

  // -------- BILLING (per-user modal) --------

  function stripeCustomerUrl(id: string) {
    const safe = String(id || '').trim();
    if (!safe) return '';
    const prefix = stripeMode === 'test' ? 'test/' : '';
    return `https://dashboard.stripe.com/${prefix}customers/${encodeURIComponent(safe)}`;
  }

  function stripeSubscriptionUrl(id: string) {
    const safe = String(id || '').trim();
    if (!safe) return '';
    const prefix = stripeMode === 'test' ? 'test/' : '';
    return `https://dashboard.stripe.com/${prefix}subscriptions/${encodeURIComponent(safe)}`;
  }

  async function fetchBillingSnapshot() {
    if (!selectedUser) return;
    const wsId = String(selectedUser.currentWorkspaceId || '').trim();
    if (!wsId) {
      setBilling(null);
      setBillingError('No workspace_id on this user. Billing is workspace-scoped, so there is nothing to load.');
      return;
    }

    try {
      setBillingError('');
      setBillingLoading(true);
      setBilling(null);

      const token = await getAccessToken();
      if (!token) throw new Error('No auth token');

      const res = await fetch(`/api/admin/billing/workspace?workspace_id=${encodeURIComponent(wsId)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      const { json, text } = await readJsonOrText(res);

      if (!res.ok) {
        const requestId =
          res.headers.get('x-request-id') || res.headers.get('x-vercel-id') || res.headers.get('cf-ray') || '';

        const serverMsg =
          json?.error ||
          json?.code ||
          json?.message ||
          json?.details ||
          (text ? text.slice(0, 500) : null) ||
          `Failed (HTTP ${res.status})`;

        const msg = requestId ? `${serverMsg} (req: ${requestId})` : serverMsg;
        throw new Error(msg);
      }

      setBilling((json as AdminBillingWorkspaceResponse) || null);
    } catch (e: any) {
      setBilling(null);
      setBillingError(e?.message || 'Failed to load billing snapshot.');
    } finally {
      setBillingLoading(false);
    }
  }

  function TabButton(props: { tab: ModalTab; label: string }) {
    const on = activeTab === props.tab;
    return (
      <button
        type="button"
        onClick={() => setActiveTab(props.tab)}
        className={`text-xs px-3 py-2 rounded border font-semibold ${
          on
            ? 'bg-slate-900 text-white border-slate-900'
            : 'bg-white text-slate-700 border-gray-300 hover:bg-gray-50'
        }`}
      >
        {props.label}
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 text-slate-900">
      <div className="max-w-7xl mx-auto px-4">
        <Link href="/admin" className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
          ← Admin Dashboard
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Users</h1>
            <p className="text-gray-600">Enterprise user management (auth + workspace + staff)</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadUsers}
              className="text-sm border border-gray-300 bg-white px-3 py-2 rounded hover:bg-gray-50 font-semibold text-slate-900"
              type="button"
            >
              Refresh
            </button>
            <button
              onClick={exportCSV}
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700"
              type="button"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Vouchers CTA (moved out of this page) */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Vouchers & Billing Tools</h2>
              <p className="mt-1 text-sm text-gray-600">
                Voucher generator (campaign + targeted/email-locked) and workspace billing snapshots live on a dedicated page.
              </p>
            </div>

            <Link
              href="/admin/vouchers"
              className="inline-flex items-center justify-center text-sm bg-slate-900 text-white px-4 py-2 rounded font-semibold hover:bg-slate-800"
            >
              Open Voucher Generator →
            </Link>
          </div>

          <div className="mt-3 text-xs text-gray-500">
            Reason: keep /admin/users focused. Vouchers are billing tools and grow quickly (campaigns, targeting, portal rules).
          </div>
        </div>

        {/* Bulk email helper */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Bulk email helper</h2>
              <p className="mt-1 text-sm text-gray-600">
                Copies email addresses for the <span className="font-semibold">current filters</span> (search/plan/staff/confirmed).
                Use for sending campaign vouchers.
              </p>
            </div>

            <button
              type="button"
              onClick={copyFilteredEmails}
              className="text-sm border border-gray-300 bg-white px-3 py-2 rounded hover:bg-gray-50 font-semibold text-slate-900"
            >
              Copy filtered emails
            </button>
          </div>

          {bulkEmailMsg && (
            <div className="mt-4 p-3 rounded border border-amber-200 bg-amber-50 text-amber-900 text-sm">
              {bulkEmailMsg}
            </div>
          )}

          <div className="mt-3 text-[11px] text-gray-500">
            Tip: bulk vouchers are not email-locked. For single-user vouchers, generate a targeted voucher from the Voucher Generator page.
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            placeholder="Search email, name, profile email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 bg-white text-slate-900 placeholder:text-gray-400 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value as PlanFilter)}
            className="border border-gray-300 bg-white text-slate-900 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="all">All plans</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="team">Team</option>
            <option value="unknown">Unknown</option>
          </select>

          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value as StaffFilter)}
            className="border border-gray-300 bg-white text-slate-900 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="all">All users</option>
            <option value="members">Members only</option>
            <option value="staff">Platform staff only</option>
          </select>

          <select
            value={confirmedFilter}
            onChange={(e) => setConfirmedFilter(e.target.value as ConfirmedFilter)}
            className="border border-gray-300 bg-white text-slate-900 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="all">Email confirmed (all)</option>
            <option value="confirmed">Confirmed</option>
            <option value="unconfirmed">Unconfirmed</option>
          </select>
        </div>

        {/* Stats line */}
        <div className="mb-6 text-sm text-gray-600 flex flex-wrap items-center justify-between gap-2">
          <span>
            Showing <span className="font-semibold text-slate-900">{filteredUsers.length}</span> of{' '}
            <span className="font-semibold text-slate-900">{users.length}</span> users
          </span>
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>}

        {loading ? (
          <p className="text-gray-700">Loading users...</p>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">Email</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">Name</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">Workspace</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">Plan</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">Confirmed</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">Last sign-in</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">Staff</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">Joined</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedUsers.map((u) => {
                    const protectedAccount = isProtectedAccount(u.email);
                    const staffActive = Boolean(u.staffActive);
                    const confirmed = Boolean(u.emailConfirmedAt);
                    const supabaseUserId = u.id || u.supabaseId || '';

                    return (
                      <tr key={supabaseUserId} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{u.email}</span>

                            {protectedAccount && (
                              <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800 border border-amber-200">
                                Protected
                              </span>
                            )}

                            {staffActive && (
                              <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded bg-slate-900 text-white border border-slate-900">
                                Staff
                              </span>
                            )}
                          </div>

                          <div className="mt-1 text-[11px] text-gray-500 font-mono">
                            {supabaseUserId ? `UID: ${supabaseUserId}` : 'UID: —'}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-gray-700">
                          <div className="leading-tight">
                            <div>{(u.name || u.profile?.full_name || '—') as string}</div>
                            <div className="text-xs text-gray-500">
                              {(u.profile?.email || '').trim() ? `Profile: ${u.profile?.email}` : 'Profile: —'}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-gray-700">
                          <div className="font-mono text-xs">{u.currentWorkspaceId ? u.currentWorkspaceId : '—'}</div>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded border ${planBadgeClasses(
                              u.planTier
                            )}`}
                          >
                            {formatPlanLabel(u.planTier)}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded border ${yesNoBadge(
                              confirmed
                            )}`}
                          >
                            {confirmed ? 'Yes' : 'No'}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-gray-700">{fmtDate(u.lastSignInAt, 'datetime')}</td>

                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex items-center w-fit px-2 py-1 text-xs font-semibold rounded border ${
                                staffActive
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-gray-50 text-gray-700 border-gray-200'
                              }`}
                            >
                              {staffActive ? 'Active' : 'No'}
                            </span>
                            <span className="text-xs text-gray-500">
                              Role: <span className="font-mono">{u.staffRole || '—'}</span>
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-gray-700">{fmtDate(u.createdAt, 'date')}</td>

                        <td className="px-6 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUser(u);
                                setShowRawProfile(false);
                                setActiveTab('overview');
                              }}
                              className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                            >
                              View
                            </button>

                            <button
                              type="button"
                              disabled={protectedAccount || !staffActive}
                              onClick={() => deactivatePlatformStaff(supabaseUserId)}
                              className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={!staffActive ? 'User is not active staff' : undefined}
                            >
                              Deactivate
                            </button>

                            <button
                              type="button"
                              disabled={protectedAccount}
                              onClick={() => removePlatformStaff(supabaseUserId)}
                              className="text-xs px-3 py-1.5 rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {paginatedUsers.length === 0 && (
                    <tr>
                      <td className="px-6 py-10 text-center text-gray-600" colSpan={9}>
                        No matching users.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 flex justify-between items-center text-gray-700">
              <button
                disabled={safePage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="text-sm border border-gray-300 px-3 py-1.5 rounded disabled:opacity-50 bg-white hover:bg-gray-50"
                type="button"
              >
                Previous
              </button>

              <span className="text-sm">
                Page <span className="font-semibold text-slate-900">{safePage}</span> of{' '}
                <span className="font-semibold text-slate-900">{totalPages}</span>
              </span>

              <button
                disabled={safePage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="text-sm border border-gray-300 px-3 py-1.5 rounded disabled:opacity-50 bg-white hover:bg-gray-50"
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* View Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white w-full max-w-4xl rounded-lg border border-gray-200 shadow-xl text-slate-900 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold">User Details</h3>
                  <p className="text-sm text-gray-600">Auth + workspace + staff + billing + profile snapshot (admin view)</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="px-3 py-2 border border-gray-300 rounded bg-white hover:bg-gray-50 text-sm font-semibold"
                    type="button"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="px-6 pt-4 flex flex-wrap items-center gap-2">
                <TabButton tab="overview" label="Overview" />
                <TabButton tab="billing" label="Billing" />
                <TabButton tab="notes" label="Internal Notes" />
                <TabButton tab="profile" label="Profile" />
              </div>

              <div className="p-6">
                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Identity */}
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-slate-900">Identity</h4>
                        <span
                          className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded border ${planBadgeClasses(
                            selectedUser.planTier
                          )}`}
                        >
                          {formatPlanLabel(selectedUser.planTier)} Plan
                        </span>
                      </div>

                      <div className="space-y-2 text-sm text-gray-700">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs text-gray-500">Email</div>
                            <div className="font-semibold text-slate-900">{selectedUser.email || '—'}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(selectedUser.email || '')}
                            className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
                          >
                            Copy
                          </button>
                        </div>

                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs text-gray-500">Name</div>
                            <div>{(selectedUser.name || selectedUser.profile?.full_name || '—') as string}</div>
                          </div>
                        </div>

                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs text-gray-500">Supabase User ID (UUID)</div>
                            <div className="font-mono text-xs break-all">{selectedUser.id || '—'}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(selectedUser.id || '')}
                            className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
                          >
                            Copy
                          </button>
                        </div>

                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs text-gray-500">Workspace ID</div>
                            <div className="font-mono text-xs break-all">{selectedUser.currentWorkspaceId || '—'}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(selectedUser.currentWorkspaceId || '')}
                            className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
                            disabled={!selectedUser.currentWorkspaceId}
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Auth + Staff */}
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-slate-900">Auth & Staff</h4>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isProtectedAccount(selectedUser.email)}
                            onClick={() => {
                              setEditError('');
                              setEditMode((v) => !v);
                            }}
                            className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={isProtectedAccount(selectedUser.email) ? 'Protected account cannot be edited' : undefined}
                          >
                            {editMode ? 'Cancel edit' : 'Edit'}
                          </button>

                          {editMode && (
                            <button
                              type="button"
                              disabled={editSaving || isProtectedAccount(selectedUser.email)}
                              onClick={() => saveUserEdits(selectedUser.id)}
                              className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {editSaving ? 'Saving…' : 'Save'}
                            </button>
                          )}
                        </div>
                      </div>

                      {editError && (
                        <div className="mb-3 p-3 text-sm bg-red-50 border border-red-200 text-red-700 rounded">{editError}</div>
                      )}

                      {!editMode ? (
                        <>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded border border-gray-200 p-3 bg-gray-50">
                              <div className="text-xs text-gray-500">Email confirmed</div>
                              <div className="font-semibold text-slate-900">{selectedUser.emailConfirmedAt ? 'Yes' : 'No'}</div>
                              <div className="text-xs text-gray-500 mt-1">{fmtDate(selectedUser.emailConfirmedAt, 'datetime')}</div>
                            </div>

                            <div className="rounded border border-gray-200 p-3 bg-gray-50">
                              <div className="text-xs text-gray-500">Last sign-in</div>
                              <div className="font-semibold text-slate-900">{selectedUser.lastSignInAt ? 'Recorded' : '—'}</div>
                              <div className="text-xs text-gray-500 mt-1">{fmtDate(selectedUser.lastSignInAt, 'datetime')}</div>
                            </div>

                            <div className="rounded border border-gray-200 p-3 bg-gray-50">
                              <div className="text-xs text-gray-500">Staff active</div>
                              <div className="font-semibold text-slate-900">{selectedUser.staffActive ? 'Yes' : 'No'}</div>
                            </div>

                            <div className="rounded border border-gray-200 p-3 bg-gray-50">
                              <div className="text-xs text-gray-500">Staff role</div>
                              <div className="font-mono text-xs font-semibold text-slate-900">{selectedUser.staffRole || '—'}</div>
                            </div>

                            <div className="rounded border border-gray-200 p-3 bg-gray-50 col-span-2">
                              <div className="text-xs text-gray-500">Joined</div>
                              <div className="font-semibold text-slate-900">{fmtDate(selectedUser.createdAt, 'datetime')}</div>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={isProtectedAccount(selectedUser.email) || !selectedUser.staffActive}
                              onClick={() => deactivatePlatformStaff(selectedUser.id)}
                              className="text-xs px-3 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={!selectedUser.staffActive ? 'User is not active staff' : undefined}
                            >
                              Deactivate staff
                            </button>

                            <button
                              type="button"
                              disabled={isProtectedAccount(selectedUser.email)}
                              onClick={() => removePlatformStaff(selectedUser.id)}
                              className="text-xs px-3 py-2 rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Remove staff record
                            </button>

                            <div className="text-xs text-gray-500 ml-auto">Protected accounts cannot be modified.</div>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-3 text-sm">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Full name (profile)</div>
                              <input
                                value={editFullName}
                                onChange={(e) => setEditFullName(e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 bg-white"
                                placeholder="Full name"
                              />
                            </div>

                            <div>
                              <div className="text-xs text-gray-500 mb-1">Profile email (user_profiles.email)</div>
                              <input
                                value={editProfileEmail}
                                onChange={(e) => setEditProfileEmail(e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 bg-white"
                                placeholder="email@example.com"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <div className="text-xs text-gray-500 mb-1">Current workspace ID</div>
                              <input
                                value={editWorkspaceId}
                                onChange={(e) => setEditWorkspaceId(e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 bg-white font-mono text-xs"
                                placeholder="workspace uuid (or leave blank)"
                              />
                            </div>

                            <div>
                              <div className="text-xs text-gray-500 mb-1">Staff role</div>
                              <input
                                value={editStaffRole}
                                onChange={(e) => setEditStaffRole(e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 bg-white font-mono text-xs"
                                placeholder="e.g. admin, support, ops"
                              />
                            </div>

                            <div className="flex items-center gap-2 pt-6">
                              <input
                                id="staffActive"
                                type="checkbox"
                                checked={editStaffActive}
                                onChange={(e) => setEditStaffActive(e.target.checked)}
                                className="h-4 w-4"
                              />
                              <label htmlFor="staffActive" className="text-gray-700">
                                Staff active
                              </label>
                            </div>
                          </div>

                          <div className="text-xs text-gray-500">
                            Saving uses <span className="font-mono">PATCH /api/admin/users/{'{id}'}</span>.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* BILLING TAB */}
                {activeTab === 'billing' && (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">Billing (workspace-scoped)</h4>
                          <p className="mt-1 text-xs text-gray-600">Proof-based snapshot. No guessing. Requires a workspace_id on this user.</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-xs text-gray-600">Stripe mode</div>
                          <select
                            value={stripeMode}
                            onChange={(e) => setStripeMode(e.target.value as 'test' | 'live')}
                            className="border border-gray-300 bg-white text-slate-900 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
                          >
                            <option value="test">Test</option>
                            <option value="live">Live</option>
                          </select>

                          <button
                            type="button"
                            onClick={fetchBillingSnapshot}
                            disabled={billingLoading}
                            className="text-xs px-3 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            {billingLoading ? 'Refreshing…' : 'Refresh'}
                          </button>
                        </div>
                      </div>

                      {billingError && (
                        <div className="mt-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{billingError}</div>
                      )}

                      {billingLoading && <div className="mt-4 text-sm text-gray-600">Loading billing snapshot…</div>}

                      {!!billing?.workspace && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div className="rounded border border-gray-200 p-3 bg-gray-50">
                            <div className="text-xs text-gray-500">Workspace</div>
                            <div className="font-semibold text-slate-900">{billing.workspace?.name || '—'}</div>
                            <div className="mt-1 font-mono text-xs break-all text-gray-600">{billing.workspace?.id || '—'}</div>
                          </div>

                          <div className="rounded border border-gray-200 p-3 bg-gray-50">
                            <div className="text-xs text-gray-500">Plan & status</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded border ${planBadgeClasses(
                                  billing.workspace?.plan_tier
                                )}`}
                              >
                                {formatPlanLabel(billing.workspace?.plan_tier)}
                              </span>

                              <span
                                className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded border ${
                                  statusTone(billing.workspace?.subscription_status) === 'good'
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : statusTone(billing.workspace?.subscription_status) === 'warn'
                                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                                      : 'bg-gray-50 text-gray-700 border-gray-200'
                                }`}
                              >
                                {statusLabel(billing.workspace?.subscription_status)}
                              </span>
                            </div>
                            <div className="mt-2 text-xs text-gray-600">
                              Next billing date: <span className="font-semibold">{fmtDate(billing.workspace?.current_period_end, 'date')}</span>
                            </div>
                          </div>

                          <div className="rounded border border-gray-200 p-3 bg-gray-50">
                            <div className="text-xs text-gray-500">Stripe IDs</div>

                            <div className="mt-2 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-[11px] text-gray-500">Customer</div>
                                  <div className="font-mono text-xs break-all text-slate-900">{billing.workspace?.stripe_customer_id || '—'}</div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(billing.workspace?.stripe_customer_id || '')}
                                    disabled={!billing.workspace?.stripe_customer_id}
                                    className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                                  >
                                    Copy
                                  </button>
                                  <a
                                    href={billing.workspace?.stripe_customer_id ? stripeCustomerUrl(billing.workspace.stripe_customer_id) : undefined}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`text-xs px-2 py-1 rounded border border-gray-300 ${
                                      billing.workspace?.stripe_customer_id
                                        ? 'hover:bg-gray-50 text-gray-700'
                                        : 'opacity-50 pointer-events-none text-gray-400'
                                    }`}
                                  >
                                    Open
                                  </a>
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-[11px] text-gray-500">Subscription</div>
                                  <div className="font-mono text-xs break-all text-slate-900">{billing.workspace?.stripe_subscription_id || '—'}</div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(billing.workspace?.stripe_subscription_id || '')}
                                    disabled={!billing.workspace?.stripe_subscription_id}
                                    className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                                  >
                                    Copy
                                  </button>
                                  <a
                                    href={billing.workspace?.stripe_subscription_id ? stripeSubscriptionUrl(billing.workspace.stripe_subscription_id) : undefined}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`text-xs px-2 py-1 rounded border border-gray-300 ${
                                      billing.workspace?.stripe_subscription_id
                                        ? 'hover:bg-gray-50 text-gray-700'
                                        : 'opacity-50 pointer-events-none text-gray-400'
                                    }`}
                                  >
                                    Open
                                  </a>
                                </div>
                              </div>
                            </div>

                            <div className="mt-2 text-[11px] text-gray-500">Stripe shortcuts do not require API access (safe). Mode toggle only changes dashboard path.</div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">Vouchers moved</h4>
                          <p className="mt-1 text-xs text-gray-600">
                            Voucher creation is now on <span className="font-mono">/admin/vouchers</span> to avoid this modal becoming too heavy.
                          </p>
                        </div>

                        <Link
                          href="/admin/vouchers"
                          className="text-xs px-4 py-2 rounded bg-slate-900 text-white font-semibold hover:bg-slate-800"
                        >
                          Open Voucher Generator →
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {/* NOTES TAB */}
                {activeTab === 'notes' && (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">Internal Notes</h4>
                          <p className="mt-1 text-xs text-gray-600">Private staff notes (not visible to members).</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => fetchNotes(selectedUser.id)}
                          disabled={notesLoading}
                          className="text-xs px-3 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          {notesLoading ? 'Refreshing…' : 'Refresh'}
                        </button>
                      </div>

                      {notesError && (
                        <div className="mt-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{notesError}</div>
                      )}

                      <div className="mt-4 grid grid-cols-1 gap-3">
                        <textarea
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          className="w-full min-h-[120px] border border-gray-300 rounded px-3 py-2 bg-white text-sm"
                          placeholder="Write a private note…"
                          disabled={noteSaving}
                        />

                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[11px] text-gray-500">
                            Adds a note via <span className="font-mono">POST /api/admin/users/{'{id}'}/notes</span>.
                          </div>
                          <button
                            type="button"
                            onClick={() => addNote(selectedUser.id)}
                            disabled={noteSaving}
                            className="text-xs px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {noteSaving ? 'Saving…' : 'Add note'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 p-4">
                      <h4 className="text-sm font-bold text-slate-900">Note history</h4>

                      {notesLoading ? (
                        <div className="mt-3 text-sm text-gray-600">Loading notes…</div>
                      ) : notes.length === 0 ? (
                        <div className="mt-3 text-sm text-gray-600">No notes yet.</div>
                      ) : (
                        <div className="mt-3 space-y-3">
                          {notes.map((n) => (
                            <div key={n.id} className="rounded border border-gray-200 p-3 bg-gray-50">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-xs text-gray-600">
                                  <span className="font-semibold text-slate-900">Created</span>: {fmtDate(n.created_at, 'datetime')}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(n.id)}
                                  className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
                                  title="Copy note id"
                                >
                                  Copy id
                                </button>
                              </div>

                              <div className="mt-2 text-sm text-slate-900 whitespace-pre-wrap">{n.note}</div>

                              <div className="mt-2 text-[11px] text-gray-500 font-mono break-all">created_by: {n.created_by}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* PROFILE TAB */}
                {activeTab === 'profile' && (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">Profile snapshot</h4>
                          <p className="mt-1 text-xs text-gray-600">Raw user_profiles payload (for diagnostics). Use carefully.</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowRawProfile((v) => !v)}
                          className="text-xs px-3 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          {showRawProfile ? 'Hide raw' : 'Show raw'}
                        </button>
                      </div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="rounded border border-gray-200 p-3 bg-gray-50">
                          <div className="text-xs text-gray-500">profile.full_name</div>
                          <div className="font-semibold text-slate-900">{String(selectedUser.profile?.full_name ?? '—')}</div>
                        </div>

                        <div className="rounded border border-gray-200 p-3 bg-gray-50">
                          <div className="text-xs text-gray-500">profile.email</div>
                          <div className="font-semibold text-slate-900">{String(selectedUser.profile?.email ?? '—')}</div>
                        </div>

                        <div className="rounded border border-gray-200 p-3 bg-gray-50 md:col-span-2">
                          <div className="text-xs text-gray-500">profile.current_workspace_id</div>
                          <div className="font-mono text-xs break-all text-slate-900">{String(selectedUser.profile?.current_workspace_id ?? '—')}</div>
                        </div>
                      </div>

                      {showRawProfile && (
                        <div className="mt-4">
                          <div className="text-xs font-semibold text-slate-900 mb-2">Raw JSON</div>
                          <pre className="text-xs bg-slate-900 text-slate-50 rounded p-4 overflow-auto max-h-[420px]">
                            {JSON.stringify(selectedUser.profile || null, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 pb-6">
                <div className="text-[11px] text-gray-500">
                  Admin view only. Billing is workspace-scoped. Protected account: <span className="font-mono">{PROTECTED_EMAIL}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}