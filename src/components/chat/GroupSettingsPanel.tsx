// src/components/chat/GroupSettingsPanel.tsx
//
// Slide-over panel for conversation management:
// - Rename group
// - View + remove members
// - Add members (opens MemberPicker)
// - Leave group
// - Mute / unmute conversation
// - Archive / unarchive conversation
// - Delete conversation

'use client';

import { useState, useCallback } from 'react';
import type { ConversationMember } from '@/lib/chat/chat-types';

interface GroupSettingsPanelProps {
  title: string;
  members: ConversationMember[];
  currentUserId: string | null;
  isGroup?: boolean;
  isMuted?: boolean;
  isArchived?: boolean;
  onRename: (newTitle: string) => Promise<boolean>;
  onRemoveMember: (memberId: string) => Promise<boolean>;
  onAddMembers?: () => void;
  onLeave: () => Promise<boolean>;
  onMute?: (muted: boolean) => Promise<boolean>;
  onArchive?: (archived: boolean) => Promise<boolean>;
  onDelete?: () => Promise<boolean>;
  onClose: () => void;
}

export function GroupSettingsPanel({
  title,
  members,
  currentUserId,
  isGroup = true,
  isMuted = false,
  isArchived = false,
  onRename,
  onRemoveMember,
  onAddMembers,
  onLeave,
  onMute,
  onArchive,
  onDelete,
  onClose,
}: GroupSettingsPanelProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(title);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const currentMember = members.find((m) => m.user_id === currentUserId);
  const isAdmin = currentMember?.role === 'admin';

  const handleRename = useCallback(async () => {
    if (!newTitle.trim() || newTitle.trim() === title) {
      setEditingTitle(false);
      return;
    }
    setSaving(true);
    const ok = await onRename(newTitle.trim());
    setSaving(false);
    if (ok) setEditingTitle(false);
  }, [newTitle, title, onRename]);

  const handleLeave = useCallback(async () => {
    setSaving(true);
    await onLeave();
    setSaving(false);
  }, [onLeave]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="mx-4 flex max-h-[70vh] w-full max-w-sm flex-col rounded-2xl border border-gray-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h3 className="text-base font-semibold text-slate-900">
            {isGroup ? 'Group Settings' : 'Conversation Settings'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-gray-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Title */}
          <div className="border-b border-gray-100 px-5 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Group Name</p>
            {editingTitle ? (
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  maxLength={200}
                  autoFocus
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-sm text-slate-900 outline-none focus:border-blue-400"
                  onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                />
                <button
                  type="button"
                  onClick={handleRename}
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <p className="flex-1 text-sm text-slate-900">{title}</p>
                <button
                  type="button"
                  onClick={() => setEditingTitle(true)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Members */}
          <div className="px-5 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Members · {members.length}
            </p>
            <div className="mt-2 space-y-1">
              {members.map((m) => (
                <div key={m.user_id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600">
                    {(m.full_name || m.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-900">{m.full_name || m.email || m.user_id.slice(0, 8)}</p>
                    {m.role === 'admin' && (
                      <span className="text-[10px] font-medium text-blue-600">Admin</span>
                    )}
                  </div>
                  {/* Admin can remove non-self members */}
                  {isAdmin && m.user_id !== currentUserId && (
                    <button
                      type="button"
                      onClick={() => onRemoveMember(m.user_id)}
                      className="text-xs text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  )}
                  {m.user_id === currentUserId && (
                    <span className="text-[10px] text-slate-400">You</span>
                  )}
                </div>
              ))}
            </div>
            {/* Add member button */}
            {isGroup && isAdmin && onAddMembers && (
              <button
                type="button"
                onClick={onAddMembers}
                className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Add member
              </button>
            )}
          </div>

          {/* Conversation controls */}
          <div className="border-t border-gray-100 px-5 py-3 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Controls</p>
            {/* Mute toggle */}
            {onMute && (
              <button
                type="button"
                onClick={async () => {
                  setSaving(true);
                  await onMute(!isMuted);
                  setSaving(false);
                }}
                disabled={saving}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  {isMuted ? (
                    <>
                      <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M23 9l-6 6M17 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </>
                  ) : (
                    <>
                      <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </>
                  )}
                </svg>
                {isMuted ? 'Unmute conversation' : 'Mute conversation'}
              </button>
            )}
            {/* Archive toggle */}
            {onArchive && (
              <button
                type="button"
                onClick={async () => {
                  setSaving(true);
                  await onArchive(!isArchived);
                  setSaving(false);
                }}
                disabled={saving}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="2" y="3" width="20" height="5" rx="1" stroke="currentColor" strokeWidth="2" />
                  <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" stroke="currentColor" strokeWidth="2" />
                  <path d="M10 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                {isArchived ? 'Unarchive conversation' : 'Archive conversation'}
              </button>
            )}
          </div>
        </div>

        {/* Leave group + Delete conversation */}
        <div className="border-t border-gray-200 px-5 py-3 space-y-2">
          {isGroup && (
            <button
              type="button"
              onClick={handleLeave}
              disabled={saving}
              className="w-full rounded-xl border border-red-200 bg-white py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              Leave Group
            </button>
          )}
          {onDelete && (
            confirmDelete ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setSaving(true);
                    await onDelete();
                    setSaving(false);
                  }}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-xl border border-gray-200 bg-white py-2 text-sm font-medium text-slate-600 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={saving}
                className="w-full rounded-xl border border-red-200 bg-white py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              >
                Delete Conversation
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
