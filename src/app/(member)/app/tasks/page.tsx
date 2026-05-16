// src/app/(member)/app/tasks/page.tsx v4.0
//
// PURPOSE:
// - Full CRUD tasks page aligned to live Supabase public.tasks schema.
// - Statuses: OPEN, COMPLETED, CANCELLED (Android contract).
// - Checklist items with full JSONB persistence.
// - Due date stored as due_date_millis (bigint epoch ms).
// - Timestamps: created_at_millis, updated_at_millis (bigint epoch ms).
// - Workspace-scoped via workspace_id.
//
// VERSION HISTORY:
// - v1.0: Initial placeholder UI.
// - v2.0 (2026-03-27): Wire to real /api/workspace/tasks data (read-only).
// - v3.0 (2026-04-08): Full CRUD — create, edit, complete, restore, cancel,
//                        checklist items, due dates, detail panel.
// - v4.0 (2026-04-08): Fix to match live Supabase schema — workspace_id,
//                        notes, millis timestamps, client_record_id, created_by.

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { trackEvent } from '@/utils/analytics';

// ─── Types (aligned to Android contract) ─────────────────────────────────────

type ChecklistItem = {
  id: string;
  text: string;
  isChecked: boolean;
  order: number;
};

type Task = {
  id: string;
  workspace_id: string;
  client_record_id: string;
  title: string;
  notes: string | null;
  status: string;
  due_date_millis: number | null;
  created_at_millis: number;
  updated_at_millis: number;
  created_by: string | null;
  checklist_items: ChecklistItem[] | null;
};

type TaskFormData = {
  title: string;
  notes: string;
  due_date: string;
  checklist_items: ChecklistItem[];
};

const EMPTY_FORM: TaskFormData = {
  title: '',
  notes: '',
  due_date: '',
  checklist_items: [],
};

// ─── Status helpers ──────────────────────────────────────────────────────────

function normalizeStatus(raw: string): string {
  const s = raw.toUpperCase().trim();
  if (s === 'COMPLETED' || s === 'DONE') return 'COMPLETED';
  if (s === 'CANCELLED' || s === 'CANCELED') return 'CANCELLED';
  return 'OPEN';
}

function statusLabel(status: string): string {
  const s = normalizeStatus(status);
  if (s === 'COMPLETED') return 'Completed';
  if (s === 'CANCELLED') return 'Cancelled';
  return 'Open';
}

function statusPillClasses(status: string): string {
  const s = normalizeStatus(status);
  if (s === 'COMPLETED') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (s === 'CANCELLED') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-blue-200 bg-blue-50 text-blue-700';
}

// ─── Due date helpers ────────────────────────────────────────────────────────

function getDueDateInfo(dueDateMillis: number | null): { label: string; classes: string } | null {
  if (dueDateMillis == null) return null;
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const due = new Date(dueDateMillis);
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const diffDays = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'Overdue', classes: 'border-red-200 bg-red-50 text-red-700' };
    if (diffDays === 0) return { label: 'Today', classes: 'border-amber-200 bg-amber-50 text-amber-700' };
    if (diffDays === 1) return { label: 'Tomorrow', classes: 'border-yellow-200 bg-yellow-50 text-yellow-700' };
    if (diffDays <= 7) return { label: `${diffDays}d`, classes: 'border-blue-200 bg-blue-50 text-blue-700' };
    return {
      label: due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      classes: 'border-gray-200 bg-gray-50 text-slate-700',
    };
  } catch {
    return null;
  }
}

function formatDateFull(millis: number | null): string {
  if (millis == null) return '\u2014';
  try {
    return new Date(millis).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '\u2014';
  }
}

function millisToDateInput(millis: number | null): string {
  if (millis == null) return '';
  try {
    return new Date(millis).toISOString().split('T')[0];
  } catch {
    return '';
  }
}

function dateInputToMillis(dateStr: string): number | null {
  if (!dateStr) return null;
  const ms = new Date(dateStr + 'T00:00:00Z').getTime();
  return isNaN(ms) ? null : ms;
}

function generateId(): string {
  return `cl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AppTasksPage() {
  const { accessToken, isLoading: ctxLoading } = useWorkspace();

  // Data state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<TaskFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  // ─── API helpers ─────────────────────────────────────────────────────────

  const authHeaders = useCallback(
    () => ({ Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }),
    [accessToken],
  );

  const fetchTasks = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch('/api/workspace/tasks', {
        headers: authHeaders(),
        cache: 'no-store',
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error('Session expired. Please refresh the page.');
        throw new Error('Failed to load tasks');
      }
      const data = await res.json();
      setTasks(data.tasks ?? []);
      setError(null);
      trackEvent('feature_view', '/app/tasks', {
        eventLabel: 'tasks_loaded',
        metadata: { feature: 'tasks', action: 'view', itemCount: (data.tasks ?? []).length },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [accessToken, authHeaders]);

  useEffect(() => {
    if (ctxLoading || !accessToken) return;
    fetchTasks();
  }, [accessToken, ctxLoading, fetchTasks]);

  // ─── Task lists ──────────────────────────────────────────────────────────

  const { openTasks, completedTasks } = useMemo(() => {
    const open: Task[] = [];
    const done: Task[] = [];
    for (const t of tasks) {
      const s = normalizeStatus(t.status);
      if (s === 'COMPLETED' || s === 'CANCELLED') done.push(t);
      else open.push(t);
    }
    return { openTasks: open, completedTasks: done };
  }, [tasks]);

  // ─── Create ──────────────────────────────────────────────────────────────

  function openCreateModal() {
    setFormData(EMPTY_FORM);
    setFormError(null);
    setEditingTask(null);
    setShowCreateModal(true);
  }

  async function handleCreate() {
    if (!accessToken) { setFormError('Session expired.'); return; }
    if (!formData.title.trim()) { setFormError('Task title is required.'); return; }
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch('/api/workspace/tasks', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: formData.title.trim(),
          notes: formData.notes.trim() || null,
          status: 'OPEN',
          due_date_millis: dateInputToMillis(formData.due_date),
          checklist_items: formData.checklist_items.length > 0 ? formData.checklist_items : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create task');
      setShowCreateModal(false);
      await fetchTasks();
      trackEvent('feature_view', '/app/tasks', { eventLabel: 'task_create', metadata: { action: 'create' } });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setSaving(false);
    }
  }

  // ─── Edit ────────────────────────────────────────────────────────────────

  function openEditPanel(task: Task) {
    setEditingTask(task);
    setFormData({
      title: task.title || '',
      notes: task.notes || '',
      due_date: millisToDateInput(task.due_date_millis),
      checklist_items: task.checklist_items ? [...task.checklist_items] : [],
    });
    setFormError(null);
    setShowCreateModal(false);
  }

  async function handleUpdate() {
    if (!editingTask) return;
    if (!formData.title.trim()) { setFormError('Task title is required.'); return; }
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch('/api/workspace/tasks', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          id: editingTask.id,
          title: formData.title.trim(),
          notes: formData.notes.trim() || null,
          due_date_millis: dateInputToMillis(formData.due_date),
          checklist_items: formData.checklist_items.length > 0 ? formData.checklist_items : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update task');
      setEditingTask(null);
      await fetchTasks();
      trackEvent('feature_view', '/app/tasks', { eventLabel: 'task_update', metadata: { action: 'update' } });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update task');
    } finally {
      setSaving(false);
    }
  }

  // ─── Status actions ──────────────────────────────────────────────────────

  async function handleStatusChange(taskId: string, newStatus: string) {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/workspace/tasks', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update task');
      }
      await fetchTasks();
      trackEvent('feature_view', '/app/tasks', {
        eventLabel: `task_${newStatus.toLowerCase()}`,
        metadata: { action: newStatus.toLowerCase(), taskId },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  }

  // ─── Delete ──────────────────────────────────────────────────────────────

  async function handleDelete(taskId: string) {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/workspace/tasks', {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify({ id: taskId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete task');
      }
      if (editingTask?.id === taskId) setEditingTask(null);
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  }

  // ─── Checklist management ────────────────────────────────────────────────

  function addChecklistItem() {
    setFormData((prev) => ({
      ...prev,
      checklist_items: [
        ...prev.checklist_items,
        { id: generateId(), text: '', isChecked: false, order: prev.checklist_items.length },
      ],
    }));
  }

  function updateChecklistItem(id: string, updates: Partial<ChecklistItem>) {
    setFormData((prev) => ({
      ...prev,
      checklist_items: prev.checklist_items.map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      ),
    }));
  }

  function removeChecklistItem(id: string) {
    setFormData((prev) => ({
      ...prev,
      checklist_items: prev.checklist_items
        .filter((item) => item.id !== id)
        .map((item, idx) => ({ ...item, order: idx })),
    }));
  }

  const isLoading = ctxLoading || loading;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tasks</h1>
          <p className="text-sm text-slate-500">
            {openTasks.length} open{completedTasks.length > 0 ? ` \u00B7 ${completedTasks.length} completed` : ''}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          + New task
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Main layout: task list + detail panel */}
      <div className={`grid gap-6 ${editingTask ? 'lg:grid-cols-[1fr_420px]' : 'grid-cols-1'}`}>
        {/* Left: Task list */}
        <div className="space-y-4">
          {/* Open tasks */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.22)]">
            {isLoading ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-slate-400">
                Loading tasks&hellip;
              </div>
            ) : openTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-slate-600">
                <p className="font-medium">No open tasks</p>
                <p className="mt-1 text-slate-400">Create your first task to get started.</p>
                <button
                  onClick={openCreateModal}
                  className="mt-3 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                >
                  + New task
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {openTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    isSelected={editingTask?.id === task.id}
                    onSelect={() => openEditPanel(task)}
                    onComplete={() => handleStatusChange(task.id, 'COMPLETED')}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Completed tasks */}
          {completedTasks.length > 0 && (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.22)]">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-sm font-semibold text-slate-700">
                  Completed ({completedTasks.length})
                </span>
                <svg
                  className={`h-4 w-4 text-slate-400 transition ${showCompleted ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showCompleted && (
                <div className="mt-3 space-y-2">
                  {completedTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      isSelected={editingTask?.id === task.id}
                      onSelect={() => openEditPanel(task)}
                      onRestore={() => handleStatusChange(task.id, 'OPEN')}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Right: Detail/edit panel */}
        {editingTask && (
          <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.22)] lg:sticky lg:top-6 lg:self-start">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Edit task</h2>
              <button
                onClick={() => setEditingTask(null)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-gray-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <TaskForm
              formData={formData}
              setFormData={setFormData}
              formError={formError}
              saving={saving}
              onSave={handleUpdate}
              onCancel={() => setEditingTask(null)}
              saveLabel="Save changes"
              addChecklistItem={addChecklistItem}
              updateChecklistItem={updateChecklistItem}
              removeChecklistItem={removeChecklistItem}
            />

            {/* Status actions */}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusPillClasses(editingTask.status)}`}>
                {statusLabel(editingTask.status)}
              </span>
              {normalizeStatus(editingTask.status) === 'OPEN' && (
                <>
                  <button
                    onClick={() => handleStatusChange(editingTask.id, 'COMPLETED')}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    Complete
                  </button>
                  <button
                    onClick={() => handleStatusChange(editingTask.id, 'CANCELLED')}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                  >
                    Cancel
                  </button>
                </>
              )}
              {(normalizeStatus(editingTask.status) === 'COMPLETED' || normalizeStatus(editingTask.status) === 'CANCELLED') && (
                <button
                  onClick={() => handleStatusChange(editingTask.id, 'OPEN')}
                  className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  Restore
                </button>
              )}
              <button
                onClick={() => { if (confirm('Delete this task permanently?')) handleDelete(editingTask.id); }}
                className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-slate-500 transition hover:bg-gray-100"
              >
                Delete
              </button>
            </div>

            {/* Meta */}
            <div className="mt-3 text-xs text-slate-400">
              Created {formatDateFull(editingTask.created_at_millis)} &middot; Updated {formatDateFull(editingTask.updated_at_millis)}
            </div>
          </aside>
        )}
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">New task</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-gray-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <TaskForm
              formData={formData}
              setFormData={setFormData}
              formError={formError}
              saving={saving}
              onSave={handleCreate}
              onCancel={() => setShowCreateModal(false)}
              saveLabel="Create task"
              addChecklistItem={addChecklistItem}
              updateChecklistItem={updateChecklistItem}
              removeChecklistItem={removeChecklistItem}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TaskRow component ───────────────────────────────────────────────────────

function TaskRow({
  task,
  isSelected,
  onSelect,
  onComplete,
  onRestore,
}: {
  task: Task;
  isSelected: boolean;
  onSelect: () => void;
  onComplete?: () => void;
  onRestore?: () => void;
}) {
  const status = normalizeStatus(task.status);
  const isDone = status === 'COMPLETED' || status === 'CANCELLED';
  const dueInfo = !isDone ? getDueDateInfo(task.due_date_millis) : null;
  const checklistCount = task.checklist_items?.length ?? 0;
  const checklistDone = task.checklist_items?.filter((i) => i.isChecked).length ?? 0;

  return (
    <article
      onClick={onSelect}
      className={`group flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
        isSelected
          ? 'border-slate-300 bg-slate-50 ring-1 ring-slate-200'
          : 'border-gray-200 bg-white hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (isDone && onRestore) onRestore();
          else if (!isDone && onComplete) onComplete();
        }}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
          isDone
            ? 'border-emerald-400 bg-emerald-400 text-white'
            : 'border-gray-300 hover:border-slate-400'
        }`}
      >
        {isDone && (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`font-semibold ${isDone ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
            {task.title || 'Untitled task'}
          </p>
          {status === 'CANCELLED' && (
            <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
              Cancelled
            </span>
          )}
        </div>
        {task.notes && !isDone && (
          <p className="mt-0.5 text-sm text-slate-500 line-clamp-1">{task.notes}</p>
        )}
        {/* Checklist progress */}
        {checklistCount > 0 && (
          <p className="mt-1 text-xs text-slate-400">
            {checklistDone}/{checklistCount} checklist items
          </p>
        )}
      </div>

      {/* Due badge */}
      {dueInfo && (
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${dueInfo.classes}`}>
          {dueInfo.label}
        </span>
      )}
    </article>
  );
}

// ─── TaskForm component ──────────────────────────────────────────────────────

function TaskForm({
  formData,
  setFormData,
  formError,
  saving,
  onSave,
  onCancel,
  saveLabel,
  addChecklistItem,
  updateChecklistItem,
  removeChecklistItem,
}: {
  formData: TaskFormData;
  setFormData: React.Dispatch<React.SetStateAction<TaskFormData>>;
  formError: string | null;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
  addChecklistItem: () => void;
  updateChecklistItem: (id: string, updates: Partial<ChecklistItem>) => void;
  removeChecklistItem: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {formError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Title *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          placeholder="Task title"
          autoFocus
        />
      </div>

      {/* Notes/description */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
        <textarea
          rows={3}
          value={formData.notes}
          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          placeholder="Optional notes"
        />
      </div>

      {/* Due date */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Due date</label>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData((prev) => ({ ...prev, due_date: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          {formData.due_date && (
            <button
              onClick={() => setFormData((prev) => ({ ...prev, due_date: '' }))}
              className="shrink-0 rounded-lg border border-gray-200 px-2 py-2 text-xs text-slate-500 transition hover:bg-gray-100"
              title="Clear due date"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Checklist */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700">Checklist</label>
          <button
            onClick={addChecklistItem}
            className="rounded-lg px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-gray-100"
          >
            + Add item
          </button>
        </div>
        {formData.checklist_items.length === 0 ? (
          <p className="text-xs text-slate-400">No checklist items. Click &ldquo;+ Add item&rdquo; to start.</p>
        ) : (
          <div className="space-y-2">
            {formData.checklist_items.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <button
                  onClick={() => updateChecklistItem(item.id, { isChecked: !item.isChecked })}
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition ${
                    item.isChecked
                      ? 'border-emerald-400 bg-emerald-400 text-white'
                      : 'border-gray-300 hover:border-slate-400'
                  }`}
                >
                  {item.isChecked && (
                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => updateChecklistItem(item.id, { text: e.target.value })}
                  className={`flex-1 rounded-md border border-gray-200 px-2 py-1 text-sm shadow-sm focus:border-slate-400 focus:outline-none ${
                    item.isChecked ? 'text-slate-400 line-through' : 'text-slate-900'
                  }`}
                  placeholder="Checklist item"
                />
                <button
                  onClick={() => removeChecklistItem(item.id)}
                  className="shrink-0 rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                  title="Remove item"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
        <button
          onClick={onCancel}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? 'Saving\u2026' : saveLabel}
        </button>
      </div>
    </div>
  );
}
