// src/app/(admin)/admin/users/page.tsx v1.7
//
// CHANGES (v1.7):
// - UI FIX: Wide enterprise table now supports horizontal scrolling so last columns are always visible.
//   - Wrap table in an overflow-x-auto container
//   - Give table a min-width to prevent column clipping on smaller screens
// - Keep ALL v1.6 enterprise edit layer and all existing features unchanged.

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

type ApiUserRow = {
  // v1.5 API: Supabase Auth user id (uuid)
  id: string;

  email: string;
  name?: string | null;
  createdAt: string;

  // Auth metadata
  lastSignInAt?: string | null;
  emailConfirmedAt?: string | null;

  // Workspace
  currentWorkspaceId?: string | null;
  planTier?: string | null;

  // Profile row (public.user_profiles)
  profile?: Record<string, any> | null;

  // Staff
  isPlatformStaff?: boolean;
  staffRole?: string | null;
  staffActive?: boolean;

  // Backward compatibility if any older rows still exist in dev
  supabaseId?: string;
};

const PROTECTED_EMAIL = 'support@tissca.com';

type PlanFilter = 'all' | 'free' | 'pro' | 'team' | 'unknown';
type StaffFilter = 'all' | 'staff' | 'members';
type ConfirmedFilter = 'all' | 'confirmed' | 'unconfirmed';

function safeLower(v?: string | null) {
  return (v || '').toLowerCase();
}

function normalizePlanTier(raw?: string | null): 'free' | 'pro' | 'team' | 'unknown' {
  const v = safeLower(raw);

  // Common possibilities we might see in DB/env:
  // free, pro, team, premium (legacy), starter, business, enterprise, etc.
  if (!v) return 'unknown';

  if (v === 'free' || v === 'starter') return 'free';
  if (v === 'pro' || v === 'premium') return 'pro';
  if (v === 'team' || v === 'business' || v === 'enterprise') return 'team';

  // If you later introduce new tiers, we won't break — it will show "unknown" until mapped.
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
  return mode === 'datetime' ? dt.toLocaleString() : dt.toLocaleDateString();
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // fail silently
  }
}

export default function AdminUsersPage() {
  const { isLoggedIn, getAccessToken } = useAuth();
  const router = useRouter();

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

  // v1.6: Edit modal state
  const [editMode, setEditMode] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [editFullName, setEditFullName] = useState('');
  const [editProfileEmail, setEditProfileEmail] = useState('');
  const [editWorkspaceId, setEditWorkspaceId] = useState('');
  const [editStaffActive, setEditStaffActive] = useState(false);
  const [editStaffRole, setEditStaffRole] = useState('');

  const isProtectedAccount = (email?: string) => safeLower(email) === PROTECTED_EMAIL;

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // Reset to page 1 whenever filters/search change
  useEffect(() => {
    setPage(1);
  }, [search, planFilter, staffFilter, confirmedFilter]);

  // When a user is selected, initialize edit fields (v1.6)
  useEffect(() => {
    if (!selectedUser) return;

    setEditMode(false);
    setEditSaving(false);
    setEditError('');

    const p = selectedUser.profile || {};
    setEditFullName(String(p.full_name ?? selectedUser.name ?? '').trim());
    setEditProfileEmail(String(p.email ?? '').trim());
    setEditWorkspaceId(String(p.current_workspace_id ?? selectedUser.currentWorkspaceId ?? '').trim());
    setEditStaffActive(Boolean(selectedUser.staffActive));
    setEditStaffRole(String(selectedUser.staffRole ?? '').trim());
  }, [selectedUser]);

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

      setUsers(Array.isArray(payload?.users) ? payload.users : []);
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

  // -------- STAFF ACTIONS (existing API behavior) --------
  // NOTE: route.ts expects userId = Supabase user id (uuid)

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

  // -------- NEW: ADMIN EDIT (v1.6) --------
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

      // Refresh selected user from latest list (so modal reflects updated values)
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

          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 bg-white">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-gray-700">Confirmed</span>
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 bg-white">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              <span className="text-gray-700">Team</span>
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 bg-white">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              <span className="text-gray-700">Pro</span>
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>
        )}

        {loading ? (
          <p className="text-gray-700">Loading users...</p>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* v1.7: Horizontal scroll wrapper for wide tables */}
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
            <div className="bg-white w-full max-w-3xl rounded-lg border border-gray-200 shadow-xl text-slate-900 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold">User Details</h3>
                  <p className="text-sm text-gray-600">Auth + workspace + staff + profile snapshot (admin view)</p>
                </div>

                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-3 py-2 border border-gray-300 rounded bg-white hover:bg-gray-50 text-sm font-semibold"
                  type="button"
                >
                  Close
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <div className="mb-3 p-3 text-sm bg-red-50 border border-red-200 text-red-700 rounded">
                      {editError}
                    </div>
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

                {/* Profile */}
                <div className="rounded-lg border border-gray-200 p-4 md:col-span-2">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h4 className="text-sm font-bold text-slate-900">Profile (public.user_profiles)</h4>
                    <button
                      type="button"
                      onClick={() => setShowRawProfile((v) => !v)}
                      className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      {showRawProfile ? 'Hide raw JSON' : 'Show raw JSON'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700">
                    <div className="rounded border border-gray-200 p-3 bg-white">
                      <div className="text-xs text-gray-500">Profile email</div>
                      <div className="font-semibold text-slate-900">{selectedUser.profile?.email || '—'}</div>
                    </div>

                    <div className="rounded border border-gray-200 p-3 bg-white">
                      <div className="text-xs text-gray-500">Full name</div>
                      <div className="font-semibold text-slate-900">{selectedUser.profile?.full_name || '—'}</div>
                    </div>

                    <div className="rounded border border-gray-200 p-3 bg-white">
                      <div className="text-xs text-gray-500">Current workspace</div>
                      <div className="font-mono text-xs font-semibold text-slate-900 break-all">
                        {selectedUser.profile?.current_workspace_id || '—'}
                      </div>
                    </div>
                  </div>

                  {showRawProfile && (
                    <pre className="mt-4 text-xs bg-gray-50 border border-gray-200 rounded p-4 overflow-auto max-h-72">
{JSON.stringify(selectedUser.profile || {}, null, 2)}
                    </pre>
                  )}
                </div>
              </div>

              <div className="px-6 pb-6 flex items-center justify-end gap-2">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 border border-gray-300 rounded bg-white hover:bg-gray-50 text-sm font-semibold"
                  type="button"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}