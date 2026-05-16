// src/app/(member)/app/scan-to-layout/page.tsx v1.0
//
// PURPOSE:
// Scan to Layout hub — the room capture / room building / kitchen & wardrobe placement tool.
// Supports manual room creation with shape presets (rectangle, L-shape, U-shape, custom).
// Prepares for future LiDAR scan import on supported devices.
//
// DISTINCT FROM PLANNER:
// Planner = broader planning workspace (projects, schedules, shortcuts)
// Scan to Layout = room geometry → module placement → layout output

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useDeviceCapabilities } from '@/hooks/useDeviceCapabilities';
import { trackEvent } from '@/utils/analytics';
import {
  createLayoutDocumentFromPreset,
  LAYOUT_TYPE_LABELS,
  LAYOUT_STATUS_LABELS,
  ROOM_SHAPE_LABELS,
  ROOM_SHAPE_DESCRIPTIONS,
} from '@/lib/planner/planner-types';
import type { RoomShapePreset } from '@/lib/planner/planner-types';

// ─── Types ───────────────────────────────────────────────────────────────────

type LayoutSummary = {
  id: string;
  name: string;
  description: string | null;
  layout_type: string;
  status: string;
  layout_data: { placedModules?: unknown[]; room?: { width?: number; depth?: number } };
  lead_id: string | null;
  job_id: string | null;
  created_at: string;
  updated_at: string;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function ScanToLayoutPage() {
  const router = useRouter();
  const { accessToken, workspaceId, isLoading: ctxLoading } = useWorkspace();
  const device = useDeviceCapabilities();

  const [layouts, setLayouts] = useState<LayoutSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // ─── CRM linking state ─────────────────────────────────────────────────

  type CrmLead = { id: string; name: string | null };
  type CrmJob = { id: string; title: string | null };
  const [crmLeads, setCrmLeads] = useState<CrmLead[]>([]);
  const [crmJobs, setCrmJobs] = useState<CrmJob[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');

  // ─── Manual creation form state ───────────────────────────────────────

  const [showCreateFlow, setShowCreateFlow] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('kitchen');
  const [newDesc, setNewDesc] = useState('');
  const [roomShape, setRoomShape] = useState<RoomShapePreset>('rectangle');
  const [roomWidth, setRoomWidth] = useState(3600);
  const [roomDepth, setRoomDepth] = useState(3000);
  const [ceilingHeight, setCeilingHeight] = useState(2400);
  // L-shape extras
  const [cutoutWidth, setCutoutWidth] = useState(1400);
  const [cutoutDepth, setCutoutDepth] = useState(1200);
  // U-shape extras
  const [leftWingWidth, setLeftWingWidth] = useState(900);
  const [rightWingWidth, setRightWingWidth] = useState(900);
  const [wingDepth, setWingDepth] = useState(1500);

  const authHeaders = useCallback(
    () => ({ Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }),
    [accessToken],
  );

  // ─── Fetch ─────────────────────────────────────────────────────────────

  const fetchLayouts = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch('/api/workspace/layouts', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load layouts');
        setLayouts([]);
      } else {
        setLayouts(data.layouts ?? []);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load layouts');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (ctxLoading) return;
    if (!accessToken) {
      setLoading(false);
      return;
    }
    fetchLayouts();
    trackEvent('feature_view', '/app/scan-to-layout', {
      eventLabel: 'scan_to_layout_list',
      metadata: { feature: 'scan_to_layout', action: 'view' },
    });
  }, [accessToken, ctxLoading, fetchLayouts]);

  // ─── Create ────────────────────────────────────────────────────────────

  async function handleCreate() {
    const name = newName.trim() || 'Untitled Layout';
    setCreating(true);
    setError(null);
    try {
      const extraDims = roomShape === 'l-shape'
        ? { cutoutWidth, cutoutDepth }
        : roomShape === 'u-shape'
          ? { leftWingWidth, rightWingWidth, wingDepth }
          : undefined;

      const layoutData = createLayoutDocumentFromPreset(
        roomShape,
        roomWidth,
        roomDepth,
        ceilingHeight,
        extraDims,
      );

      const res = await fetch('/api/workspace/layouts', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name,
          description: newDesc.trim() || null,
          layout_type: newType,
          layout_data: layoutData,
          scan_source: 'manual',
          ...(selectedLeadId ? { lead_id: selectedLeadId } : {}),
          ...(selectedJobId ? { job_id: selectedJobId } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create layout');

      trackEvent('feature_view', '/app/scan-to-layout', {
        eventLabel: 'layout_create',
        metadata: { action: 'create', layoutType: newType, roomShape },
      });

      router.push(`/app/scan-to-layout/${data.layout.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create layout');
      setCreating(false);
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────

  async function handleDelete(layout: LayoutSummary) {
    if (!confirm(`Delete "${layout.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch('/api/workspace/layouts', {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify({ id: layout.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      await fetchLayouts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete layout');
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  function formatDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  function statusBadgeClass(status: string) {
    if (status === 'completed') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (status === 'in_progress') return 'border-blue-200 bg-blue-50 text-blue-700';
    if (status === 'archived') return 'border-gray-200 bg-gray-100 text-gray-600';
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  function openCreateFlow() {
    setShowCreateFlow(true);
    setNewName('');
    setNewDesc('');
    setNewType('kitchen');
    setRoomShape('rectangle');
    setRoomWidth(3600);
    setRoomDepth(3000);
    setCeilingHeight(2400);
    setSelectedLeadId('');
    setSelectedJobId('');
    // Fetch leads and jobs for linking
    if (accessToken) {
      const h = { Authorization: `Bearer ${accessToken}` };
      fetch('/api/workspace/leads', { headers: h }).then(r => r.ok ? r.json() : { leads: [] }).then(d => setCrmLeads(d.leads ?? [])).catch(() => {});
      fetch('/api/workspace/jobs', { headers: h }).then(r => r.ok ? r.json() : { jobs: [] }).then(d => setCrmJobs(d.jobs ?? [])).catch(() => {});
    }
  }

  const isLoading = ctxLoading || loading;
  const noWorkspace = !ctxLoading && !workspaceId;

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      {/* Main area */}
      <section className="xl:col-span-2 space-y-4">
        {/* Header */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 mb-2">
            <button
              onClick={() => router.push('/app/tools')}
              className="text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors"
            >
              Tools
            </button>
            <span className="text-xs text-slate-400">/</span>
            <span className="text-xs text-slate-500">Scan to Layout</span>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Scan to Layout
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {device.ready && !device.isMobileDevice
                  ? 'Create room layouts manually — set dimensions, add walls, place cabinets and fittings.'
                  : 'Create rooms manually or scan on supported devices. Set dimensions, add walls, then place modules.'}
              </p>
            </div>
            <button
              onClick={openCreateFlow}
              disabled={noWorkspace}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Create room manually
            </button>
          </div>
        </div>

        {/* Workspace warning */}
        {noWorkspace && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>Workspace not found.</strong> Your account does not have an active workspace yet.
            Layouts are saved per workspace. Please contact support or complete your onboarding to start creating layouts.
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-2 font-semibold underline">Dismiss</button>
          </div>
        )}

        {/* Action cards */}
        {!showCreateFlow && !isLoading && (
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Manual create card */}
            <button
              onClick={openCreateFlow}
              disabled={noWorkspace}
              className="rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)] hover:border-amber-300 hover:bg-amber-50/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-xl">📐</span>
                <h3 className="text-sm font-semibold text-slate-900">Create room manually</h3>
              </div>
              <p className="text-xs text-slate-600">
                Set room shape, dimensions, ceiling height, then place cabinets and fittings in the visual editor.
              </p>
            </button>

            {/* Scan card (future) */}
            <div
              className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 p-5 text-left opacity-80"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-xl">📱</span>
                <h3 className="text-sm font-semibold text-slate-500">
                  {device.isAppleDevice ? 'Scan room with LiDAR' : 'Import / scan room'}
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                {device.isAppleDevice
                  ? 'LiDAR room scanning coming soon. Your device may support this feature in a future update.'
                  : 'Room scanning via iPhone or iPad LiDAR is coming in a future update. Scanned rooms will auto-populate the layout editor.'}
              </p>
              <span className="mt-2 inline-block rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Coming next
              </span>
            </div>
          </div>
        )}

        {/* Saved layouts list */}
        <div className="space-y-3">
          {!showCreateFlow && (
            <h3 className="text-sm font-semibold text-slate-700 px-1">Saved Layouts</h3>
          )}

          {isLoading ? (
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-12 text-center shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              <p className="mt-3 text-sm text-slate-500">Loading layouts...</p>
            </div>
          ) : !showCreateFlow && layouts.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
              <p className="text-sm text-slate-500">
                No saved layouts yet. Create your first room to get started.
              </p>
            </div>
          ) : (
            !showCreateFlow && layouts.map((layout) => {
              const moduleCount = Array.isArray(layout.layout_data?.placedModules)
                ? layout.layout_data.placedModules.length
                : 0;
              const roomW = layout.layout_data?.room?.width;
              const roomD = layout.layout_data?.room?.depth;
              return (
                <article
                  key={layout.id}
                  className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)] hover:bg-gray-50/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/app/scan-to-layout/${layout.id}`)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{layout.name}</p>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(layout.status)}`}>
                          {LAYOUT_STATUS_LABELS[layout.status] || layout.status}
                        </span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {LAYOUT_TYPE_LABELS[layout.layout_type] || layout.layout_type}
                        </span>
                      </div>
                      {layout.description && (
                        <p className="mt-1 text-sm text-slate-600 line-clamp-1">{layout.description}</p>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        {roomW && roomD && <span>{roomW} × {roomD} mm</span>}
                        <span>{moduleCount} module{moduleCount !== 1 ? 's' : ''}</span>
                        <span>Updated {formatDate(layout.updated_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(layout); }}
                        className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/app/scan-to-layout/${layout.id}`); }}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {!isLoading && !showCreateFlow && layouts.length > 0 && (
          <p className="text-xs text-slate-500 pl-1">
            {layouts.length} layout{layouts.length !== 1 ? 's' : ''}
          </p>
        )}
      </section>

      {/* Right sidebar */}
      <aside className="space-y-4">
        {/* Manual room creation flow */}
        {showCreateFlow && (
          <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
            <h3 className="text-base font-semibold text-slate-900 mb-1">Create Room Manually</h3>
            <p className="text-xs text-slate-500 mb-4">Set up your room dimensions, then place modules in the visual editor.</p>

            <div className="space-y-4">
              {/* Room name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Room name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. 14 Oak Lane — Kitchen"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Layout type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Layout type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  {Object.entries(LAYOUT_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Room shape preset */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Room shape</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['rectangle', 'l-shape', 'u-shape', 'custom'] as RoomShapePreset[]).map((shape) => (
                    <button
                      key={shape}
                      type="button"
                      onClick={() => setRoomShape(shape)}
                      className={`rounded-lg border p-2.5 text-left transition-colors ${
                        roomShape === shape
                          ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-400'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <span className="block text-sm font-medium text-slate-900">{ROOM_SHAPE_LABELS[shape]}</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">{ROOM_SHAPE_DESCRIPTIONS[shape]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Main dimensions */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Room dimensions (mm)</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs text-slate-500 mb-0.5 block">Width</span>
                    <input
                      type="number"
                      value={roomWidth}
                      onChange={(e) => setRoomWidth(Math.max(500, Number(e.target.value)))}
                      min={500}
                      step={100}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 mb-0.5 block">Depth</span>
                    <input
                      type="number"
                      value={roomDepth}
                      onChange={(e) => setRoomDepth(Math.max(500, Number(e.target.value)))}
                      min={500}
                      step={100}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Ceiling height */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ceiling height (mm)</label>
                <input
                  type="number"
                  value={ceilingHeight}
                  onChange={(e) => setCeilingHeight(Math.max(1800, Number(e.target.value)))}
                  min={1800}
                  step={50}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* L-shape extras */}
              {roomShape === 'l-shape' && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <span className="block text-xs font-medium text-slate-700 mb-2">L-Shape cutout</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-xs text-slate-500 mb-0.5 block">Cutout width</span>
                      <input
                        type="number"
                        value={cutoutWidth}
                        onChange={(e) => setCutoutWidth(Math.max(200, Number(e.target.value)))}
                        min={200}
                        step={100}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 mb-0.5 block">Cutout depth</span>
                      <input
                        type="number"
                        value={cutoutDepth}
                        onChange={(e) => setCutoutDepth(Math.max(200, Number(e.target.value)))}
                        min={200}
                        step={100}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* U-shape extras */}
              {roomShape === 'u-shape' && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <span className="block text-xs font-medium text-slate-700 mb-2">U-Shape wings</span>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-xs text-slate-500 mb-0.5 block">Left wing width</span>
                        <input
                          type="number"
                          value={leftWingWidth}
                          onChange={(e) => setLeftWingWidth(Math.max(200, Number(e.target.value)))}
                          min={200}
                          step={100}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 mb-0.5 block">Right wing width</span>
                        <input
                          type="number"
                          value={rightWingWidth}
                          onChange={(e) => setRightWingWidth(Math.max(200, Number(e.target.value)))}
                          min={200}
                          step={100}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 mb-0.5 block">Wing depth</span>
                      <input
                        type="number"
                        value={wingDepth}
                        onChange={(e) => setWingDepth(Math.max(200, Number(e.target.value)))}
                        min={200}
                        step={100}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Link to Lead / Job */}
              {(crmLeads.length > 0 || crmJobs.length > 0) && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <span className="block text-xs font-medium text-slate-700 mb-2">Link to CRM (optional)</span>
                  <div className="space-y-2">
                    {crmLeads.length > 0 && (
                      <div>
                        <span className="text-xs text-slate-500 mb-0.5 block">Lead</span>
                        <select
                          value={selectedLeadId}
                          onChange={(e) => setSelectedLeadId(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="">None</option>
                          {crmLeads.map((l) => (
                            <option key={l.id} value={l.id}>{l.name || 'Untitled Lead'}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {crmJobs.length > 0 && (
                      <div>
                        <span className="text-xs text-slate-500 mb-0.5 block">Job</span>
                        <select
                          value={selectedJobId}
                          onChange={(e) => setSelectedJobId(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="">None</option>
                          {crmJobs.map((j) => (
                            <option key={j.id} value={j.id}>{j.title || 'Untitled Job'}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Client brief, site notes..."
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-y"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  onClick={() => setShowCreateFlow(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || noWorkspace}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create & open editor'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info panels (when create flow is hidden) */}
        {!showCreateFlow && (
          <>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
              <h3 className="text-base font-semibold text-amber-900">How it works</h3>
              <div className="mt-3 space-y-2 text-sm text-amber-900/80">
                <p>1. <strong>Create room</strong> — choose shape, set dimensions, ceiling height.</p>
                <p>2. <strong>Add openings</strong> — doors, windows, fixed obstacles.</p>
                <p>3. <strong>Place modules</strong> — drag cabinets, appliances, and fittings into the room.</p>
                <p>4. <strong>Inspect & adjust</strong> — select any item to edit dimensions and position.</p>
                <p>5. <strong>Summary</strong> — view placed items, quantities, and linear runs.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
              <h3 className="text-base font-semibold text-slate-900">Supported layout types</h3>
              <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                <p><strong>Kitchen</strong> — base, wall, tall cabinets, appliance housings</p>
                <p><strong>Wardrobe</strong> — single and double units, fillers</p>
                <p><strong>Bathroom</strong> — vanity units, storage</p>
                <p><strong>Utility / General</strong> — flexible module placement</p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
              <h3 className="text-base font-semibold text-slate-900">Room shapes</h3>
              <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                <p><strong>Rectangle</strong> — standard 4-wall room</p>
                <p><strong>L-Shape</strong> — with one corner cutout</p>
                <p><strong>U-Shape</strong> — with two wing extensions</p>
                <p><strong>Custom</strong> — start with a rectangle, edit walls in editor</p>
              </div>
            </div>

            {/* Device-aware scan info */}
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5">
              <h3 className="text-sm font-semibold text-slate-600">
                {device.isAppleDevice ? 'LiDAR scan import' : 'Scan import'}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {device.isAppleDevice
                  ? 'Your device may support LiDAR scanning. Room scan import is coming in a future update — scanned rooms will automatically populate the layout editor with accurate wall geometry.'
                  : 'iPhone and iPad LiDAR room scanning will be available in a future update. Scanned rooms will auto-populate the planner with accurate wall geometry.'}
              </p>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
