// src/components/chat/MemberPicker.tsx
// Unified workspace member picker – DM (1 selected) or Group (2+ selected).
// Also supports "add" mode for adding members to an existing group.

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

type WorkspaceMember = {
  user_id: string;
  role: string;
  full_name: string | null;
  email: string | null;
};

/* ── Props ─────────────────────────────────────────────────────────────── */

interface CreateModeProps {
  mode?: 'create';
  onCreateDm: (memberId: string, memberName: string) => void;
  onCreateGroup: (title: string, memberIds: string[]) => void;
  onAddMembers?: never;
  onCancel: () => void;
}

interface AddModeProps {
  mode: 'add';
  onAddMembers: (memberIds: string[]) => void;
  onCreateDm?: never;
  onCreateGroup?: never;
  onCancel: () => void;
}

type MemberPickerProps = CreateModeProps | AddModeProps;

/* ── Component ─────────────────────────────────────────────────────────── */

export function MemberPicker(props: MemberPickerProps) {
  const { onCancel } = props;
  const isAddMode = props.mode === 'add';

  const { accessToken, user } = useWorkspace();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [groupTitle, setGroupTitle] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  /* Fetch workspace members on mount */
  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    fetch('/api/workspace/members', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const others = (data.members ?? []).filter(
          (m: WorkspaceMember) => m.user_id !== user?.id,
        );
        setMembers(others);
      })
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [accessToken, user?.id]);

  /* Search filter */
  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        m.full_name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q),
    );
  }, [members, search]);

  const toggle = useCallback((uid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }, []);

  const displayName = (m: WorkspaceMember) =>
    m.full_name || m.email || m.user_id.slice(0, 8);

  /* Determine flow: 1 selected = DM, 2+ = group */
  const isDm = !isAddMode && selected.size === 1;
  const isGroup = !isAddMode && selected.size >= 2;

  const handleConfirm = () => {
    if (isAddMode) {
      if (selected.size === 0) return;
      props.onAddMembers(Array.from(selected));
      return;
    }
    if (isDm) {
      const memberId = Array.from(selected)[0];
      const member = members.find((m) => m.user_id === memberId);
      const name = member ? displayName(member) : 'Direct message';
      props.onCreateDm(memberId, name);
      return;
    }
    if (isGroup) {
      const t = groupTitle.trim();
      if (!t) return;
      props.onCreateGroup(t, Array.from(selected));
    }
  };

  /* Confirm button state */
  const confirmDisabled = isAddMode
    ? selected.size === 0
    : isDm
      ? false
      : isGroup
        ? !groupTitle.trim()
        : true; // 0 selected

  const confirmLabel = isAddMode
    ? 'Add members'
    : isDm
      ? 'Start chat'
      : isGroup
        ? 'Create group'
        : 'Select members';

  const heading = isAddMode ? 'Add members' : 'New conversation';
  const subtitle = isAddMode
    ? 'Select members to add'
    : 'Select one member for DM, or multiple for a group';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onCancel}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-slate-900">{heading}</h3>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>

        {/* Search input */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members…"
          maxLength={100}
          autoFocus
          className="mt-3 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
        />

        {/* Member list */}
        <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-gray-200">
          {loading ? (
            <div className="px-3 py-6 text-center text-sm text-slate-400">Loading members…</div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-slate-400">
              {members.length === 0 ? 'No other workspace members' : 'No matches'}
            </div>
          ) : (
            filtered.map((m) => {
              const isSelected = selected.has(m.user_id);
              return (
                <button
                  key={m.user_id}
                  type="button"
                  onClick={() => toggle(m.user_id)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-gray-50 ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <span
                    className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                      isSelected
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {isSelected && '✓'}
                  </span>
                  {/* Avatar */}
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                    {(m.full_name?.[0] || m.email?.[0] || '?').toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{displayName(m)}</p>
                    {m.full_name && m.email && (
                      <p className="truncate text-[11px] text-slate-400">{m.email}</p>
                    )}
                  </div>
                  <span className="ml-auto shrink-0 text-[11px] text-slate-400 capitalize">
                    {m.role}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Selected count */}
        {selected.size > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            {selected.size} member{selected.size !== 1 ? 's' : ''} selected
            {!isAddMode && ' (+ you)'}
            {isDm && ' — direct message'}
            {isGroup && ' — group chat'}
          </p>
        )}

        {/* Group title input — only when 2+ selected in create mode */}
        {isGroup && (
          <input
            type="text"
            value={groupTitle}
            onChange={(e) => setGroupTitle(e.target.value)}
            placeholder="Group name…"
            maxLength={200}
            className="mt-3 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
          />
        )}

        {/* Actions */}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirmDisabled}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
