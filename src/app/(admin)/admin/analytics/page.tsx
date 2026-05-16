'use client';

import { useEffect, useState } from 'react';
import type { AnalyticsStats, FunnelData, PagePerformance, GeoInsight, DailyTrend, Insight, CtaScore, CityIntelligence } from '@/utils/analytics';

function BarChart({ items, accentColor = 'bg-blue-500', maxItems = 10 }: { items: { key: string; count: number }[]; accentColor?: string; maxItems?: number }) {
  const display = items.slice(0, maxItems);
  const max = display[0]?.count || 1;
  if (display.length === 0) return <p className="text-gray-500 text-sm">No data yet.</p>;

  return (
    <div className="space-y-2">
      {display.map(({ key, count }) => {
        const pct = Math.round((count / max) * 100);
        return (
          <div key={key} className="flex items-center gap-3">
            <div className="w-40 text-sm text-slate-700 truncate" title={key}>{key}</div>
            <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
              <div className={`${accentColor} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <div className="w-16 text-right text-sm font-semibold text-slate-800">{count}</div>
          </div>
        );
      })}
    </div>
  );
}

function FunnelViz({ funnel }: { funnel: FunnelData }) {
  const maxCount = funnel.steps[0]?.count || 1;
  return (
    <div className="border border-gray-100 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-800">{funnel.name}</h4>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${funnel.conversionRate >= 20 ? 'bg-emerald-50 text-emerald-700' : funnel.conversionRate >= 5 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
          {funnel.conversionRate}% conversion
        </span>
      </div>
      <div className="space-y-2">
        {funnel.steps.map((step, i) => {
          const pct = maxCount > 0 ? Math.round((step.count / maxCount) * 100) : 0;
          return (
            <div key={step.label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-600">{step.label}</span>
                <span className="font-medium text-slate-800">{step.count.toLocaleString()}{i > 0 && step.dropoff > 0 && <span className="text-red-500 ml-1">(-{step.dropoff}%)</span>}</span>
              </div>
              <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 1)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GeoTable({ items, label }: { items: GeoInsight[]; label: string }) {
  if (items.length === 0) return <p className="text-gray-500 text-sm">No data yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
            <th className="pb-2 pr-3">{label}</th>
            <th className="pb-2 pr-3 text-right">Views</th>
            <th className="pb-2 pr-3 text-right">CTA</th>
            <th className="pb-2 pr-3 text-right">Pricing</th>
            <th className="pb-2 text-right">Support</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.slice(0, 10).map((g) => (
            <tr key={g.key} className="text-slate-700">
              <td className="py-1.5 pr-3 font-medium truncate max-w-[160px]" title={g.key}>{g.key}</td>
              <td className="py-1.5 pr-3 text-right">{g.views}</td>
              <td className="py-1.5 pr-3 text-right">{g.ctaClicks}</td>
              <td className="py-1.5 pr-3 text-right">{g.pricingViews}</td>
              <td className="py-1.5 text-right">{g.supportViews}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrendChart({ trends, metricKey, color, label }: { trends: DailyTrend[]; metricKey: keyof DailyTrend; color: string; label: string }) {
  if (trends.length === 0) return <p className="text-gray-500 text-sm">No trend data yet.</p>;
  const values = trends.map((t) => t[metricKey] as number);
  const maxVal = Math.max(...values, 1);
  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <div className="flex items-end gap-[2px] h-20">
        {trends.map((t) => {
          const v = t[metricKey] as number;
          return (
            <div key={t.date} className="flex-1 group relative flex flex-col items-center">
              <div
                className={`w-full ${color} rounded-t min-h-[1px] transition-all`}
                style={{ height: `${Math.max((v / maxVal) * 100, 1)}%` }}
                title={`${t.date}: ${v}`}
              />
              <span className="hidden group-hover:block absolute -top-5 text-[9px] text-slate-600 bg-white border border-slate-200 px-1 rounded shadow whitespace-nowrap z-10">
                {t.date.slice(5)}: {v}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1 text-[9px] text-gray-400">
        <span>{trends[0]?.date.slice(5)}</span>
        <span>{trends[trends.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

function PagePerfTable({ pages }: { pages: PagePerformance[] }) {
  if (pages.length === 0) return <p className="text-gray-500 text-sm">No page data yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
            <th className="pb-2 pr-3">Page</th>
            <th className="pb-2 pr-3 text-right">Views</th>
            <th className="pb-2 pr-3 text-right">Visitors</th>
            <th className="pb-2 pr-3 text-right">CTA Clicks</th>
            <th className="pb-2 pr-3 text-right">Support</th>
            <th className="pb-2 text-right">CTA Rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {pages.map((p) => (
            <tr key={p.pagePath} className="text-slate-700">
              <td className="py-1.5 pr-3 font-mono text-xs">{p.pagePath}</td>
              <td className="py-1.5 pr-3 text-right">{p.views}</td>
              <td className="py-1.5 pr-3 text-right">{p.uniqueVisitors}</td>
              <td className="py-1.5 pr-3 text-right">{p.ctaClicks}</td>
              <td className="py-1.5 pr-3 text-right">{p.supportOpens + p.feedbackSubmits}</td>
              <td className="py-1.5 text-right">
                <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${p.ctaRate >= 10 ? 'bg-emerald-50 text-emerald-700' : p.ctaRate >= 3 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                  {p.ctaRate}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChangeBadge({ change }: { change: number }) {
  if (change === 0) return <span className="text-xs text-gray-400">—</span>;
  const isUp = change > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${isUp ? 'text-emerald-600' : 'text-red-600'}`}>
      {isUp ? '▲' : '▼'} {Math.abs(change)}%
    </span>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const colors = {
    info: 'border-blue-200 bg-blue-50 text-blue-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    critical: 'border-red-200 bg-red-50 text-red-800',
  };
  const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', critical: '🚨' };
  return (
    <div className={`border rounded-lg p-4 ${colors[insight.severity]}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{icons[insight.severity]} {insight.title}</p>
          <p className="text-xs mt-1 opacity-80">{insight.description}</p>
        </div>
        {insight.metric && (
          <span className="text-sm font-bold whitespace-nowrap">{insight.metric}</span>
        )}
      </div>
    </div>
  );
}

function CtaScoreTable({ scores }: { scores: CtaScore[] }) {
  if (scores.length === 0) return <p className="text-gray-500 text-sm">No CTA data yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
            <th className="pb-2 pr-3">CTA</th>
            <th className="pb-2 pr-3">Source Page</th>
            <th className="pb-2 pr-3 text-right">Clicks</th>
            <th className="pb-2 pr-3 text-right">Page Views</th>
            <th className="pb-2 text-right">CTR</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {scores.slice(0, 10).map((s, i) => (
            <tr key={`${s.ctaName}-${s.sourcePage}-${i}`} className="text-slate-700">
              <td className="py-1.5 pr-3 font-medium text-xs">{s.ctaName}</td>
              <td className="py-1.5 pr-3 font-mono text-xs">{s.sourcePage}</td>
              <td className="py-1.5 pr-3 text-right">{s.clicks}</td>
              <td className="py-1.5 pr-3 text-right">{s.sourcePageViews}</td>
              <td className="py-1.5 text-right">
                <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${s.ctr >= 10 ? 'bg-emerald-50 text-emerald-700' : s.ctr >= 3 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                  {s.ctr}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CityIntelTable({ cities }: { cities: CityIntelligence[] }) {
  if (cities.length === 0) return <p className="text-gray-500 text-sm">No city data yet.</p>;
  const tagColors: Record<string, string> = {
    'high-engagement': 'bg-blue-50 text-blue-700',
    'high-pricing-interest': 'bg-emerald-50 text-emerald-700',
    'high-support': 'bg-amber-50 text-amber-700',
    'low-conversion': 'bg-red-50 text-red-700',
    'balanced': 'bg-gray-100 text-gray-600',
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
            <th className="pb-2 pr-3">City</th>
            <th className="pb-2 pr-3 text-right">Events</th>
            <th className="pb-2 pr-3 text-right">Views</th>
            <th className="pb-2 pr-3 text-right">CTA</th>
            <th className="pb-2 pr-3 text-right">Pricing</th>
            <th className="pb-2 pr-3 text-right">Support</th>
            <th className="pb-2 text-right">Tag</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {cities.map((c) => (
            <tr key={c.city} className="text-slate-700">
              <td className="py-1.5 pr-3 font-medium">{c.city}</td>
              <td className="py-1.5 pr-3 text-right">{c.engagement}</td>
              <td className="py-1.5 pr-3 text-right">{c.views}</td>
              <td className="py-1.5 pr-3 text-right">{c.ctaClicks}</td>
              <td className="py-1.5 pr-3 text-right">{c.pricingInterest}</td>
              <td className="py-1.5 pr-3 text-right">{c.supportUsage}</td>
              <td className="py-1.5 text-right">
                <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${tagColors[c.tag] || tagColors.balanced}`}>
                  {c.tag}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [error, setError] = useState<string | null>(null);

  // Global filters
  const [filterCountry, setFilterCountry] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterPage, setFilterPage] = useState('');
  const [filterDevice, setFilterDevice] = useState('');
  const [filterEventType, setFilterEventType] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ days: String(days) });
    if (filterCountry) params.set('country', filterCountry);
    if (filterCity) params.set('city', filterCity);
    if (filterPage) params.set('page_path', filterPage);
    if (filterDevice) params.set('device_type', filterDevice);
    if (filterEventType) params.set('event_type', filterEventType);
    fetch(`/api/analytics?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load analytics');
        return res.json();
      })
      .then((data: AnalyticsStats) => setStats(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [days, filterCountry, filterCity, filterPage, filterDevice, filterEventType]);

  const hasFilters = !!(filterCountry || filterCity || filterPage || filterDevice || filterEventType);
  const clearFilters = () => { setFilterCountry(''); setFilterCity(''); setFilterPage(''); setFilterDevice(''); setFilterEventType(''); };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Analytics</h2>
          <p className="text-gray-600 mt-1">Real-time visitor, member, and conversion analytics — prioritising public &amp; member traffic.</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Global Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold text-slate-700">🔍 Filters</span>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-blue-600 hover:text-blue-800 underline">Clear all</button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <input type="text" placeholder="Country" value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500" />
          <input type="text" placeholder="City" value={filterCity} onChange={(e) => setFilterCity(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500" />
          <input type="text" placeholder="Page path" value={filterPage} onChange={(e) => setFilterPage(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500" />
          <select value={filterDevice} onChange={(e) => setFilterDevice(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500">
            <option value="">All devices</option>
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
            <option value="tablet">Tablet</option>
          </select>
          <select value={filterEventType} onChange={(e) => setFilterEventType(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500">
            <option value="">All events</option>
            <option value="page_view">Page View</option>
            <option value="pricing_cta_click">Pricing CTA Click</option>
            <option value="cta_click">CTA Click</option>
            <option value="download_click">Download Click</option>
            <option value="open_app_click">Open App Click</option>
            <option value="support_open">Support Open</option>
            <option value="feedback_submit">Feedback Submit</option>
            <option value="faq_open">FAQ Open</option>
            <option value="signin_view">Sign-in View</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-600">
          Loading analytics&hellip;
        </div>
      )}

      {error && (
        <div className="bg-red-50 rounded-lg border border-red-200 p-6 text-red-700">
          <p className="font-semibold">Failed to load analytics</p>
          <p className="text-sm mt-1">{error}</p>
          <p className="text-xs mt-2 text-red-500">
            Make sure the <code>analytics_events</code> table exists in your Supabase project.
            Run <code>scripts/create-analytics-table.sql</code> in the SQL Editor.
          </p>
        </div>
      )}

      {!loading && !error && stats && (
        <>
          {/* ── INSIGHTS ENGINE ── */}
          {stats.insights && stats.insights.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-slate-900">🧠 Key Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {stats.insights.map((insight, i) => (
                  <InsightCard key={i} insight={insight} />
                ))}
              </div>
            </div>
          )}

          {/* ── SECTION 1: KPI Summary with Comparison ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Page Views</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.summary.totalPageViews.toLocaleString()}</p>
              {stats.comparison && <ChangeBadge change={stats.comparison.pageViewsChange} />}
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Unique Visitors</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.summary.uniqueVisitors.toLocaleString()}</p>
              {stats.comparison && <ChangeBadge change={stats.comparison.uniqueVisitorsChange} />}
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Events</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.summary.totalEvents.toLocaleString()}</p>
              {stats.comparison && <ChangeBadge change={stats.comparison.totalEventsChange} />}
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide">CTA Clicks</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.comparison?.ctaClicks.toLocaleString() ?? '—'}</p>
              {stats.comparison && <ChangeBadge change={stats.comparison.ctaClicksChange} />}
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Support Actions</p>
              <p className="text-2xl font-bold text-violet-600 mt-1">{stats.comparison?.supportSubmits.toLocaleString() ?? '—'}</p>
              {stats.comparison && <ChangeBadge change={stats.comparison.supportSubmitsChange} />}
            </div>
          </div>

          {/* ── TRAFFIC BY GROUP ── */}
          {stats.pageGroupBreakdown && stats.pageGroupBreakdown.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">🏷️ Traffic by Group</h3>
              <p className="text-xs text-gray-500 mb-4">Page views, visitors, and events segmented by audience type. Public and member traffic are the priority metrics.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.pageGroupBreakdown.map((g) => {
                  const groupMeta: Record<string, { color: string; icon: string; label: string }> = {
                    public: { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: '🌐', label: 'Public Website' },
                    auth: { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: '🔐', label: 'Auth Flow' },
                    member: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '👤', label: 'Member App' },
                    admin: { color: 'bg-gray-100 text-gray-500 border-gray-200', icon: '⚙️', label: 'Admin (Internal)' },
                    unknown: { color: 'bg-gray-50 text-gray-400 border-gray-200', icon: '❓', label: 'Unknown' },
                  };
                  const meta = groupMeta[g.group] || groupMeta.unknown;
                  return (
                    <div key={g.group} className={`rounded-lg border p-4 ${meta.color}`}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-2">{meta.icon} {meta.label}</p>
                      <p className="text-2xl font-bold">{g.pageViews.toLocaleString()}</p>
                      <p className="text-xs mt-1">views</p>
                      <div className="mt-2 text-xs opacity-75">
                        <span>{g.uniqueVisitors} visitors</span> · <span>{g.totalEvents} events</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── MEMBER ANALYTICS ── */}
          {stats.memberAnalytics && stats.memberAnalytics.totalMemberEvents > 0 && (
            <div className="border-t-2 border-emerald-200 pt-8 mt-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Member App Analytics</h2>
              <p className="text-gray-500 text-sm mb-6">Real member behaviour after sign-in — dashboard usage, workflow adoption, and page-level engagement.</p>
            </div>
          )}

          {stats.memberAnalytics && stats.memberAnalytics.totalMemberEvents > 0 && (
            <>
              {/* Member KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg border border-emerald-200 p-5">
                  <p className="text-xs text-emerald-600 uppercase tracking-wide">Member Page Views</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.memberAnalytics.totalMemberPageViews.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg border border-emerald-200 p-5">
                  <p className="text-xs text-emerald-600 uppercase tracking-wide">Unique Members</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.memberAnalytics.uniqueMemberVisitors.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg border border-emerald-200 p-5">
                  <p className="text-xs text-emerald-600 uppercase tracking-wide">Dashboard Visitors</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.memberAnalytics.memberRetention.dashboardVisitors}</p>
                </div>
                <div className="bg-white rounded-lg border border-emerald-200 p-5">
                  <p className="text-xs text-emerald-600 uppercase tracking-wide">Workflow Adoption</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.memberAnalytics.memberRetention.retentionRate}%</p>
                  <p className="text-xs text-emerald-500 mt-0.5">{stats.memberAnalytics.memberRetention.deepWorkflowVisitors} used Leads/Jobs/Quotes/Invoices</p>
                </div>
              </div>

              {/* Member Top Pages */}
              {stats.memberAnalytics.topMemberPages.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">📄 Top Member Pages</h3>
                  <BarChart items={stats.memberAnalytics.topMemberPages} accentColor="bg-emerald-500" maxItems={12} />
                </div>
              )}

              {/* Member Page Performance */}
              {stats.memberAnalytics.memberPagePerformance.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">📊 Member Page Performance</h3>
                  <p className="text-xs text-gray-500 mb-4">Dedicated metrics for member app pages — views, visitors, CTA engagement, and support interactions.</p>
                  <PagePerfTable pages={stats.memberAnalytics.memberPagePerformance} />
                </div>
              )}

              {/* ── SECTION 17: Feature Usage ── */}
              {stats.featureAnalytics && stats.featureAnalytics.featureUsage.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">🧩 Feature Usage</h3>
                  <p className="text-xs text-gray-500 mb-4">Which product features members actually use — views, actions, unique users, and adoption rate.</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
                          <th className="pb-2 pr-3">Feature</th>
                          <th className="pb-2 pr-3 text-right">Views</th>
                          <th className="pb-2 pr-3 text-right">Actions</th>
                          <th className="pb-2 pr-3 text-right">Users</th>
                          <th className="pb-2 text-right">Adoption</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {stats.featureAnalytics.featureUsage.map((f) => (
                          <tr key={f.feature} className="text-slate-700">
                            <td className="py-1.5 pr-3 font-medium capitalize">{f.feature}</td>
                            <td className="py-1.5 pr-3 text-right">{f.views}</td>
                            <td className="py-1.5 pr-3 text-right">{f.actions}</td>
                            <td className="py-1.5 pr-3 text-right">{f.uniqueUsers}</td>
                            <td className="py-1.5 text-right">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${f.adoptionRate >= 50 ? 'bg-emerald-50 text-emerald-700' : f.adoptionRate >= 20 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                                {f.adoptionRate}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── SECTION 18: Workflow Completion ── */}
              {stats.featureAnalytics && stats.featureAnalytics.workflowCompletion.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">🔄 Workflow Completion</h3>
                  <p className="text-xs text-gray-500 mb-4">How many members progress through key product workflows — from first touch to completion.</p>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {stats.featureAnalytics.workflowCompletion.map((wf) => (
                      <div key={wf.name} className="border border-gray-100 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-slate-800">{wf.name}</h4>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${wf.overallRate >= 30 ? 'bg-emerald-50 text-emerald-700' : wf.overallRate >= 10 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                            {wf.overallRate}% completion
                          </span>
                        </div>
                        <div className="space-y-2">
                          {wf.stages.map((stage) => {
                            const first = wf.stages[0]?.users || 1;
                            const pct = Math.max(Math.round((stage.users / first) * 100), 1);
                            return (
                              <div key={stage.label}>
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-slate-600">{stage.label}</span>
                                  <span className="font-medium text-slate-800">{stage.users} <span className="text-gray-400">({stage.rate}%)</span></span>
                                </div>
                                <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                                  <div className="bg-teal-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SECTION 19: Revenue Signals ── */}
              {stats.featureAnalytics && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">💰 Revenue Signals</h3>
                  <p className="text-xs text-gray-500 mb-4">Actions that indicate revenue intent — invoice views, quote views, billing portal opens, and upgrade clicks.</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="bg-emerald-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-700">{stats.featureAnalytics.revenueSignals.invoicesViewed}</p>
                      <p className="text-xs text-emerald-600 mt-1">Invoices Viewed</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-700">{stats.featureAnalytics.revenueSignals.quotesViewed}</p>
                      <p className="text-xs text-emerald-600 mt-1">Quotes Viewed</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-amber-700">{stats.featureAnalytics.revenueSignals.upgradeClicks}</p>
                      <p className="text-xs text-amber-600 mt-1">Upgrade Clicks</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-amber-700">{stats.featureAnalytics.revenueSignals.billingPortalOpens}</p>
                      <p className="text-xs text-amber-600 mt-1">Billing Portal</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-blue-700">{stats.featureAnalytics.revenueSignals.subscriptionPageViews}</p>
                      <p className="text-xs text-blue-600 mt-1">Subscription Views</p>
                    </div>
                    <div className="bg-rose-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-rose-700">{stats.featureAnalytics.revenueSignals.revenueReadyVisitors}</p>
                      <p className="text-xs text-rose-600 mt-1">Revenue-Ready</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SECTION 20: Member Behaviour Segments ── */}
              {stats.featureAnalytics && stats.featureAnalytics.memberSegments.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">👥 Member Behaviour Segments</h3>
                  <p className="text-xs text-gray-500 mb-4">Auto-classified member segments based on feature usage patterns — builder, manager, buyer, stuck, or new.</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {stats.featureAnalytics.memberSegments.map((seg) => {
                      const colors: Record<string, string> = {
                        builder: 'border-emerald-200 bg-emerald-50 text-emerald-700',
                        manager: 'border-blue-200 bg-blue-50 text-blue-700',
                        buyer: 'border-amber-200 bg-amber-50 text-amber-700',
                        stuck: 'border-red-200 bg-red-50 text-red-700',
                        new: 'border-gray-200 bg-gray-50 text-gray-700',
                      };
                      return (
                        <div key={seg.segment} className={`border rounded-lg p-4 text-center ${colors[seg.segment] || colors.new}`}>
                          <p className="text-2xl font-bold">{seg.count}</p>
                          <p className="text-sm font-semibold mt-1 capitalize">{seg.segment}</p>
                          <p className="text-xs mt-1 opacity-70">{seg.percentage}% &middot; {seg.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── SECTION 2: Daily Page Views ── */}
          {stats.dailyPageViews.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">📈 Daily Page Views</h3>
              <div className="flex items-end gap-1 h-32">
                {(() => {
                  const maxVal = Math.max(...stats.dailyPageViews.map((d) => d.count), 1);
                  return stats.dailyPageViews.map((d) => (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div
                        className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600 min-h-[2px]"
                        style={{ height: `${Math.max((d.count / maxVal) * 100, 2)}%` }}
                        title={`${d.date}: ${d.count} views`}
                      />
                      <span className="hidden group-hover:block absolute -top-6 text-[10px] text-slate-600 bg-white border border-slate-200 px-1 rounded shadow whitespace-nowrap">
                        {d.date.slice(5)}: {d.count}
                      </span>
                    </div>
                  ));
                })()}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-gray-400">
                <span>{stats.dailyPageViews[0]?.date.slice(5)}</span>
                <span>{stats.dailyPageViews[stats.dailyPageViews.length - 1]?.date.slice(5)}</span>
              </div>
            </div>
          )}

          {/* ── SECTION 3: Geography ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">🌍 Top Countries</h3>
              <BarChart items={stats.topCountries} accentColor="bg-emerald-500" />
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">🏙️ Top Cities</h3>
              <BarChart items={stats.topCities} accentColor="bg-teal-500" />
            </div>
          </div>

          {/* ── SECTION 4: Traffic / Pages ── */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">📄 Top Pages</h3>
            <BarChart items={stats.topPages} accentColor="bg-blue-500" maxItems={15} />
          </div>

          {/* ── SECTION 5: Devices / Platforms ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-base font-bold text-slate-900 mb-3">📱 Devices</h3>
              <BarChart items={stats.deviceBreakdown} accentColor="bg-violet-500" />
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-base font-bold text-slate-900 mb-3">🌐 Browsers</h3>
              <BarChart items={stats.browserBreakdown} accentColor="bg-orange-500" />
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-base font-bold text-slate-900 mb-3">💻 Operating Systems</h3>
              <BarChart items={stats.osBreakdown} accentColor="bg-cyan-500" />
            </div>
          </div>

          {/* ── SECTION 6: Event Type Breakdown / CTA Clicks ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">🎯 Event Breakdown</h3>
              <BarChart items={stats.eventTypeBreakdown} accentColor="bg-amber-500" />
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">💡 CTA Insights</h3>
              {(!stats.ctaInsights || stats.ctaInsights.length === 0) ? (
                <p className="text-gray-500 text-sm">No CTA click data yet. Insights appear when users click pricing or upgrade buttons.</p>
              ) : (
                <div className="space-y-4">
                  {stats.ctaInsights.map((insight) => (
                    <div key={insight.planTier} className="border border-gray-100 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-slate-800 capitalize">{insight.planTier}</span>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{insight.count} clicks</span>
                      </div>
                      {insight.sources.length > 0 && (
                        <div className="space-y-1">
                          {insight.sources.map((s) => (
                            <div key={s.key} className="flex items-center justify-between text-xs text-slate-600">
                              <span>{s.key}</span>
                              <span className="font-medium">{s.count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── SECTION 7: Recent Activity ── */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">🕐 Recent Activity</h3>
            {stats.recentEvents.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent events.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
                      <th className="pb-2 pr-4">Event</th>
                      <th className="pb-2 pr-4">Page</th>
                      <th className="pb-2 pr-4">City</th>
                      <th className="pb-2 pr-4">Country</th>
                      <th className="pb-2 pr-4">Device</th>
                      <th className="pb-2 pr-4">Meta</th>
                      <th className="pb-2">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.recentEvents.slice(0, 25).map((e) => {
                      const meta = e.metadata as Record<string, unknown> | null;
                      const metaLabel = meta
                        ? Object.entries(meta).filter(([, v]) => v != null).map(([k, v]) => `${k}: ${v}`).join(', ')
                        : '';
                      const ts = e.occurredAt || e.createdAt;
                      return (
                        <tr key={e.id} className="text-slate-700">
                          <td className="py-2 pr-4">
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                              {e.eventType}
                            </span>
                          </td>
                          <td className="py-2 pr-4 font-mono text-xs truncate max-w-[200px]" title={e.pagePath}>{e.pagePath}</td>
                          <td className="py-2 pr-4">{e.city || '—'}</td>
                          <td className="py-2 pr-4">{e.countryCode ? `${e.country || ''} (${e.countryCode})` : (e.country || '—')}</td>
                          <td className="py-2 pr-4 capitalize">{e.deviceType || '—'}</td>
                          <td className="py-2 pr-4 text-xs text-gray-500 truncate max-w-[160px]" title={metaLabel}>{metaLabel || '—'}</td>
                          <td className="py-2 text-xs text-gray-500 whitespace-nowrap">
                            {ts ? new Date(ts).toLocaleString('en-GB', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                            }) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Data Freshness ── */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500">
              📊 Showing data from the last {days} days &middot; {stats.summary.totalEvents.toLocaleString()} events tracked &middot;
              {stats.summary.uniqueVisitors.toLocaleString()} unique visitors &middot;
              Geo data from Vercel/Cloudflare headers (best-effort city-level accuracy)
            </p>
          </div>

          {/* ════════════════════════════════════════════════════
              ANALYTICS EVOLUTION LAYER
              ════════════════════════════════════════════════════ */}

          <div className="border-t-2 border-indigo-200 pt-8 mt-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Advanced Analytics</h2>
            <p className="text-gray-500 text-sm mb-6">User journeys, CTA performance, page insights, conversion intent, and more — all from real event data.</p>
          </div>

          {/* ── SECTION 8: Funnel Analytics with Drop Detection ── */}
          {stats.funnels && stats.funnels.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">🔄 Funnel Analytics</h3>
              <p className="text-xs text-gray-500 mb-4">Visitor journey analysis based on real page views and events. Includes public acquisition and member journey funnels.</p>

              {/* Public / Acquisition Funnels */}
              <h4 className="text-sm font-semibold text-blue-700 mb-3">🌐 Public Acquisition Funnels</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                {stats.funnels.filter((f) => !f.name.startsWith('Sign-in →') && !f.name.startsWith('Dashboard') && !f.name.startsWith('Settings')).map((f) => {
                  let worstDropoff = 0;
                  let worstIdx = -1;
                  f.steps.forEach((step, i) => {
                    if (i > 0 && step.dropoff > worstDropoff) {
                      worstDropoff = step.dropoff;
                      worstIdx = i;
                    }
                  });
                  return (
                    <div key={f.name}>
                      <FunnelViz funnel={f} />
                      {worstDropoff >= 50 && worstIdx > 0 && f.steps[0]?.count >= 3 && (
                        <div className={`mt-2 px-3 py-2 rounded text-xs font-medium ${worstDropoff >= 70 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                          {worstDropoff >= 70 ? '🚨' : '⚠️'} Major drop: {f.steps[worstIdx - 1]?.label} → {f.steps[worstIdx]?.label} (-{worstDropoff}%)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Member Journey Funnels */}
              <h4 className="text-sm font-semibold text-emerald-700 mb-3">👤 Member Journey Funnels</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {stats.funnels.filter((f) => f.name.startsWith('Sign-in →') || f.name.startsWith('Dashboard') || f.name.startsWith('Settings')).map((f) => {
                  let worstDropoff = 0;
                  let worstIdx = -1;
                  f.steps.forEach((step, i) => {
                    if (i > 0 && step.dropoff > worstDropoff) {
                      worstDropoff = step.dropoff;
                      worstIdx = i;
                    }
                  });
                  return (
                    <div key={f.name}>
                      <FunnelViz funnel={f} />
                      {worstDropoff >= 50 && worstIdx > 0 && f.steps[0]?.count >= 3 && (
                        <div className={`mt-2 px-3 py-2 rounded text-xs font-medium ${worstDropoff >= 70 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                          {worstDropoff >= 70 ? '🚨' : '⚠️'} Major drop: {f.steps[worstIdx - 1]?.label} → {f.steps[worstIdx]?.label} (-{worstDropoff}%)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── SECTION 9: Extended CTA Analytics ── */}
          {stats.ctaAnalytics && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">🎯 CTA Performance</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-indigo-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-indigo-700">{stats.ctaAnalytics.totalCtaClicks}</p>
                  <p className="text-xs text-indigo-600 mt-1">Total CTA Clicks</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{stats.ctaAnalytics.topCtaPages[0]?.key || '—'}</p>
                  <p className="text-xs text-emerald-600 mt-1">Top CTA Page</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-amber-700">{stats.ctaAnalytics.topCtaSections[0]?.key || '—'}</p>
                  <p className="text-xs text-amber-600 mt-1">Top CTA Section</p>
                </div>
                <div className="bg-violet-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-violet-700">{stats.ctaAnalytics.ctaByLocale[0]?.key || '—'}</p>
                  <p className="text-xs text-violet-600 mt-1">Top CTA Locale</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Top CTAs</h4>
                  <BarChart items={stats.ctaAnalytics.topCtaNames} accentColor="bg-indigo-500" maxItems={8} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">CTA Source Pages</h4>
                  <BarChart items={stats.ctaAnalytics.topCtaPages} accentColor="bg-emerald-500" maxItems={8} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">CTA Source Sections</h4>
                  <BarChart items={stats.ctaAnalytics.topCtaSections} accentColor="bg-amber-500" maxItems={8} />
                </div>
              </div>
              {(stats.ctaAnalytics.ctaByCountry.length > 0 || stats.ctaAnalytics.ctaByCity.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">CTA Clicks by Country</h4>
                    <BarChart items={stats.ctaAnalytics.ctaByCountry} accentColor="bg-teal-500" maxItems={8} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">CTA Clicks by City</h4>
                    <BarChart items={stats.ctaAnalytics.ctaByCity} accentColor="bg-cyan-500" maxItems={8} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SECTION 10: Page Performance ── */}
          {stats.pagePerformance && stats.pagePerformance.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">📊 Page Performance</h3>
              <p className="text-xs text-gray-500 mb-4">Key page metrics — views, visitors, CTA engagement, and support interactions for the most important pages.</p>
              <PagePerfTable pages={stats.pagePerformance} />
            </div>
          )}

          {/* ── SECTION 11: Geography Insights ── */}
          {stats.geoInsights && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">🌍 Country Insights</h3>
                <GeoTable items={stats.geoInsights.countries} label="Country" />
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">🏙️ City Insights</h3>
                <GeoTable items={stats.geoInsights.cities} label="City" />
              </div>
            </div>
          )}

          {/* ── SECTION 12: Support / Feedback Insights ── */}
          {stats.supportInsights && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">💬 Support &amp; Feedback Insights</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">{stats.supportInsights.totalSupportViews}</p>
                  <p className="text-xs text-blue-600 mt-1">Support Page Views</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-indigo-700">{stats.supportInsights.totalFeedbackSubmits}</p>
                  <p className="text-xs text-indigo-600 mt-1">Feedback Submitted</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{stats.supportInsights.supportViewToFeedbackRate}%</p>
                  <p className="text-xs text-emerald-600 mt-1">View → Submit Rate</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-700">{stats.supportInsights.blockedCount}</p>
                  <p className="text-xs text-red-600 mt-1">Blocked Users</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{stats.supportInsights.notBlockedCount}</p>
                  <p className="text-xs text-green-600 mt-1">Not Blocked</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">By Type</h4>
                  <BarChart items={stats.supportInsights.feedbackByType} accentColor="bg-blue-500" maxItems={6} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">By Section</h4>
                  <BarChart items={stats.supportInsights.feedbackBySection} accentColor="bg-indigo-500" maxItems={6} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">By Locale</h4>
                  <BarChart items={stats.supportInsights.feedbackByLocale} accentColor="bg-violet-500" maxItems={6} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">By Country</h4>
                  <BarChart items={stats.supportInsights.feedbackByCountry} accentColor="bg-teal-500" maxItems={6} />
                </div>
              </div>
            </div>
          )}

          {/* ── SECTION 13: Time Trends ── */}
          {stats.dailyTrends && stats.dailyTrends.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">📈 Time Trends</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TrendChart trends={stats.dailyTrends} metricKey="pageViews" color="bg-blue-500" label="Daily Page Views" />
                <TrendChart trends={stats.dailyTrends} metricKey="uniqueVisitors" color="bg-emerald-500" label="Daily Unique Visitors" />
                <TrendChart trends={stats.dailyTrends} metricKey="ctaClicks" color="bg-amber-500" label="Daily CTA Clicks" />
                <TrendChart trends={stats.dailyTrends} metricKey="supportSubmits" color="bg-violet-500" label="Daily Support / Help Submissions" />
              </div>
            </div>
          )}

          {/* ── SECTION 14: Conversion Intent ── */}
          {stats.conversionIntent && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">🔥 Conversion Intent</h3>
              <p className="text-xs text-gray-500 mb-4">Visitors with 2+ high-intent signals: pricing views, sign-in attempts, plan CTA clicks, app opens, or support-after-pricing patterns.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-orange-700">{stats.conversionIntent.highIntentVisitors}</p>
                  <p className="text-xs text-orange-600 mt-1">High-Intent Visitors</p>
                </div>
                <div className="bg-rose-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-rose-700">{stats.conversionIntent.highIntentEvents}</p>
                  <p className="text-xs text-rose-600 mt-1">High-Intent Events</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-amber-700">{stats.conversionIntent.highIntentVisitors > 0 && stats.summary.uniqueVisitors > 0 ? Math.round((stats.conversionIntent.highIntentVisitors / stats.summary.uniqueVisitors) * 100) : 0}%</p>
                  <p className="text-xs text-amber-600 mt-1">of All Visitors</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">High-Intent Pages</h4>
                  <BarChart items={stats.conversionIntent.highIntentPages} accentColor="bg-orange-500" maxItems={8} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">High-Intent Cities</h4>
                  <BarChart items={stats.conversionIntent.highIntentCities} accentColor="bg-rose-500" maxItems={8} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">High-Intent Countries</h4>
                  <BarChart items={stats.conversionIntent.highIntentCountries} accentColor="bg-amber-500" maxItems={8} />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Intent Signals</h4>
                <BarChart items={stats.conversionIntent.signals} accentColor="bg-red-500" maxItems={10} />
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════
              DECISION-MAKING LAYER
              ════════════════════════════════════════════════════ */}

          <div className="border-t-2 border-rose-200 pt-8 mt-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Decision Intelligence</h2>
            <p className="text-gray-500 text-sm mb-6">CTA performance scoring, city-level intelligence, and actionable rankings.</p>
          </div>

          {/* ── SECTION 15: CTA Performance Scoring ── */}
          {stats.ctaScores && stats.ctaScores.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">📊 CTA Performance Scoring</h3>
              <p className="text-xs text-gray-500 mb-4">Click-through rate (CTR) calculated as CTA clicks / source page views. Identifies top and underperforming CTAs.</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-semibold text-emerald-700 mb-2">✅ Top Performing CTAs</h4>
                  {stats.ctaScores.filter((s) => s.ctr >= 5).length > 0 ? (
                    <CtaScoreTable scores={stats.ctaScores.filter((s) => s.ctr >= 5)} />
                  ) : (
                    <p className="text-gray-500 text-sm">No CTAs with 5%+ CTR yet.</p>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-red-700 mb-2">⚠️ Underperforming CTAs</h4>
                  {stats.ctaScores.filter((s) => s.ctr < 5 && s.sourcePageViews >= 5).length > 0 ? (
                    <CtaScoreTable scores={stats.ctaScores.filter((s) => s.ctr < 5 && s.sourcePageViews >= 5).sort((a, b) => a.ctr - b.ctr)} />
                  ) : (
                    <p className="text-gray-500 text-sm">No underperforming CTAs detected.</p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">All CTAs (ranked by CTR)</h4>
                <CtaScoreTable scores={stats.ctaScores} />
              </div>
            </div>
          )}

          {/* ── SECTION 16: City Intelligence ── */}
          {stats.cityIntelligence && stats.cityIntelligence.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">🏙️ City Intelligence</h3>
              <p className="text-xs text-gray-500 mb-4">City-level engagement analysis with auto-tagging: high engagement, pricing interest, support usage, and conversion signals.</p>
              <CityIntelTable cities={stats.cityIntelligence} />
            </div>
          )}

          {/* ════════════════════════════════════════════════════
              UPGRADE INTELLIGENCE LAYER
              ════════════════════════════════════════════════════ */}

          {stats.upgradeIntelligence && stats.upgradeIntelligence.totalScored > 0 && (
            <div className="border-t-2 border-violet-200 pt-8 mt-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Upgrade Intelligence</h2>
              <p className="text-gray-500 text-sm mb-6">Rule-based upgrade probability scoring — identifies visitors and members most likely to upgrade based on real behaviour signals.</p>
            </div>
          )}

          {/* ── SECTION 21: Upgrade Score Overview ── */}
          {stats.upgradeIntelligence && stats.upgradeIntelligence.totalScored > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-violet-50 rounded-lg border border-violet-200 p-5 text-center">
                <p className="text-xs text-violet-600 uppercase tracking-wide">Avg Score</p>
                <p className="text-2xl font-bold text-violet-700 mt-1">{stats.upgradeIntelligence.averageScore}</p>
                <p className="text-xs text-violet-500 mt-0.5">out of 100</p>
              </div>
              <div className="bg-violet-50 rounded-lg border border-violet-200 p-5 text-center">
                <p className="text-xs text-violet-600 uppercase tracking-wide">Total Scored</p>
                <p className="text-2xl font-bold text-violet-700 mt-1">{stats.upgradeIntelligence.totalScored}</p>
              </div>
              <div className="bg-amber-50 rounded-lg border border-amber-200 p-5 text-center">
                <p className="text-xs text-amber-600 uppercase tracking-wide">High Intent</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{stats.upgradeIntelligence.highIntentCount}</p>
              </div>
              <div className="bg-rose-50 rounded-lg border border-rose-200 p-5 text-center">
                <p className="text-xs text-rose-600 uppercase tracking-wide">Very High</p>
                <p className="text-2xl font-bold text-rose-700 mt-1">{stats.upgradeIntelligence.veryHighIntentCount}</p>
              </div>
              <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-5 text-center">
                <p className="text-xs text-emerald-600 uppercase tracking-wide">Upgrade-Ready Members</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.upgradeIntelligence.upgradeReadyMembers}</p>
              </div>
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-5 text-center">
                <p className="text-xs text-blue-600 uppercase tracking-wide">Conversion Rate</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">
                  {stats.upgradeIntelligence.totalScored > 0 ? Math.round(((stats.upgradeIntelligence.distribution.high + stats.upgradeIntelligence.distribution.very_high) / stats.upgradeIntelligence.totalScored) * 100) : 0}%
                </p>
                <p className="text-xs text-blue-500 mt-0.5">high + very high</p>
              </div>
            </div>
          )}

          {/* ── SECTION 22: Score Distribution ── */}
          {stats.upgradeIntelligence && stats.upgradeIntelligence.totalScored > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">📊 Score Distribution</h3>
              <p className="text-xs text-gray-500 mb-4">Breakdown of all scored visitors by upgrade probability band.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {([
                  { band: 'low', label: 'Low (0–24)', color: 'border-gray-200 bg-gray-50 text-gray-700', count: stats.upgradeIntelligence.distribution.low },
                  { band: 'medium', label: 'Medium (25–49)', color: 'border-amber-200 bg-amber-50 text-amber-700', count: stats.upgradeIntelligence.distribution.medium },
                  { band: 'high', label: 'High (50–74)', color: 'border-orange-200 bg-orange-50 text-orange-700', count: stats.upgradeIntelligence.distribution.high },
                  { band: 'very_high', label: 'Very High (75–100)', color: 'border-rose-200 bg-rose-50 text-rose-700', count: stats.upgradeIntelligence.distribution.very_high },
                ] as const).map((b) => {
                  const pct = stats.upgradeIntelligence.totalScored > 0 ? Math.round((b.count / stats.upgradeIntelligence.totalScored) * 100) : 0;
                  return (
                    <div key={b.band} className={`border rounded-lg p-4 text-center ${b.color}`}>
                      <p className="text-2xl font-bold">{b.count}</p>
                      <p className="text-sm font-semibold mt-1">{b.label}</p>
                      <p className="text-xs mt-1 opacity-70">{pct}% of total</p>
                      <div className="mt-2 bg-white/50 rounded-full h-2 overflow-hidden">
                        <div className="bg-current h-full rounded-full opacity-40" style={{ width: `${Math.max(pct, 2)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── SECTION 23: Top Upgrade-Ready Visitors ── */}
          {stats.upgradeIntelligence && stats.upgradeIntelligence.topUpgradeReady.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">🎯 Top Upgrade-Ready Visitors</h3>
              <p className="text-xs text-gray-500 mb-4">Visitors with highest upgrade probability — sorted by score. Each result includes explainable reasons.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
                      <th className="pb-2 pr-3">Visitor</th>
                      <th className="pb-2 pr-3 text-right">Score</th>
                      <th className="pb-2 pr-3">Band</th>
                      <th className="pb-2 pr-3">Type</th>
                      <th className="pb-2 pr-3">Confidence</th>
                      <th className="pb-2">Top Signals</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.upgradeIntelligence.topUpgradeReady.slice(0, 15).map((v, idx) => {
                      const bandColors: Record<string, string> = {
                        very_high: 'bg-rose-100 text-rose-800',
                        high: 'bg-orange-100 text-orange-800',
                        medium: 'bg-amber-100 text-amber-800',
                        low: 'bg-gray-100 text-gray-700',
                      };
                      const confColors: Record<string, string> = {
                        high: 'text-emerald-600',
                        medium: 'text-amber-600',
                        low: 'text-gray-500',
                      };
                      return (
                        <tr key={v.visitorId + idx} className="text-slate-700">
                          <td className="py-2 pr-3 font-mono text-xs">{v.visitorId.substring(0, 12)}…</td>
                          <td className="py-2 pr-3 text-right font-bold">{v.score}</td>
                          <td className="py-2 pr-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${bandColors[v.band]}`}>
                              {v.band.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-xs">{v.isMember ? '👤 Member' : '🌐 Visitor'}</td>
                          <td className={`py-2 pr-3 text-xs font-medium ${confColors[v.confidence]}`}>{v.confidence}</td>
                          <td className="py-2 text-xs max-w-xs">
                            {v.positiveSignals.slice(0, 3).map((s, i) => (
                              <span key={i} className="inline-block bg-emerald-50 text-emerald-700 rounded px-1.5 py-0.5 mr-1 mb-0.5 text-[10px]">{s}</span>
                            ))}
                            {v.negativeSignals.slice(0, 1).map((s, i) => (
                              <span key={i} className="inline-block bg-red-50 text-red-600 rounded px-1.5 py-0.5 mr-1 mb-0.5 text-[10px]">⚠ {s}</span>
                            ))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── SECTION 24: Top Signals + Blockers ── */}
          {stats.upgradeIntelligence && (stats.upgradeIntelligence.topPositiveSignals.length > 0 || stats.upgradeIntelligence.topNegativeSignals.length > 0) && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">⚡ Signals &amp; Friction</h3>
              <p className="text-xs text-gray-500 mb-4">Most common positive upgrade signals and negative friction factors across all scored visitors.</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-emerald-700 mb-2">✅ Top Positive Signals</h4>
                  <BarChart items={stats.upgradeIntelligence.topPositiveSignals} accentColor="bg-emerald-500" maxItems={10} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-red-700 mb-2">⚠️ Top Friction / Blockers</h4>
                  {stats.upgradeIntelligence.topNegativeSignals.length > 0 ? (
                    <BarChart items={stats.upgradeIntelligence.topNegativeSignals} accentColor="bg-red-500" maxItems={10} />
                  ) : (
                    <p className="text-gray-500 text-sm">No negative signals detected.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── SECTION 25: Pre-Upgrade Paths ── */}
          {stats.upgradeIntelligence && stats.upgradeIntelligence.precursorPaths.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">🛤️ Pre-Upgrade Paths</h3>
              <p className="text-xs text-gray-500 mb-4">Most common navigation sequences among high-intent visitors — these paths precede upgrade behaviour.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
                      <th className="pb-2 pr-3">Path</th>
                      <th className="pb-2 pr-3 text-right">Visitors</th>
                      <th className="pb-2 text-right">Avg Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.upgradeIntelligence.precursorPaths.map((p) => (
                      <tr key={p.path} className="text-slate-700">
                        <td className="py-1.5 pr-3 font-mono text-xs">{p.path}</td>
                        <td className="py-1.5 pr-3 text-right font-medium">{p.count}</td>
                        <td className="py-1.5 text-right">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${p.avgScore >= 75 ? 'bg-rose-50 text-rose-700' : p.avgScore >= 50 ? 'bg-orange-50 text-orange-700' : 'bg-amber-50 text-amber-700'}`}>
                            {p.avgScore}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Data Freshness ── */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500">
              📊 Showing data from the last {days} days &middot; {stats.summary.totalEvents.toLocaleString()} events tracked &middot;{' '}
              {stats.summary.uniqueVisitors.toLocaleString()} unique visitors &middot;
              Geo data from Vercel/Cloudflare headers (best-effort city-level accuracy)
            </p>
          </div>
        </>
      )}

      {!loading && !error && stats && stats.summary.totalEvents === 0 && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 text-center">
          <p className="text-blue-800 font-semibold mb-2">No analytics events recorded yet</p>
          <p className="text-blue-600 text-sm">
            Events are captured automatically as users visit pages. The tracker is active and will begin
            recording data on the next page view.
          </p>
        </div>
      )}
    </div>
  );
}
