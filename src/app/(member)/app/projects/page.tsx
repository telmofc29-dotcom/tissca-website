// src/app/(member)/app/projects/page.tsx v2.0
//
// PURPOSE:
// Cross-platform project dashboard — browse projects created from web or mobile,
// inspect scan/layout state, and continue planning.
//
// v2.0: Aligned to REAL production schema (verified 2 April 2026).
// Real columns: id, workspace_id, owner_id, name, status, space_type,
//   sync_version, last_modified_platform, last_synced_at, created_at, updated_at

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWorkspace } from '@/contexts/WorkspaceContext';

type Project = {
  id: string;
  name: string;
  status: string;
  space_type: string | null;
  last_modified_platform: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_COLOURS: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  archived: 'bg-gray-100 text-gray-500 border-gray-200',
  on_hold: 'bg-amber-50 text-amber-700 border-amber-200',
};

const SPACE_TYPE_LABELS: Record<string, string> = {
  kitchen: 'Kitchen',
  wardrobe: 'Wardrobe',
  bathroom: 'Bathroom',
  utility: 'Utility',
  bedroom: 'Bedroom',
  living: 'Living Room',
  general: 'General',
};

const PLATFORM_LABELS: Record<string, string> = {
  ios: 'iOS',
  android: 'Android',
  web: 'Web',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function ProjectsPage() {
  const { accessToken } = useWorkspace();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    const load = async () => {
      try {
        const res = await fetch('/api/workspace/projects', {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setProjects(json.projects ?? []);
      } catch (e) {
        console.warn('[ProjectsPage] Failed to load projects:', e);
        setError('Could not load projects. The table may not be set up yet.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [accessToken]);

  // ─── Loading ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Projects</h2>
          <p className="mt-1 text-sm text-slate-500">Loading…</p>
        </div>
      </div>
    );
  }

  // ─── Empty / Error ─────────────────────────────────────────────────────

  if (error || projects.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Projects</h2>
          <p className="mt-1 text-sm text-slate-500">
            Cross-platform project hub — projects created on iOS, Android, or web appear here.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          {error ? (
            <p className="text-sm text-slate-500">{error}</p>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-3xl">
                📐
              </div>
              <h3 className="text-lg font-semibold text-slate-900">No projects yet</h3>
              <p className="mt-2 text-sm text-slate-500">
                Create a project from the mobile app by scanning a room, or start a layout from the{' '}
                <Link href="/app/scan-to-layout" className="text-blue-600 underline hover:text-blue-700">
                  Scan to Layout
                </Link>{' '}
                page.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── Project list ──────────────────────────────────────────────────────

  const active = projects.filter((p) => p.status === 'active');
  const rest = projects.filter((p) => p.status !== 'active');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Projects</h2>
            <p className="mt-1 text-sm text-slate-500">
              {projects.length} project{projects.length !== 1 ? 's' : ''} across all platforms
            </p>
          </div>
        </div>
      </div>

      {/* Active projects */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h3 className="px-1 text-sm font-semibold uppercase tracking-wider text-slate-400">Active</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </div>
      )}

      {/* Other projects */}
      {rest.length > 0 && (
        <div className="space-y-3">
          <h3 className="px-1 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Completed &amp; Archived
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Project card ────────────────────────────────────────────────────────────

function ProjectCard({ project }: { project: Project }) {
  const statusClass = STATUS_COLOURS[project.status] ?? STATUS_COLOURS.active;
  const platform = PLATFORM_LABELS[project.last_modified_platform ?? ''] ?? 'Web';
  const spaceLabel = SPACE_TYPE_LABELS[project.space_type ?? ''] ?? project.space_type ?? null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      {/* Top row: name + status */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-base font-semibold text-slate-900 leading-snug">{project.name}</h4>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${statusClass}`}>
          {project.status.replace('_', ' ')}
        </span>
      </div>

      {/* Space type */}
      {spaceLabel && (
        <p className="mt-1 text-sm text-slate-500">{spaceLabel}</p>
      )}

      {/* Info chips */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
          {platform}
        </span>
      </div>

      {/* Footer */}
      <p className="mt-3 text-[11px] text-slate-400">
        Updated {formatDate(project.updated_at)}
      </p>
    </div>
  );
}

