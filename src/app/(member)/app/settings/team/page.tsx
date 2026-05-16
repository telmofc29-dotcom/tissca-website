// src/app/(member)/app/settings/team/page.tsx
//
// Team Management page — list workspace members, show/update roles.
// Owner-only for role changes. Visible to team plan users (owner/admin).

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { isTeam, maxWorkspaceMembers } from '@/lib/plans';
import type { PlanTier } from '@/lib/plans';
import Link from 'next/link';

type Member = {
  user_id: string;
  role: string;
  full_name: string | null;
  email: string | null;
};

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  accountant: 'Accountant',
};

const ROLE_BADGE: Record<string, string> = {
  owner: 'bg-amber-100 text-amber-800 border-amber-200',
  admin: 'bg-blue-100 text-blue-700 border-blue-200',
  member: 'bg-gray-100 text-gray-600 border-gray-200',
  accountant: 'bg-purple-100 text-purple-700 border-purple-200',
};

const ASSIGNABLE_ROLES = ['admin', 'member', 'accountant'] as const;

export default function TeamManagementPage() {
  const { accessToken, workspace, user, role: myRole } = useWorkspace();
  const planTier = (workspace?.plan_tier ?? 'free') as PlanTier;
  const isOwner = myRole === 'owner';
  const isAdmin = myRole === 'admin';
  const canManage = isOwner || isAdmin;

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('member');
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const cap = maxWorkspaceMembers(planTier);

  const loadMembers = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/workspace/members', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setMembers(data.members ?? []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  async function handleRoleChange(targetUserId: string, newRole: string) {
    if (!accessToken || !canManage) return;
    setUpdating(targetUserId);
    setStatus(null);
    try {
      const res = await fetch('/api/workspace/members', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: targetUserId, role: newRole }),
      });
      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) => (m.user_id === targetUserId ? { ...m, role: newRole } : m)),
        );
        setStatus('Role updated');
        setTimeout(() => setStatus(null), 3000);
      } else {
        const err = await res.json();
        setStatus(err.error ?? 'Failed to update role');
      }
    } catch {
      setStatus('Failed to update role');
    } finally {
      setUpdating(null);
    }
  }

  async function handleInvite() {
    if (!accessToken || !canManage || !inviteEmail.trim()) return;
    setInviting(true);
    setStatus(null);
    try {
      const res = await fetch('/api/workspace/members', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      if (res.ok) {
        setInviteEmail('');
        setInviteRole('member');
        setStatus('Member added successfully');
        setTimeout(() => setStatus(null), 3000);
        loadMembers();
      } else {
        const err = await res.json();
        setStatus(err.error ?? 'Failed to add member');
      }
    } catch {
      setStatus('Failed to add member');
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(targetUserId: string) {
    if (!accessToken || !canManage) return;
    setRemoving(targetUserId);
    setStatus(null);
    try {
      const res = await fetch('/api/workspace/members', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: targetUserId }),
      });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.user_id !== targetUserId));
        setStatus('Member removed');
        setTimeout(() => setStatus(null), 3000);
      } else {
        const err = await res.json();
        setStatus(err.error ?? 'Failed to remove member');
      }
    } catch {
      setStatus('Failed to remove member');
    } finally {
      setRemoving(null);
    }
  }

  // Gate: team plans only
  if (!isTeam(planTier)) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <p className="text-4xl">👥</p>
          <h2 className="mt-3 text-lg font-semibold text-amber-800">Team Plan Required</h2>
          <p className="mt-2 text-sm text-amber-700">
            Team Management is available on Team Starter and Team Pro plans.
          </p>
          <Link
            href="/app/settings/subscription"
            className="mt-4 inline-block rounded-full border border-amber-200 bg-white px-5 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50"
          >
            Upgrade Plan →
          </Link>
        </div>
      </div>
    );
  }

  // Gate: owner or admin only
  if (!canManage) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <p className="text-4xl">🔒</p>
          <h2 className="mt-3 text-lg font-semibold text-amber-800">Access Restricted</h2>
          <p className="mt-2 text-sm text-amber-700">
            Only workspace owners and admins can access Team Management.
          </p>
          <Link
            href="/app/settings"
            className="mt-4 inline-block rounded-full border border-amber-200 bg-white px-5 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50"
          >
            ← Back to Settings
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-slate-900" />
          <p className="text-sm text-slate-500">Loading team…</p>
        </div>
      </div>
    );
  }

  const ownerMembers = members.filter((m) => m.role === 'owner');
  const otherMembers = members.filter((m) => m.role !== 'owner');

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-2xl space-y-5">
        {/* Header */}
        <div>
          <Link
            href="/app/settings"
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-gray-50 transition-colors"
          >
            ← Settings
          </Link>
          <h1 className="mt-3 text-xl font-bold text-slate-900">Team Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your workspace members and their roles.
            {!canManage && ' Only the workspace owner or admin can change roles.'}
          </p>
        </div>

        {/* Status */}
        {status && (
          <div
            className={`rounded-xl border px-4 py-2.5 text-center text-sm font-medium ${
              status.includes('fail') || status.includes('Cannot') || status.includes('Only')
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {status}
          </div>
        )}

        {/* Member count */}
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
          <span className="text-sm text-slate-600">
            {members.length}/{cap} member{members.length !== 1 ? 's' : ''}
          </span>
          <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-0.5 text-xs font-medium text-slate-600">
            {planTier === 'team_pro' ? 'Up to 200' : 'Up to 5'}
          </span>
        </div>

        {/* Invite member */}
        {canManage && members.length < cap && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.12)]">
            <p className="text-sm font-semibold text-slate-900 mb-3">Invite Member</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                placeholder="Email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-300"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={inviting || !inviteEmail.trim()}
                onClick={handleInvite}
                className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-50 shadow-[0_8px_30px_-8px_rgba(245,158,11,0.4)]"
              >
                {inviting ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        )}

        {/* Owner(s) */}
        {ownerMembers.map((m) => (
          <MemberCard key={m.user_id} member={m} isOwner={false} isSelf={m.user_id === user?.id} />
        ))}

        {/* Other members */}
        {otherMembers.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              Members
            </h3>
            {otherMembers.map((m) => (
              <MemberCard
                key={m.user_id}
                member={m}
                isOwner={canManage}
                isSelf={m.user_id === user?.id}
                updating={updating === m.user_id}
                onRoleChange={handleRoleChange}
                onRemove={handleRemove}
                removing={removing === m.user_id}
              />
            ))}
          </div>
        )}

        {otherMembers.length === 0 && ownerMembers.length <= 1 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-3xl">👤</p>
            <p className="mt-3 text-sm text-slate-500">No other members yet.</p>
            <p className="mt-1 text-xs text-slate-400">
              Invite members to your workspace to manage their roles here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-component ───────────────────────────────────────────────────────────

function MemberCard({
  member,
  isOwner,
  isSelf,
  updating,
  onRoleChange,
  onRemove,
  removing,
}: {
  member: Member;
  isOwner: boolean;
  isSelf: boolean;
  updating?: boolean;
  onRoleChange?: (userId: string, newRole: string) => void;
  onRemove?: (userId: string) => void;
  removing?: boolean;
}) {
  const badgeClass = ROLE_BADGE[member.role] ?? ROLE_BADGE.member;
  const canEdit = isOwner && !isSelf && member.role !== 'owner';
  const canRemove = isOwner && !isSelf && member.role !== 'owner';

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.12)]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-slate-900">
              {member.full_name ?? 'Unknown'}
              {isSelf && (
                <span className="ml-1.5 text-xs text-slate-400">(you)</span>
              )}
            </p>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass}`}
            >
              {ROLE_LABELS[member.role] ?? member.role}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">{member.email ?? '—'}</p>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && onRoleChange && (
            <select
              value={member.role}
              disabled={updating}
              onChange={(e) => onRoleChange(member.user_id, e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400/50 disabled:opacity-50"
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          )}
          {canRemove && onRemove && (
            <button
              type="button"
              disabled={removing}
              onClick={() => onRemove(member.user_id)}
              className="rounded-lg border border-red-200 bg-white px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {removing ? '…' : 'Remove'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
