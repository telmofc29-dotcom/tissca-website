// src/app/(admin)/admin/engineering/page.tsx v1.3
//
// PURPOSE:
// - Engineering gateway dashboard (engineer-only zone).
// - Single place to access critical platform tools safely.
// - Keeps system tidy: all “vital/internal” pages live under /admin/engineering/*
//
// SECURITY (LOCKED INTENT):
// - This page MUST be protected by /admin/engineering/layout.tsx (single gate).
// - Engineering tools must NOT be accessible via scattered per-page locks.
//
// LOCKED DESIGN RULE (WEB):
// - White base, light grey surfaces, subtle borders.
// - Gold only as accent (badges/highlights).
// - No heavy gradients.
// - Desktop long-session friendly.
//
// NOTES:
// - Support Inbox is live.
// - Stripe Backbone (observability) is live as a gateway page.
// - Everything else is "Coming soon" placeholders so the structure is future-proof,
//   and the system never ends up upside down again.
//
// CHANGES (v1.3):
// - FIX (architecture): Replace incorrect "Support Control Panel" link (support ops UI)
//   with an Engineering-only "Stripe Backbone" area for logs/health/events.
// - NEW: Add live tile -> /admin/engineering/stripe
// - Keep layout + styling rules unchanged.

'use client';

import Link from 'next/link';

type ToolStatus = 'live' | 'coming_soon';
type Tier = 'operational' | 'monitoring' | 'critical';

type ToolCard = {
  title: string;
  description: string;
  href?: string; // only for live items (or future wiring)
  status: ToolStatus;
  tier: Tier;
};

function StatusBadge({ status }: { status: ToolStatus }) {
  const cls =
    status === 'live'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-slate-50 text-slate-600 border-slate-200';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full border ${cls}`}>
      {status === 'live' ? 'Live' : 'Coming soon'}
    </span>
  );
}

function TierChip({ tier }: { tier: Tier }) {
  const map: Record<Tier, { label: string; cls: string }> = {
    operational: { label: 'Operational', cls: 'bg-slate-50 text-slate-700 border-slate-200' },
    monitoring: { label: 'Monitoring', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
    critical: { label: 'Critical', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  };

  const m = map[tier];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full border ${m.cls}`}>
      {m.label}
    </span>
  );
}

function ToolTile({ tool }: { tool: ToolCard }) {
  const isLive = tool.status === 'live' && !!tool.href;

  const base =
    'block rounded-xl border bg-white p-4 transition ' +
    'hover:border-gray-300 hover:shadow-[0_1px_8px_rgba(0,0,0,0.06)]';

  const disabled = 'opacity-75 cursor-not-allowed hover:shadow-none hover:border-gray-200';

  const content = (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 leading-tight">{tool.title}</h3>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{tool.description}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <TierChip tier={tool.tier} />
          <StatusBadge status={tool.status} />
        </div>
      </div>

      {/* Gold accent only (subtle) */}
      <div className="mt-1 h-[2px] w-10 rounded-full bg-[#C7A24B] opacity-70" />

      <div className="mt-2">
        {isLive ? (
          <span className="inline-flex items-center text-sm font-semibold text-blue-600">Open</span>
        ) : (
          <span className="inline-flex items-center text-sm font-semibold text-gray-400">Coming soon</span>
        )}
      </div>
    </div>
  );

  if (isLive) {
    return (
      <Link href={tool.href!} className={base}>
        {content}
      </Link>
    );
  }

  return (
    <div className={`${base} ${disabled}`} aria-disabled="true">
      {content}
    </div>
  );
}

function Zone({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-gray-50 border border-gray-200 rounded-2xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{children}</div>
    </section>
  );
}

export default function EngineeringHomePage() {
  const operational: ToolCard[] = [
    {
      title: 'Support Inbox',
      description:
        'Work admin notes like email. Filter open/archived, search, and jump straight to Users to resolve.',
      href: '/admin/engineering/support',
      status: 'live',
      tier: 'operational',
    },
    {
      title: 'Support Mode Sessions',
      description: 'Inspect active support-mode workspace selections and session history.',
      status: 'coming_soon',
      tier: 'operational',
    },
    {
      title: 'Staff Activity Log',
      description: 'Track staff actions (role changes, edits, support operations) with proof-based context.',
      status: 'coming_soon',
      tier: 'operational',
    },
  ];

  const monitoring: ToolCard[] = [
    {
      title: 'Stripe Backbone',
      description:
        'Engineering observability: webhook events, Stripe API failures, edge function issues, health checks, and trace IDs.',
      href: '/admin/engineering/stripe',
      status: 'live',
      tier: 'monitoring',
    },
    {
      title: 'Error Logs',
      description: 'Centralised app/server errors with quick filters (route, user, workspace, severity).',
      status: 'coming_soon',
      tier: 'monitoring',
    },
    {
      title: 'Background Jobs Monitor',
      description: 'Visibility into queued work (email sends, exports, maintenance tasks) and failures.',
      status: 'coming_soon',
      tier: 'monitoring',
    },
  ];

  const infrastructure: ToolCard[] = [
    {
      title: 'RLS Inspector',
      description: 'Diagnostics for “permission denied”: show table/policy checks and request context (proof-based).',
      status: 'coming_soon',
      tier: 'critical',
    },
    {
      title: 'System Health',
      description: 'High-level status checks (API, DB/RLS, edge functions, storage, email).',
      status: 'coming_soon',
      tier: 'critical',
    },
    {
      title: 'Feature Flags & Config',
      description: 'Controlled internal toggles for staged rollouts (staff-only, proof-based).',
      status: 'coming_soon',
      tier: 'critical',
    },
  ];

  return (
    <div className="min-h-[calc(100vh-120px)]">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <Link href="/admin" className="text-blue-600 hover:text-blue-700 inline-block">
          ← Admin Dashboard
        </Link>

        {/* Header (matches app structure, web colours) */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Engineering</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Controlled zone for vital platform tooling. Keep all sensitive diagnostics under one gate.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
            <div className="text-xs text-gray-500">Rule</div>
            <div className="text-sm font-semibold text-slate-900">
              If it’s vital/internal, it lives under <span className="font-mono">/admin/engineering/*</span>
            </div>
          </div>
        </header>

        {/* Zones */}
        <Zone title="Operational" description="Support workflows and staff operations.">
          {operational.map((t) => (
            <ToolTile key={t.title} tool={t} />
          ))}
        </Zone>

        <Zone title="Monitoring" description="Visibility into reliability, billing events, and background processes.">
          {monitoring.map((t) => (
            <ToolTile key={t.title} tool={t} />
          ))}
        </Zone>

        <Zone title="Infrastructure" description="Security, policies, and core system diagnostics.">
          {infrastructure.map((t) => (
            <ToolTile key={t.title} tool={t} />
          ))}
        </Zone>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6">
          <h3 className="text-base font-semibold text-slate-900">Rules for keeping this clean</h3>
          <ul className="mt-2 text-sm text-gray-700 list-disc pl-5 space-y-1">
            <li>
              Any internal diagnostics or sensitive operational tooling must live under{' '}
              <span className="font-mono">/admin/engineering/*</span>.
            </li>
            <li>
              Do not “sprinkle” locks everywhere — keep a single gate in{' '}
              <span className="font-mono">/admin/engineering/layout.tsx</span>.
            </li>
            <li>
              Legacy route <span className="font-mono">/admin/support</span> should remain a redirect into Engineering
              (so old links don’t break).
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}