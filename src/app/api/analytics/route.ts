import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { AnalyticsEvent, AnalyticsStats, AnalyticsSummary, CountEntry, CtaInsight, CtaAnalytics, AnalyticsMetadata, FunnelData, FunnelStep, PagePerformance, GeoInsight, SupportInsights, DailyTrend, ConversionIntent, ComparisonData, Insight, CtaScore, CityIntelligence, PageGroupBreakdown, MemberAnalytics, FeatureUsage, WorkflowCompletion, MemberSegmentData, MemberSegment, RevenueSignals, FeatureAnalytics, UpgradeScore, UpgradeBand, UpgradeConfidence, UpgradeScoreDistribution, UpgradePrecursorPath, UpgradeIntelligence } from '@/utils/analytics';
import { getPageGroup } from '@/utils/analytics';
import type { PageGroup } from '@/utils/analytics';

/* ─── Helpers ─── */

/** One-way hash of an IP address — never store raw IPs */
function hashIp(ip: string): string {
  const salt = process.env.ANALYTICS_SALT || 'tissca_analytics_v1';
  return createHash('sha256').update(ip + salt).digest('hex').substring(0, 16);
}

/** Extract the client IP from request headers (best-effort) */
function extractIp(req: NextRequest): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || null;
}

/* ─── POST: Record an analytics event ─── */

export async function POST(request: NextRequest) {
  try {
    const body: AnalyticsEvent = await request.json();

    if (!body.eventType || !body.pagePath) {
      return NextResponse.json({ error: 'eventType and pagePath required' }, { status: 400 });
    }

    // Geo enrichment from Vercel / Cloudflare / standard geo headers
    const country =
      request.headers.get('x-vercel-ip-country') ||
      request.headers.get('cf-ipcountry') ||
      request.headers.get('x-country') ||
      body.country ||
      null;
    const countryCode = country || body.countryCode || null; // Vercel gives 2-letter codes
    const region =
      request.headers.get('x-vercel-ip-country-region') ||
      request.headers.get('x-region') ||
      body.region ||
      null;
    const city =
      request.headers.get('x-vercel-ip-city') ||
      request.headers.get('cf-ipcity') ||
      request.headers.get('x-city') ||
      body.city ||
      null;

    // IP hash — never store raw IP
    const rawIp = extractIp(request);
    const ipHash = rawIp ? hashIp(rawIp) : null;

    // Merge client-sent metadata with any server-side enrichment
    const metadata: AnalyticsMetadata | null = body.metadata || null;

    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from('analytics_events').insert({
      event_type: body.eventType,
      page_path: body.pagePath,
      referrer: body.referrer || null,
      country: country ? decodeURIComponent(country) : null,
      country_code: countryCode ? decodeURIComponent(countryCode).toUpperCase() : null,
      region: region ? decodeURIComponent(region) : null,
      city: city ? decodeURIComponent(city) : null,
      device_type: body.deviceType || 'desktop',
      browser: body.browser || null,
      os: body.os || null,
      visitor_id: body.visitorId || null,
      session_id: body.sessionId || null,
      event_label: body.eventLabel || null,
      event_value: body.eventValue || null,
      metadata: metadata,
      ip_hash: ipHash,
      occurred_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[Analytics POST] Supabase error:', error.message);
      return NextResponse.json({ error: 'Failed to store event' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Analytics POST] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/* ─── GET: Return analytics stats for admin ─── */

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // ── Filters ──
    const filterCountry = searchParams.get('country') || '';
    const filterCity = searchParams.get('city') || '';
    const filterPage = searchParams.get('page_path') || '';
    const filterDevice = searchParams.get('device_type') || '';
    const filterEventType = searchParams.get('event_type') || '';
    const activeFilters: Record<string, string> = {};
    if (filterCountry) activeFilters.country = filterCountry;
    if (filterCity) activeFilters.city = filterCity;
    if (filterPage) activeFilters.page_path = filterPage;
    if (filterDevice) activeFilters.device_type = filterDevice;
    if (filterEventType) activeFilters.event_type = filterEventType;

    // Query using occurred_at when available, fall back to created_at for old rows
    const { data: events, error } = await supabase
      .from('analytics_events')
      .select('*')
      .or(`occurred_at.gte.${since},and(occurred_at.is.null,created_at.gte.${since})`)
      .order('occurred_at', { ascending: false, nullsFirst: false })
      .limit(10000);

    if (error) {
      console.error('[Analytics GET] Supabase error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }

    const rows = events || [];

    // Map DB rows to typed events (backward-compat: old rows may lack new columns)
    const allMapped: AnalyticsEvent[] = rows.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      eventType: r.event_type as AnalyticsEvent['eventType'],
      pagePath: r.page_path as string,
      referrer: r.referrer as string | undefined,
      country: r.country as string | undefined,
      countryCode: (r.country_code as string | undefined) || undefined,
      region: r.region as string | undefined,
      city: r.city as string | undefined,
      deviceType: r.device_type as AnalyticsEvent['deviceType'],
      browser: r.browser as string | undefined,
      os: r.os as string | undefined,
      visitorId: r.visitor_id as string | undefined,
      sessionId: r.session_id as string | undefined,
      eventLabel: r.event_label as string | undefined,
      eventValue: r.event_value as string | undefined,
      metadata: (r.metadata as AnalyticsMetadata | null) || null,
      ipHash: r.ip_hash as string | undefined,
      occurredAt: r.occurred_at as string | undefined,
      createdAt: r.created_at as string,
    }));

    // Apply filters
    const mapped = allMapped.filter((e) => {
      if (filterCountry && e.country !== filterCountry && e.countryCode !== filterCountry) return false;
      if (filterCity && e.city !== filterCity) return false;
      if (filterPage && e.pagePath !== filterPage) return false;
      if (filterDevice && e.deviceType !== filterDevice) return false;
      if (filterEventType && e.eventType !== filterEventType) return false;
      return true;
    });

    // ── Previous period data for comparison ──
    const prevSince = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000).toISOString();
    const { data: prevEvents } = await supabase
      .from('analytics_events')
      .select('event_type, page_path, visitor_id, occurred_at, created_at, country, country_code, city, device_type, metadata')
      .or(`occurred_at.gte.${prevSince},and(occurred_at.is.null,created_at.gte.${prevSince})`)
      .or(`occurred_at.lt.${since},and(occurred_at.is.null,created_at.lt.${since})`)
      .limit(10000);

    const prevMapped: AnalyticsEvent[] = (prevEvents || [])
      .filter((r: Record<string, unknown>) => {
        const ts = (r.occurred_at as string) || (r.created_at as string) || '';
        return ts >= prevSince && ts < since;
      })
      .map((r: Record<string, unknown>) => ({
        id: '',
        eventType: r.event_type as AnalyticsEvent['eventType'],
        pagePath: r.page_path as string,
        visitorId: r.visitor_id as string | undefined,
        country: r.country as string | undefined,
        countryCode: r.country_code as string | undefined,
        city: r.city as string | undefined,
        deviceType: r.device_type as AnalyticsEvent['deviceType'],
        metadata: (r.metadata as AnalyticsMetadata | null) || null,
        occurredAt: r.occurred_at as string | undefined,
        createdAt: r.created_at as string,
      }))
      .filter((e: AnalyticsEvent) => {
        if (filterCountry && e.country !== filterCountry && e.countryCode !== filterCountry) return false;
        if (filterCity && e.city !== filterCity) return false;
        if (filterPage && e.pagePath !== filterPage) return false;
        if (filterDevice && e.deviceType !== filterDevice) return false;
        if (filterEventType && e.eventType !== filterEventType) return false;
        return true;
      });

    const comparison = computeComparison(mapped, prevMapped);

    // ── Base aggregations ──
    const pageViews = mapped.filter((e) => e.eventType === 'page_view');
    const uniqueVisitors = new Set(mapped.filter((e) => e.visitorId).map((e) => e.visitorId)).size;

    const topPages = countBy(pageViews.filter((e) => getPageGroup(e.pagePath) !== 'admin'), (e) => e.pagePath);
    const topCountries = countBy(
      mapped.filter((e) => e.country),
      (e) => {
        const name = e.country!;
        const code = e.countryCode;
        return code && code !== name ? `${name} (${code})` : name;
      }
    );
    const topCities = countBy(mapped.filter((e) => e.city), (e) => e.city!);
    const deviceBreakdown = countBy(mapped, (e) => e.deviceType || 'unknown');
    const browserBreakdown = countBy(mapped, (e) => e.browser || 'unknown');
    const osBreakdown = countBy(mapped, (e) => e.os || 'unknown');
    const eventTypeBreakdown = countBy(mapped, (e) => e.eventType);

    // Daily page views (legacy format kept for backward compat)
    const dailyMap: Record<string, number> = {};
    pageViews.forEach((e) => {
      const ts = e.occurredAt || e.createdAt || '';
      const day = ts.substring(0, 10);
      if (day) dailyMap[day] = (dailyMap[day] || 0) + 1;
    });
    const dailyPageViews = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // ── CTA Insights (legacy format) ──
    const ctaEvents = mapped.filter(
      (e) => (e.eventType === 'pricing_cta_click' || e.eventType === 'cta_click') && e.metadata
    );
    const allCtaEvents = mapped.filter(
      (e) => e.eventType === 'pricing_cta_click' || e.eventType === 'cta_click' || e.eventType === 'download_click' || e.eventType === 'open_app_click'
    );
    const ctaByTier: Record<string, { count: number; sources: Record<string, number> }> = {};
    ctaEvents.forEach((e) => {
      const tier = (e.metadata as AnalyticsMetadata)?.planTier || 'unknown';
      if (!ctaByTier[tier]) ctaByTier[tier] = { count: 0, sources: {} };
      ctaByTier[tier].count++;
      const src = (e.metadata as AnalyticsMetadata)?.ctaSource || 'unknown';
      ctaByTier[tier].sources[src] = (ctaByTier[tier].sources[src] || 0) + 1;
    });
    const ctaInsights: CtaInsight[] = Object.entries(ctaByTier)
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([planTier, data]) => ({
        planTier,
        count: data.count,
        sources: Object.entries(data.sources)
          .sort(([, a], [, b]) => b - a)
          .map(([key, count]) => ({ key, count })),
      }));

    // ════════════════════════════════════════
    //  EVOLUTION LAYER
    // ════════════════════════════════════════

    // ── B: Funnel Analytics ──
    const stats_funnels = computeFunnels(mapped);

    // ── C: Extended CTA Analytics ──
    const ctaAnalytics = computeCtaAnalytics(allCtaEvents, ctaInsights);

    // ── D: Page Performance ──
    const pagePerformance = computePagePerformance(mapped);

    // ── E: Geo Insights ──
    const geoInsights = computeGeoInsights(mapped);

    // ── F: Support / Feedback Insights ──
    const supportInsights = computeSupportInsights(mapped);

    // ── G: Daily Trends ──
    const dailyTrends = computeDailyTrends(mapped);

    // ── H: Conversion Intent ──
    const conversionIntent = computeConversionIntent(mapped);

    // ── I: CTA Performance Scores ──
    const ctaScores = computeCtaScores(mapped);

    // ── J: City Intelligence ──
    const cityIntelligence = computeCityIntelligence(mapped);

    // ── K: Insights Engine ──
    const insights = computeInsights(mapped, comparison, stats_funnels, ctaScores, supportInsights);

    // ── L: Page Group Breakdown ──
    const pageGroupBreakdown = computePageGroupBreakdown(mapped);

    // ── M: Member Analytics ──
    const memberAnalytics = computeMemberAnalytics(mapped);

    // ── N: Feature Analytics ──
    const featureAnalytics = computeFeatureAnalytics(mapped);

    // ── P: Upgrade Intelligence ──
    const upgradeIntelligence = computeUpgradeIntelligence(mapped);

    const summary: AnalyticsSummary = {
      totalEvents: mapped.length,
      totalPageViews: pageViews.length,
      uniqueVisitors,
      topPage: topPages[0]?.key || null,
      topCountry: topCountries[0]?.key || null,
      topCity: topCities[0]?.key || null,
      avgEventsPerDay: days > 0 ? Math.round(mapped.length / Math.min(days, dailyPageViews.length || 1)) : 0,
    };

    const stats: AnalyticsStats = {
      summary,
      topPages,
      topCountries,
      topCities,
      deviceBreakdown,
      browserBreakdown,
      osBreakdown,
      eventTypeBreakdown,
      recentEvents: mapped.slice(0, 50),
      dailyPageViews,
      ctaInsights,
      funnels: stats_funnels,
      ctaAnalytics,
      pagePerformance,
      geoInsights,
      supportInsights,
      dailyTrends,
      conversionIntent,
      comparison,
      insights,
      ctaScores,
      cityIntelligence,
      activeFilters,
      pageGroupBreakdown,
      memberAnalytics,
      featureAnalytics,
      upgradeIntelligence,
    };

    return NextResponse.json(stats);
  } catch (err) {
    console.error('[Analytics GET] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/* ════════════════════════════════════════════════════════════
   COMPUTATION HELPERS
   ════════════════════════════════════════════════════════════ */

function countBy<T>(items: T[], keyFn: (item: T) => string): CountEntry[] {
  const map: Record<string, number> = {};
  items.forEach((item) => {
    const key = keyFn(item);
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .map(([key, count]) => ({ key, count }));
}

function getTimestamp(e: AnalyticsEvent): string {
  return e.occurredAt || e.createdAt || '';
}

function getDay(e: AnalyticsEvent): string {
  return getTimestamp(e).substring(0, 10);
}

/* ── B: Funnel Analytics ── */

function computeFunnels(events: AnalyticsEvent[]): FunnelData[] {
  // Group events by visitor for session-based funnel analysis
  const visitorEvents: Record<string, Set<string>> = {};
  events.forEach((e) => {
    if (!e.visitorId) return;
    if (!visitorEvents[e.visitorId]) visitorEvents[e.visitorId] = new Set();
    // Map events to funnel-stage keys
    if (e.eventType === 'page_view' && e.pagePath === '/') visitorEvents[e.visitorId].add('homepage_view');
    if (e.eventType === 'page_view' && e.pagePath === '/pricing') visitorEvents[e.visitorId].add('pricing_view');
    if (e.eventType === 'page_view' && e.pagePath === '/support') visitorEvents[e.visitorId].add('support_view');
    if (e.eventType === 'page_view' && (e.pagePath === '/sign-in' || e.pagePath === '/sign-up')) visitorEvents[e.visitorId].add('signin_view');
    if (e.eventType === 'open_app_click') visitorEvents[e.visitorId].add('open_app_click');
    if (e.eventType === 'download_click') visitorEvents[e.visitorId].add('download_click');
    if (e.eventType === 'pricing_cta_click' || e.eventType === 'cta_click') visitorEvents[e.visitorId].add('plan_cta_click');
    if (e.eventType === 'feedback_submit') visitorEvents[e.visitorId].add('feedback_submit');
    // Member journey stages
    if (e.eventType === 'page_view' && e.pagePath === '/dashboard') visitorEvents[e.visitorId].add('member_dashboard');
    if (e.eventType === 'page_view' && e.pagePath === '/app/overview') visitorEvents[e.visitorId].add('member_overview');
    if (e.eventType === 'page_view' && e.pagePath === '/app/leads') visitorEvents[e.visitorId].add('member_leads');
    if (e.eventType === 'page_view' && e.pagePath === '/app/jobs') visitorEvents[e.visitorId].add('member_jobs');
    if (e.eventType === 'page_view' && e.pagePath === '/app/quotes') visitorEvents[e.visitorId].add('member_quotes');
    if (e.eventType === 'page_view' && e.pagePath === '/app/invoices') visitorEvents[e.visitorId].add('member_invoices');
    if (e.eventType === 'page_view' && e.pagePath === '/app/settings') visitorEvents[e.visitorId].add('member_settings');
    if (e.eventType === 'page_view' && (e.pagePath === '/app/settings/subscription')) visitorEvents[e.visitorId].add('member_subscription');
    if (e.eventType === 'page_view' && getPageGroup(e.pagePath) === 'member') visitorEvents[e.visitorId].add('any_member_page');
  });

  const stageCount = (stage: string) => Object.values(visitorEvents).filter((s) => s.has(stage)).length;

  function buildFunnel(name: string, stages: { key: string; label: string }[]): FunnelData {
    const steps: FunnelStep[] = [];
    let prevCount = 0;
    stages.forEach((stage, i) => {
      const count = stageCount(stage.key);
      const dropoff = i === 0 ? 0 : prevCount > 0 ? Math.round(((prevCount - count) / prevCount) * 100) : 0;
      steps.push({ label: stage.label, count, dropoff });
      prevCount = count;
    });
    const first = steps[0]?.count || 0;
    const last = steps[steps.length - 1]?.count || 0;
    return {
      name,
      steps,
      totalEntries: first,
      totalExits: first - last,
      conversionRate: first > 0 ? Math.round((last / first) * 100) : 0,
    };
  }

  return [
    buildFunnel('Homepage → Pricing → Sign-in', [
      { key: 'homepage_view', label: 'Homepage View' },
      { key: 'pricing_view', label: 'Pricing View' },
      { key: 'signin_view', label: 'Sign-in View' },
    ]),
    buildFunnel('Homepage → Open App', [
      { key: 'homepage_view', label: 'Homepage View' },
      { key: 'open_app_click', label: 'Open App Click' },
    ]),
    buildFunnel('Pricing → Plan CTA Click', [
      { key: 'pricing_view', label: 'Pricing View' },
      { key: 'plan_cta_click', label: 'Plan CTA Click' },
    ]),
    buildFunnel('Support → Feedback Submit', [
      { key: 'support_view', label: 'Support View' },
      { key: 'feedback_submit', label: 'Feedback Submit' },
    ]),
    // ── Member Journey Funnels ──
    buildFunnel('Sign-in → Member Dashboard', [
      { key: 'signin_view', label: 'Sign-in View' },
      { key: 'member_dashboard', label: 'Member Dashboard' },
    ]),
    buildFunnel('Dashboard → Leads / Quotes', [
      { key: 'member_dashboard', label: 'Dashboard' },
      { key: 'member_leads', label: 'Leads' },
      { key: 'member_quotes', label: 'Quotes' },
    ]),
    buildFunnel('Dashboard → Jobs → Invoices', [
      { key: 'member_dashboard', label: 'Dashboard' },
      { key: 'member_jobs', label: 'Jobs' },
      { key: 'member_invoices', label: 'Invoices' },
    ]),
    buildFunnel('Settings → Subscription', [
      { key: 'member_settings', label: 'Settings' },
      { key: 'member_subscription', label: 'Subscription / Billing' },
    ]),
  ];
}

/* ── C: Extended CTA Analytics ── */

function computeCtaAnalytics(ctaEvents: AnalyticsEvent[], ctaByTier: CtaInsight[]): CtaAnalytics {
  const topCtaNames = countBy(
    ctaEvents.filter((e) => e.metadata),
    (e) => (e.metadata as AnalyticsMetadata)?.ctaName || (e.metadata as AnalyticsMetadata)?.buttonType || e.eventLabel || e.eventType
  );
  const topCtaPages = countBy(ctaEvents, (e) => e.pagePath);
  const topCtaSections = countBy(
    ctaEvents.filter((e) => e.metadata && (e.metadata as AnalyticsMetadata)?.ctaSource),
    (e) => (e.metadata as AnalyticsMetadata)?.ctaSource || 'unknown'
  );
  const ctaByLocale = countBy(
    ctaEvents.filter((e) => e.metadata && (e.metadata as AnalyticsMetadata)?.locale),
    (e) => (e.metadata as AnalyticsMetadata)?.locale || 'unknown'
  );
  const ctaByCountry = countBy(
    ctaEvents.filter((e) => e.country),
    (e) => e.country!
  );
  const ctaByCity = countBy(
    ctaEvents.filter((e) => e.city),
    (e) => e.city!
  );
  return {
    totalCtaClicks: ctaEvents.length,
    topCtaNames,
    topCtaPages,
    topCtaSections,
    ctaByLocale,
    ctaByCountry,
    ctaByCity,
    ctaByTier,
  };
}

/* ── D: Page Performance ── */

function computePagePerformance(events: AnalyticsEvent[]): PagePerformance[] {
  const KEY_PAGES = [
    '/', '/pricing', '/support', '/sign-in', '/sign-up', '/contact',
    '/dashboard', '/app/overview', '/app/leads', '/app/jobs',
    '/app/quotes', '/app/invoices', '/app/history', '/app/chat',
    '/app/tasks', '/app/assets', '/app/settings', '/app/settings/subscription',
  ];
  const pageMap: Record<string, PagePerformance> = {};

  // Init key pages
  KEY_PAGES.forEach((p) => {
    pageMap[p] = { pagePath: p, views: 0, uniqueVisitors: 0, ctaClicks: 0, supportOpens: 0, feedbackSubmits: 0, ctaRate: 0 };
  });

  const visitorsByPage: Record<string, Set<string>> = {};
  events.forEach((e) => {
    const path = e.pagePath;
    if (!pageMap[path] && KEY_PAGES.includes(path)) {
      pageMap[path] = { pagePath: path, views: 0, uniqueVisitors: 0, ctaClicks: 0, supportOpens: 0, feedbackSubmits: 0, ctaRate: 0 };
    }
    if (!pageMap[path]) return;

    if (e.eventType === 'page_view') {
      pageMap[path].views++;
      if (e.visitorId) {
        if (!visitorsByPage[path]) visitorsByPage[path] = new Set();
        visitorsByPage[path].add(e.visitorId);
      }
    }
    if (e.eventType === 'pricing_cta_click' || e.eventType === 'cta_click' || e.eventType === 'download_click' || e.eventType === 'open_app_click') {
      pageMap[path].ctaClicks++;
    }
    if (e.eventType === 'support_open' || e.eventType === 'faq_open') {
      pageMap[path].supportOpens++;
    }
    if (e.eventType === 'feedback_submit') {
      pageMap[path].feedbackSubmits++;
    }
  });

  // Also count CTA clicks sourced from metadata.sourcePage
  events.forEach((e) => {
    const meta = e.metadata as AnalyticsMetadata | null;
    const src = meta?.sourcePage || meta?.pageContext;
    if (src && pageMap[src]) {
      if (e.eventType === 'pricing_cta_click' || e.eventType === 'cta_click') {
        // Only count if not already counted by pagePath
        if (e.pagePath !== src) pageMap[src].ctaClicks++;
      }
    }
  });

  Object.keys(pageMap).forEach((p) => {
    pageMap[p].uniqueVisitors = visitorsByPage[p]?.size || 0;
    pageMap[p].ctaRate = pageMap[p].views > 0 ? Math.round((pageMap[p].ctaClicks / pageMap[p].views) * 100) : 0;
  });

  return Object.values(pageMap).sort((a, b) => b.views - a.views);
}

/* ── E: Geo Insights ── */

function computeGeoInsights(events: AnalyticsEvent[]): { countries: GeoInsight[]; cities: GeoInsight[] } {
  function buildGeo(keyFn: (e: AnalyticsEvent) => string | undefined): GeoInsight[] {
    const map: Record<string, GeoInsight> = {};
    events.forEach((e) => {
      const key = keyFn(e);
      if (!key) return;
      if (!map[key]) map[key] = { key, views: 0, ctaClicks: 0, pricingViews: 0, supportViews: 0, pricingInterest: 0 };
      if (e.eventType === 'page_view') {
        map[key].views++;
        if (e.pagePath === '/pricing') map[key].pricingViews++;
        if (e.pagePath === '/support') map[key].supportViews++;
      }
      if (e.eventType === 'pricing_cta_click' || e.eventType === 'cta_click' || e.eventType === 'download_click' || e.eventType === 'open_app_click') {
        map[key].ctaClicks++;
      }
    });
    // Compute pricing interest
    Object.values(map).forEach((g) => { g.pricingInterest = g.pricingViews + g.ctaClicks; });
    return Object.values(map).sort((a, b) => b.views - a.views).slice(0, 20);
  }

  return {
    countries: buildGeo((e) => e.country || undefined),
    cities: buildGeo((e) => e.city || undefined),
  };
}

/* ── F: Support / Feedback Insights ── */

function computeSupportInsights(events: AnalyticsEvent[]): SupportInsights {
  const supportViews = events.filter((e) => e.eventType === 'page_view' && e.pagePath === '/support').length;
  const feedbackEvents = events.filter((e) => e.eventType === 'feedback_submit');

  const feedbackByType = countBy(
    feedbackEvents.filter((e) => e.metadata && (e.metadata as AnalyticsMetadata)?.feedbackType),
    (e) => (e.metadata as AnalyticsMetadata)?.feedbackType || 'unknown'
  );
  const feedbackBySection = countBy(
    feedbackEvents.filter((e) => e.metadata && (e.metadata as AnalyticsMetadata)?.supportCategory),
    (e) => (e.metadata as AnalyticsMetadata)?.supportCategory || 'unknown'
  );
  // Fall back to eventLabel for section if metadata.supportCategory is absent
  const feedbackBySectionFallback = feedbackBySection.length > 0
    ? feedbackBySection
    : countBy(feedbackEvents.filter((e) => e.eventLabel), (e) => e.eventLabel!);

  const feedbackByLocale = countBy(
    feedbackEvents.filter((e) => e.metadata && (e.metadata as AnalyticsMetadata)?.locale),
    (e) => (e.metadata as AnalyticsMetadata)?.locale || 'unknown'
  );
  const feedbackByCountry = countBy(
    feedbackEvents.filter((e) => e.country),
    (e) => e.country!
  );

  let blockedCount = 0;
  let notBlockedCount = 0;
  feedbackEvents.forEach((e) => {
    const meta = e.metadata as AnalyticsMetadata | null;
    if (meta && typeof meta.isBlocked === 'boolean') {
      if (meta.isBlocked) blockedCount++;
      else notBlockedCount++;
    }
  });

  return {
    totalSupportViews: supportViews,
    totalFeedbackSubmits: feedbackEvents.length,
    feedbackByType,
    feedbackBySection: feedbackBySectionFallback,
    feedbackByLocale,
    feedbackByCountry,
    blockedCount,
    notBlockedCount,
    supportViewToFeedbackRate: supportViews > 0 ? Math.round((feedbackEvents.length / supportViews) * 100) : 0,
  };
}

/* ── G: Daily Trends ── */

function computeDailyTrends(events: AnalyticsEvent[]): DailyTrend[] {
  const trendMap: Record<string, DailyTrend> = {};
  const visitorsByDay: Record<string, Set<string>> = {};

  events.forEach((e) => {
    const day = getDay(e);
    if (!day) return;
    if (!trendMap[day]) trendMap[day] = { date: day, pageViews: 0, uniqueVisitors: 0, ctaClicks: 0, supportSubmits: 0 };
    if (e.eventType === 'page_view') trendMap[day].pageViews++;
    if (e.eventType === 'pricing_cta_click' || e.eventType === 'cta_click' || e.eventType === 'download_click' || e.eventType === 'open_app_click') trendMap[day].ctaClicks++;
    if (e.eventType === 'feedback_submit' || e.eventType === 'support_open') trendMap[day].supportSubmits++;
    if (e.visitorId) {
      if (!visitorsByDay[day]) visitorsByDay[day] = new Set();
      visitorsByDay[day].add(e.visitorId);
    }
  });

  Object.keys(trendMap).forEach((day) => {
    trendMap[day].uniqueVisitors = visitorsByDay[day]?.size || 0;
  });

  return Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));
}

/* ── H: Conversion Intent ── */

function computeConversionIntent(events: AnalyticsEvent[]): ConversionIntent {
  // High-intent signals: pricing view, sign-in view, plan CTA click, open app click,
  // repeated visits by same visitor, support visit after pricing
  const HIGH_INTENT_TYPES = new Set(['pricing_cta_click', 'cta_click', 'open_app_click', 'download_click', 'signin_view']);
  const HIGH_INTENT_PAGES = new Set(['/pricing', '/sign-in', '/sign-up', '/app/settings/subscription']);

  const visitorSignals: Record<string, Set<string>> = {};
  const visitorPagePaths: Record<string, Set<string>> = {};

  events.forEach((e) => {
    if (!e.visitorId) return;
    if (!visitorSignals[e.visitorId]) visitorSignals[e.visitorId] = new Set();
    if (!visitorPagePaths[e.visitorId]) visitorPagePaths[e.visitorId] = new Set();

    if (HIGH_INTENT_TYPES.has(e.eventType)) {
      visitorSignals[e.visitorId].add(e.eventType);
    }
    if (e.eventType === 'page_view' && HIGH_INTENT_PAGES.has(e.pagePath)) {
      visitorSignals[e.visitorId].add(`page:${e.pagePath}`);
      visitorPagePaths[e.visitorId].add(e.pagePath);
    }
  });

  // Check for "support after pricing" pattern
  const visitorTimeline: Record<string, { type: string; path: string; ts: string }[]> = {};
  events.forEach((e) => {
    if (!e.visitorId) return;
    if (!visitorTimeline[e.visitorId]) visitorTimeline[e.visitorId] = [];
    visitorTimeline[e.visitorId].push({ type: e.eventType, path: e.pagePath, ts: getTimestamp(e) });
  });

  Object.entries(visitorTimeline).forEach(([vid, timeline]) => {
    const sorted = timeline.sort((a, b) => a.ts.localeCompare(b.ts));
    let sawPricing = false;
    for (const ev of sorted) {
      if (ev.type === 'page_view' && ev.path === '/pricing') sawPricing = true;
      if (sawPricing && ev.type === 'page_view' && ev.path === '/support') {
        if (!visitorSignals[vid]) visitorSignals[vid] = new Set();
        visitorSignals[vid].add('support_after_pricing');
        break;
      }
    }
  });

  // Visitors with 2+ signals are "high intent"
  const highIntentVisitorIds = Object.entries(visitorSignals)
    .filter(([, signals]) => signals.size >= 2)
    .map(([vid]) => vid);
  const highIntentSet = new Set(highIntentVisitorIds);

  const highIntentEvents = events.filter((e) => e.visitorId && highIntentSet.has(e.visitorId));

  const highIntentPages = countBy(
    highIntentEvents.filter((e) => e.eventType === 'page_view'),
    (e) => e.pagePath
  ).slice(0, 10);

  const highIntentCities = countBy(
    highIntentEvents.filter((e) => e.city),
    (e) => e.city!
  ).slice(0, 10);

  const highIntentCountries = countBy(
    highIntentEvents.filter((e) => e.country),
    (e) => e.country!
  ).slice(0, 10);

  // Signal breakdown
  const allSignals: string[] = [];
  Object.values(visitorSignals).forEach((s) => s.forEach((sig) => allSignals.push(sig)));
  const signals = countBy(allSignals.map((s) => ({ s })), (o) => o.s);

  return {
    highIntentVisitors: highIntentVisitorIds.length,
    highIntentEvents: highIntentEvents.length,
    highIntentPages,
    highIntentCities,
    highIntentCountries,
    signals,
  };
}

/* ── I: Period Comparison ── */

function computeComparison(current: AnalyticsEvent[], previous: AnalyticsEvent[]): ComparisonData {
  const CTA_TYPES = new Set(['pricing_cta_click', 'cta_click', 'download_click', 'open_app_click']);
  const SUPPORT_TYPES = new Set(['feedback_submit', 'support_open']);

  const curPV = current.filter((e) => e.eventType === 'page_view').length;
  const prevPV = previous.filter((e) => e.eventType === 'page_view').length;
  const curUV = new Set(current.filter((e) => e.visitorId).map((e) => e.visitorId)).size;
  const prevUV = new Set(previous.filter((e) => e.visitorId).map((e) => e.visitorId)).size;
  const curCTA = current.filter((e) => CTA_TYPES.has(e.eventType)).length;
  const prevCTA = previous.filter((e) => CTA_TYPES.has(e.eventType)).length;
  const curSup = current.filter((e) => SUPPORT_TYPES.has(e.eventType)).length;
  const prevSup = previous.filter((e) => SUPPORT_TYPES.has(e.eventType)).length;

  const pctChange = (cur: number, prev: number) => prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);

  return {
    pageViews: curPV,
    pageViewsChange: pctChange(curPV, prevPV),
    uniqueVisitors: curUV,
    uniqueVisitorsChange: pctChange(curUV, prevUV),
    ctaClicks: curCTA,
    ctaClicksChange: pctChange(curCTA, prevCTA),
    supportSubmits: curSup,
    supportSubmitsChange: pctChange(curSup, prevSup),
    totalEvents: current.length,
    totalEventsChange: pctChange(current.length, previous.length),
  };
}

/* ── J: CTA Performance Scores ── */

function computeCtaScores(events: AnalyticsEvent[]): CtaScore[] {
  const CTA_TYPES = new Set(['pricing_cta_click', 'cta_click', 'download_click', 'open_app_click']);

  // Count page views by page
  const pageViewsByPage: Record<string, number> = {};
  events.forEach((e) => {
    if (e.eventType === 'page_view') {
      pageViewsByPage[e.pagePath] = (pageViewsByPage[e.pagePath] || 0) + 1;
    }
  });

  // Group CTA clicks by ctaName + sourcePage
  const ctaMap: Record<string, { clicks: number; sourcePage: string }> = {};
  events.forEach((e) => {
    if (!CTA_TYPES.has(e.eventType)) return;
    const meta = e.metadata as AnalyticsMetadata | null;
    const ctaName = meta?.ctaName || meta?.buttonType || e.eventLabel || e.eventType;
    const sourcePage = meta?.sourcePage || e.pagePath;
    const key = `${ctaName}::${sourcePage}`;
    if (!ctaMap[key]) ctaMap[key] = { clicks: 0, sourcePage };
    ctaMap[key].clicks++;
  });

  return Object.entries(ctaMap)
    .map(([key, data]) => {
      const ctaName = key.split('::')[0];
      const sourcePageViews = pageViewsByPage[data.sourcePage] || 0;
      const ctr = sourcePageViews > 0 ? Math.round((data.clicks / sourcePageViews) * 1000) / 10 : 0;
      return { ctaName, clicks: data.clicks, sourcePageViews, ctr, sourcePage: data.sourcePage };
    })
    .sort((a, b) => b.ctr - a.ctr);
}

/* ── K: City Intelligence ── */

function computeCityIntelligence(events: AnalyticsEvent[]): CityIntelligence[] {
  const CTA_TYPES = new Set(['pricing_cta_click', 'cta_click', 'download_click', 'open_app_click']);
  const SUPPORT_TYPES = new Set(['feedback_submit', 'support_open']);

  const cityMap: Record<string, CityIntelligence> = {};
  events.forEach((e) => {
    if (!e.city) return;
    if (!cityMap[e.city]) {
      cityMap[e.city] = { city: e.city, engagement: 0, pricingInterest: 0, supportUsage: 0, conversionSignals: 0, ctaClicks: 0, views: 0, tag: 'balanced' };
    }
    const c = cityMap[e.city];
    c.engagement++;
    if (e.eventType === 'page_view') {
      c.views++;
      if (e.pagePath === '/pricing') c.pricingInterest++;
    }
    if (CTA_TYPES.has(e.eventType)) {
      c.ctaClicks++;
      c.conversionSignals++;
    }
    if (e.eventType === 'pricing_cta_click') c.pricingInterest++;
    if (SUPPORT_TYPES.has(e.eventType)) c.supportUsage++;
    if (e.eventType === 'page_view' && (e.pagePath === '/sign-in' || e.pagePath === '/sign-up')) c.conversionSignals++;
  });

  // Tag cities
  const cities = Object.values(cityMap).filter((c) => c.views >= 2);
  cities.forEach((c) => {
    const pricingRate = c.views > 0 ? c.pricingInterest / c.views : 0;
    const supportRate = c.views > 0 ? c.supportUsage / c.views : 0;
    const convRate = c.views > 0 ? c.conversionSignals / c.views : 0;
    if (pricingRate > 0.3) c.tag = 'high-pricing-interest';
    else if (supportRate > 0.2) c.tag = 'high-support';
    else if (c.engagement >= 10 && convRate < 0.05) c.tag = 'low-conversion';
    else if (c.engagement >= 10) c.tag = 'high-engagement';
  });

  return cities.sort((a, b) => b.engagement - a.engagement).slice(0, 20);
}

/* ── L: Insights Engine ── */

function computeInsights(
  events: AnalyticsEvent[],
  comparison: ComparisonData,
  funnels: FunnelData[],
  ctaScores: CtaScore[],
  support: SupportInsights
): Insight[] {
  const insights: Insight[] = [];

  // 1. Traffic trend
  if (comparison.pageViewsChange < -20) {
    insights.push({ title: 'Traffic Declining', description: `Page views dropped ${Math.abs(comparison.pageViewsChange)}% vs previous period. Check for SEO or referral issues.`, severity: 'warning', metric: `${comparison.pageViewsChange}%` });
  } else if (comparison.pageViewsChange > 30) {
    insights.push({ title: 'Traffic Surge', description: `Page views up ${comparison.pageViewsChange}% vs previous period. Great momentum.`, severity: 'success', metric: `+${comparison.pageViewsChange}%` });
  }

  // 2. CTA performance vs views
  const pricingViews = events.filter((e) => e.eventType === 'page_view' && e.pagePath === '/pricing').length;
  const pricingClicks = events.filter((e) => e.eventType === 'pricing_cta_click' || e.eventType === 'cta_click').length;
  if (pricingViews > 10 && pricingClicks === 0) {
    insights.push({ title: 'Pricing Page Conversion Issue', description: `${pricingViews} pricing page views but 0 CTA clicks. Pricing page may need attention.`, severity: 'critical', metric: '0% CTR' });
  } else if (pricingViews > 10 && pricingClicks > 0 && (pricingClicks / pricingViews) < 0.05) {
    insights.push({ title: 'Low Pricing Conversion', description: `Only ${Math.round((pricingClicks / pricingViews) * 100)}% of pricing viewers click a CTA. Consider clearer value proposition.`, severity: 'warning', metric: `${Math.round((pricingClicks / pricingViews) * 100)}% CTR` });
  }

  // 3. Support after pricing pattern
  const supportAfterPricingVisitors = events.filter((e) => e.visitorId).reduce((acc, e) => {
    if (!acc.timeline[e.visitorId!]) acc.timeline[e.visitorId!] = [];
    acc.timeline[e.visitorId!].push({ type: e.eventType, path: e.pagePath, ts: getTimestamp(e) });
    return acc;
  }, { timeline: {} as Record<string, { type: string; path: string; ts: string }[]> });

  let supportAfterPricingCount = 0;
  Object.values(supportAfterPricingVisitors.timeline).forEach((timeline) => {
    const sorted = timeline.sort((a, b) => a.ts.localeCompare(b.ts));
    let sawPricing = false;
    for (const ev of sorted) {
      if (ev.type === 'page_view' && ev.path === '/pricing') sawPricing = true;
      if (sawPricing && ev.type === 'page_view' && ev.path === '/support') { supportAfterPricingCount++; break; }
    }
  });
  if (supportAfterPricingCount >= 3) {
    insights.push({ title: 'Pricing Confusion Detected', description: `${supportAfterPricingCount} visitors went to support after viewing pricing. This suggests pricing clarity issues.`, severity: 'warning', metric: `${supportAfterPricingCount} visitors` });
  }

  // 4. Blocked feedback
  if (support.blockedCount >= 3) {
    insights.push({ title: 'High Blocked Feedback', description: `${support.blockedCount} users reported being blocked. This is a critical UX issue to investigate.`, severity: 'critical', metric: `${support.blockedCount} blocked` });
  }

  // 5. Funnel drop detection
  funnels.forEach((funnel) => {
    let worstDrop = 0;
    let worstStep = '';
    let prevStep = '';
    funnel.steps.forEach((step, i) => {
      if (i > 0 && step.dropoff > worstDrop) {
        worstDrop = step.dropoff;
        worstStep = step.label;
        prevStep = funnel.steps[i - 1].label;
      }
    });
    if (worstDrop >= 70 && funnel.steps[0]?.count >= 5) {
      insights.push({ title: `Major Drop: ${prevStep} → ${worstStep}`, description: `${worstDrop}% drop in "${funnel.name}". This is the biggest bottleneck in this journey.`, severity: 'critical', metric: `-${worstDrop}%` });
    } else if (worstDrop >= 50 && funnel.steps[0]?.count >= 5) {
      insights.push({ title: `Drop: ${prevStep} → ${worstStep}`, description: `${worstDrop}% drop in "${funnel.name}". Worth investigating.`, severity: 'warning', metric: `-${worstDrop}%` });
    }
  });

  // 6. Underperforming CTAs
  const lowPerformers = ctaScores.filter((s) => s.sourcePageViews >= 10 && s.ctr < 2);
  if (lowPerformers.length > 0) {
    const worst = lowPerformers[lowPerformers.length - 1];
    insights.push({ title: 'Underperforming CTA', description: `"${worst.ctaName}" on ${worst.sourcePage} has only ${worst.ctr}% CTR (${worst.clicks} clicks / ${worst.sourcePageViews} views). Consider repositioning or rewording.`, severity: 'warning', metric: `${worst.ctr}% CTR` });
  }

  // 7. Member engagement insights
  const memberEvents = events.filter((e) => getPageGroup(e.pagePath) === 'member');
  const memberPageViews = memberEvents.filter((e) => e.eventType === 'page_view');
  const dashboardVisitors = new Set(memberPageViews.filter((e) => e.pagePath === '/dashboard' || e.pagePath === '/app/overview').map((e) => e.visitorId).filter(Boolean));
  const deepWorkflowPages = new Set(['/app/leads', '/app/jobs', '/app/quotes', '/app/invoices', '/app/tasks', '/app/assets', '/app/history', '/app/chat']);
  const deepVisitors = new Set(memberPageViews.filter((e) => deepWorkflowPages.has(e.pagePath)).map((e) => e.visitorId).filter(Boolean));

  if (dashboardVisitors.size >= 3 && deepVisitors.size === 0) {
    insights.push({ title: 'Members Not Using Workflows', description: `${dashboardVisitors.size} members visited dashboard but none opened Leads, Jobs, Quotes, or Invoices. Workflow adoption needs attention.`, severity: 'critical', metric: '0 workflow users' });
  } else if (dashboardVisitors.size >= 5) {
    const retRate = Math.round((deepVisitors.size / dashboardVisitors.size) * 100);
    if (retRate < 30) {
      insights.push({ title: 'Low Member Workflow Adoption', description: `Only ${retRate}% of dashboard visitors use deeper workflows (${deepVisitors.size}/${dashboardVisitors.size}). Consider onboarding improvements.`, severity: 'warning', metric: `${retRate}% adoption` });
    } else if (retRate >= 60) {
      insights.push({ title: 'Strong Workflow Adoption', description: `${retRate}% of dashboard visitors engage with workflows. Great product stickiness.`, severity: 'success', metric: `${retRate}% adoption` });
    }
  }

  // 8. Settings → Subscription funnel
  const settingsVisitors = new Set(memberPageViews.filter((e) => e.pagePath === '/app/settings').map((e) => e.visitorId).filter(Boolean));
  const subVisitors = new Set(memberPageViews.filter((e) => e.pagePath === '/app/settings/subscription').map((e) => e.visitorId).filter(Boolean));
  if (settingsVisitors.size >= 5 && subVisitors.size === 0) {
    insights.push({ title: 'No Billing Page Views', description: `${settingsVisitors.size} members viewed Settings but none clicked Subscription/Billing. Billing CTA may be hard to find.`, severity: 'warning', metric: '0 billing views' });
  }

  return insights.slice(0, 8);
}

/* ── M: Page Group Breakdown ── */

function computePageGroupBreakdown(events: AnalyticsEvent[]): PageGroupBreakdown[] {
  const groups: Record<PageGroup, { pageViews: number; visitors: Set<string>; totalEvents: number; pages: Record<string, number> }> = {
    public: { pageViews: 0, visitors: new Set(), totalEvents: 0, pages: {} },
    auth: { pageViews: 0, visitors: new Set(), totalEvents: 0, pages: {} },
    member: { pageViews: 0, visitors: new Set(), totalEvents: 0, pages: {} },
    admin: { pageViews: 0, visitors: new Set(), totalEvents: 0, pages: {} },
    unknown: { pageViews: 0, visitors: new Set(), totalEvents: 0, pages: {} },
  };

  events.forEach((e) => {
    const group = getPageGroup(e.pagePath);
    const g = groups[group];
    g.totalEvents++;
    if (e.eventType === 'page_view') {
      g.pageViews++;
      g.pages[e.pagePath] = (g.pages[e.pagePath] || 0) + 1;
    }
    if (e.visitorId) g.visitors.add(e.visitorId);
  });

  return (['public', 'auth', 'member', 'admin'] as PageGroup[])
    .map((group) => {
      const g = groups[group];
      const topPages = Object.entries(g.pages)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([key, count]) => ({ key, count }));
      return {
        group,
        pageViews: g.pageViews,
        uniqueVisitors: g.visitors.size,
        totalEvents: g.totalEvents,
        topPages,
      };
    })
    .filter((g) => g.totalEvents > 0);
}

/* ── N: Member Analytics ── */

function computeMemberAnalytics(events: AnalyticsEvent[]): MemberAnalytics {
  const memberEvents = events.filter((e) => getPageGroup(e.pagePath) === 'member');
  const memberPageViews = memberEvents.filter((e) => e.eventType === 'page_view');
  const memberVisitors = new Set(memberEvents.filter((e) => e.visitorId).map((e) => e.visitorId));
  const topMemberPages = countBy(memberPageViews, (e) => e.pagePath);

  // Member page performance
  const MEMBER_PAGES = [
    '/dashboard', '/app/overview', '/app/leads', '/app/jobs',
    '/app/quotes', '/app/invoices', '/app/history', '/app/chat',
    '/app/tasks', '/app/assets', '/app/settings', '/app/settings/subscription',
  ];
  const pageMap: Record<string, PagePerformance> = {};
  MEMBER_PAGES.forEach((p) => {
    pageMap[p] = { pagePath: p, views: 0, uniqueVisitors: 0, ctaClicks: 0, supportOpens: 0, feedbackSubmits: 0, ctaRate: 0 };
  });
  const visitorsByPage: Record<string, Set<string>> = {};
  memberEvents.forEach((e) => {
    const path = e.pagePath;
    if (!pageMap[path]) return;
    if (e.eventType === 'page_view') {
      pageMap[path].views++;
      if (e.visitorId) {
        if (!visitorsByPage[path]) visitorsByPage[path] = new Set();
        visitorsByPage[path].add(e.visitorId);
      }
    }
    if (['pricing_cta_click', 'cta_click', 'download_click', 'open_app_click'].includes(e.eventType)) {
      pageMap[path].ctaClicks++;
    }
    if (e.eventType === 'support_open' || e.eventType === 'faq_open') pageMap[path].supportOpens++;
    if (e.eventType === 'feedback_submit') pageMap[path].feedbackSubmits++;
  });
  Object.keys(pageMap).forEach((p) => {
    pageMap[p].uniqueVisitors = visitorsByPage[p]?.size || 0;
    pageMap[p].ctaRate = pageMap[p].views > 0 ? Math.round((pageMap[p].ctaClicks / pageMap[p].views) * 100) : 0;
  });
  const memberPagePerformance = Object.values(pageMap).filter((p) => p.views > 0).sort((a, b) => b.views - a.views);

  // Member retention: dashboard visitors vs deeper workflow visitors
  const dashboardVisitors = new Set<string>();
  const deepWorkflowVisitors = new Set<string>();
  const deepPages = new Set(['/app/leads', '/app/jobs', '/app/quotes', '/app/invoices', '/app/tasks', '/app/assets', '/app/history', '/app/chat']);
  memberPageViews.forEach((e) => {
    if (!e.visitorId) return;
    if (e.pagePath === '/dashboard' || e.pagePath === '/app/overview') dashboardVisitors.add(e.visitorId);
    if (deepPages.has(e.pagePath)) deepWorkflowVisitors.add(e.visitorId);
  });

  return {
    totalMemberPageViews: memberPageViews.length,
    uniqueMemberVisitors: memberVisitors.size,
    totalMemberEvents: memberEvents.length,
    topMemberPages,
    memberPagePerformance,
    memberRetention: {
      dashboardVisitors: dashboardVisitors.size,
      deepWorkflowVisitors: deepWorkflowVisitors.size,
      retentionRate: dashboardVisitors.size > 0 ? Math.round((deepWorkflowVisitors.size / dashboardVisitors.size) * 100) : 0,
    },
  };
}

/* ── O: Feature Analytics ── */

function computeFeatureAnalytics(events: AnalyticsEvent[]): FeatureAnalytics {
  return {
    featureUsage: computeFeatureUsage(events),
    workflowCompletion: computeWorkflowCompletion(events),
    memberSegments: computeMemberSegments(events),
    revenueSignals: computeRevenueSignals(events),
  };
}

function computeFeatureUsage(events: AnalyticsEvent[]): FeatureUsage[] {
  // Total unique member visitors as denominator for adoption rate
  const memberVisitors = new Set(
    events
      .filter((e) => e.visitorId && getPageGroup(e.pagePath) === 'member')
      .map((e) => e.visitorId)
  );
  const totalMembers = memberVisitors.size || 1;

  // Group feature_view and related events by metadata.feature
  const featureMap: Record<string, { views: number; actions: number; visitors: Set<string> }> = {};

  const ACTION_TYPES = new Set(['document_view', 'quick_action_click', 'billing_action', 'nav_click']);

  events.forEach((e) => {
    const meta = e.metadata as AnalyticsMetadata | null;
    const feature = meta?.feature;
    if (!feature) return;

    if (!featureMap[feature]) featureMap[feature] = { views: 0, actions: 0, visitors: new Set() };

    if (e.eventType === 'feature_view') {
      featureMap[feature].views++;
    }
    if (ACTION_TYPES.has(e.eventType)) {
      featureMap[feature].actions++;
    }
    if (e.visitorId) featureMap[feature].visitors.add(e.visitorId);
  });

  return Object.entries(featureMap)
    .map(([feature, data]) => ({
      feature,
      views: data.views,
      actions: data.actions,
      uniqueUsers: data.visitors.size,
      adoptionRate: Math.round((data.visitors.size / totalMembers) * 100),
    }))
    .sort((a, b) => b.views - a.views);
}

function computeWorkflowCompletion(events: AnalyticsEvent[]): WorkflowCompletion[] {
  // Track which features each visitor has viewed
  const visitorFeatures: Record<string, Set<string>> = {};
  events.forEach((e) => {
    if (!e.visitorId) return;
    const meta = e.metadata as AnalyticsMetadata | null;
    const feature = meta?.feature;
    if (feature && (e.eventType === 'feature_view' || e.eventType === 'document_view' || e.eventType === 'quick_action_click' || e.eventType === 'billing_action')) {
      if (!visitorFeatures[e.visitorId]) visitorFeatures[e.visitorId] = new Set();
      visitorFeatures[e.visitorId].add(feature);
    }
    // Also map page_view events for pages tracked before feature_view was added
    if (e.eventType === 'page_view' && getPageGroup(e.pagePath) === 'member') {
      if (!visitorFeatures[e.visitorId]) visitorFeatures[e.visitorId] = new Set();
      const pathToFeature: Record<string, string> = {
        '/dashboard': 'dashboard',
        '/app/overview': 'overview',
        '/app/leads': 'leads',
        '/app/jobs': 'jobs',
        '/app/quotes': 'quotes',
        '/app/invoices': 'invoices',
        '/app/settings/subscription': 'subscription',
      };
      const mapped = pathToFeature[e.pagePath];
      if (mapped) visitorFeatures[e.visitorId].add(mapped);
    }
  });

  const stageCount = (feature: string) =>
    Object.values(visitorFeatures).filter((s) => s.has(feature)).length;

  function buildWorkflow(name: string, stages: { feature: string; label: string }[]): WorkflowCompletion {
    const stageData = stages.map((s) => {
      const users = stageCount(s.feature);
      return { label: s.label, users, rate: 0 };
    });
    const first = stageData[0]?.users || 0;
    stageData.forEach((s) => {
      s.rate = first > 0 ? Math.round((s.users / first) * 100) : 0;
    });
    const last = stageData[stageData.length - 1]?.users || 0;
    return {
      name,
      stages: stageData,
      overallRate: first > 0 ? Math.round((last / first) * 100) : 0,
    };
  }

  return [
    buildWorkflow('Lead-to-Invoice Pipeline', [
      { feature: 'leads', label: 'Leads Viewed' },
      { feature: 'jobs', label: 'Jobs Viewed' },
      { feature: 'quotes', label: 'Quotes Viewed' },
      { feature: 'invoices', label: 'Invoices Viewed' },
    ]),
    buildWorkflow('Dashboard → Workflow Engagement', [
      { feature: 'dashboard', label: 'Dashboard' },
      { feature: 'overview', label: 'Overview' },
      { feature: 'leads', label: 'Leads' },
      { feature: 'jobs', label: 'Jobs' },
    ]),
    buildWorkflow('Billing Journey', [
      { feature: 'settings', label: 'Settings' },
      { feature: 'subscription', label: 'Subscription Page' },
      { feature: 'billing', label: 'Billing Action' },
    ]),
  ];
}

function computeMemberSegments(events: AnalyticsEvent[]): MemberSegmentData[] {
  // Classify each visitor into a behaviour segment
  const visitorFeatures: Record<string, Set<string>> = {};
  const visitorActions: Record<string, Set<string>> = {};

  events.forEach((e) => {
    if (!e.visitorId) return;
    if (!visitorFeatures[e.visitorId]) visitorFeatures[e.visitorId] = new Set();
    if (!visitorActions[e.visitorId]) visitorActions[e.visitorId] = new Set();

    const meta = e.metadata as AnalyticsMetadata | null;
    const feature = meta?.feature;
    if (feature) visitorFeatures[e.visitorId].add(feature);

    // Map page views to features for backward compat
    if (e.eventType === 'page_view' && getPageGroup(e.pagePath) === 'member') {
      const pathMap: Record<string, string> = {
        '/dashboard': 'dashboard', '/app/overview': 'overview',
        '/app/leads': 'leads', '/app/jobs': 'jobs',
        '/app/quotes': 'quotes', '/app/invoices': 'invoices',
        '/app/history': 'history', '/app/tasks': 'tasks',
        '/app/assets': 'assets', '/app/chat': 'chat',
        '/app/settings': 'settings', '/app/settings/subscription': 'subscription',
      };
      const f = pathMap[e.pagePath];
      if (f) visitorFeatures[e.visitorId].add(f);
    }

    visitorActions[e.visitorId].add(e.eventType);
  });

  // Only classify visitors who have member-page activity
  const memberVisitorIds = Object.keys(visitorFeatures).filter((vid) => {
    const features = visitorFeatures[vid];
    return features.size > 0 && (
      features.has('dashboard') || features.has('overview') || features.has('leads') ||
      features.has('jobs') || features.has('quotes') || features.has('invoices') ||
      features.has('settings') || features.has('subscription')
    );
  });

  const WORKFLOW_FEATURES = new Set(['leads', 'jobs', 'quotes', 'invoices', 'tasks', 'assets']);
  const DASHBOARD_ONLY = new Set(['dashboard', 'overview']);
  const BILLING_FEATURES = new Set(['subscription', 'billing']);

  const segmentCounts: Record<MemberSegment, number> = { builder: 0, manager: 0, buyer: 0, stuck: 0, new: 0 };

  memberVisitorIds.forEach((vid) => {
    const features = visitorFeatures[vid];
    const actions = visitorActions[vid];
    const hasWorkflow = [...features].some((f) => WORKFLOW_FEATURES.has(f));
    const hasBilling = [...features].some((f) => BILLING_FEATURES.has(f));
    const hasBillingAction = actions.has('billing_action') || actions.has('pricing_cta_click');
    const hasOnlyDashboard = [...features].every((f) => DASHBOARD_ONLY.has(f) || f === 'settings');
    const hasSettings = features.has('settings');

    if (hasWorkflow && hasBilling) {
      // Active user who also engages with billing — builder
      segmentCounts.builder++;
    } else if (hasWorkflow) {
      // Uses workflow features but no billing interest — manager
      segmentCounts.manager++;
    } else if (hasBillingAction || hasBilling) {
      // Only interacts with billing — buyer
      segmentCounts.buyer++;
    } else if (hasSettings && !hasWorkflow) {
      // Visits settings repeatedly without workflow — stuck
      segmentCounts.stuck++;
    } else if (hasOnlyDashboard) {
      // Only sees dashboard/overview — new
      segmentCounts.new++;
    } else {
      segmentCounts.new++;
    }
  });

  const total = memberVisitorIds.length || 1;
  const descriptions: Record<MemberSegment, string> = {
    builder: 'Active users engaging with workflows and billing',
    manager: 'Users viewing leads, jobs, quotes without billing',
    buyer: 'Users focused on billing and subscription',
    stuck: 'Users in settings without workflow engagement',
    new: 'Users who only viewed dashboard or overview',
  };

  return (['builder', 'manager', 'buyer', 'stuck', 'new'] as MemberSegment[])
    .map((segment) => ({
      segment,
      count: segmentCounts[segment],
      percentage: Math.round((segmentCounts[segment] / total) * 100),
      description: descriptions[segment],
    }))
    .filter((s) => s.count > 0);
}

function computeRevenueSignals(events: AnalyticsEvent[]): RevenueSignals {
  let invoicesViewed = 0;
  let quotesViewed = 0;
  let upgradeClicks = 0;
  let billingPortalOpens = 0;
  let subscriptionPageViews = 0;

  const revenueVisitors = new Set<string>();

  events.forEach((e) => {
    const meta = e.metadata as AnalyticsMetadata | null;
    const feature = meta?.feature;
    const action = meta?.action;

    // Invoice views
    if (e.eventType === 'feature_view' && feature === 'invoices') {
      invoicesViewed++;
      if (e.visitorId) revenueVisitors.add(e.visitorId);
    }
    if (e.eventType === 'document_view' && feature === 'invoices') {
      invoicesViewed++;
      if (e.visitorId) revenueVisitors.add(e.visitorId);
    }

    // Quote views
    if (e.eventType === 'feature_view' && feature === 'quotes') {
      quotesViewed++;
    }
    if (e.eventType === 'document_view' && feature === 'quotes') {
      quotesViewed++;
    }

    // Upgrade / billing clicks
    if (e.eventType === 'billing_action') {
      if (action === 'manage_billing' || action === 'manage_subscription') {
        billingPortalOpens++;
      } else {
        upgradeClicks++;
      }
      if (e.visitorId) revenueVisitors.add(e.visitorId);
    }
    if (e.eventType === 'pricing_cta_click') {
      upgradeClicks++;
      if (e.visitorId) revenueVisitors.add(e.visitorId);
    }

    // Subscription page views
    if (e.eventType === 'feature_view' && feature === 'subscription') {
      subscriptionPageViews++;
    }
    if (e.eventType === 'page_view' && e.pagePath === '/app/settings/subscription') {
      subscriptionPageViews++;
    }
  });

  return {
    invoicesViewed,
    quotesViewed,
    upgradeClicks,
    billingPortalOpens,
    subscriptionPageViews,
    revenueReadyVisitors: revenueVisitors.size,
  };
}

/* ══════════════════════════════════════════════════════════════
   P: UPGRADE INTELLIGENCE — Rule-Based Upgrade Probability
   ══════════════════════════════════════════════════════════════ */

function computeUpgradeIntelligence(events: AnalyticsEvent[]): UpgradeIntelligence {
  // ── Step 1: Group all events by visitor ──
  const visitorEvents: Record<string, AnalyticsEvent[]> = {};
  events.forEach((e) => {
    if (!e.visitorId) return;
    if (!visitorEvents[e.visitorId]) visitorEvents[e.visitorId] = [];
    visitorEvents[e.visitorId].push(e);
  });

  // ── Step 2: Score each visitor ──
  const scores: UpgradeScore[] = Object.entries(visitorEvents).map(([visitorId, vEvents]) =>
    scoreVisitor(visitorId, vEvents)
  );

  // ── Step 3: Aggregate into intelligence summary ──
  const distribution: UpgradeScoreDistribution = { low: 0, medium: 0, high: 0, very_high: 0 };
  scores.forEach((s) => { distribution[s.band]++; });

  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
  const averageScore = scores.length > 0 ? Math.round(totalScore / scores.length) : 0;

  // Collect all signal occurrences for "top signals" breakdown
  const allPositive: string[] = [];
  const allNegative: string[] = [];
  scores.forEach((s) => {
    s.positiveSignals.forEach((sig) => allPositive.push(sig));
    s.negativeSignals.forEach((sig) => allNegative.push(sig));
  });
  const topPositiveSignals = countBy(allPositive.map((s) => ({ s })), (o) => o.s).slice(0, 15);
  const topNegativeSignals = countBy(allNegative.map((s) => ({ s })), (o) => o.s).slice(0, 15);

  // Pre-upgrade paths
  const precursorPaths = computePrecursorPaths(events, scores);

  // Top upgrade-ready (sorted by score desc, keep top 20)
  const topUpgradeReady = scores
    .filter((s) => s.score >= 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  const memberScores = scores.filter((s) => s.isMember);

  return {
    averageScore,
    totalScored: scores.length,
    distribution,
    topUpgradeReady,
    topPositiveSignals,
    topNegativeSignals,
    precursorPaths,
    highIntentCount: distribution.high + distribution.very_high,
    veryHighIntentCount: distribution.very_high,
    upgradeReadyMembers: memberScores.filter((s) => s.score >= 50).length,
  };
}

/* ── Visitor-Level Scoring Engine ── */

function scoreVisitor(visitorId: string, events: AnalyticsEvent[]): UpgradeScore {
  const positiveSignals: string[] = [];
  const negativeSignals: string[] = [];
  let rawScore = 0;

  // ── Classify visitor as member or public ──
  const hasMemberActivity = events.some((e) => getPageGroup(e.pagePath) === 'member');

  // ── Count key behaviours ──
  const pricingPageViews = events.filter((e) => e.eventType === 'page_view' && e.pagePath === '/pricing').length;
  const subscriptionPageViews = events.filter((e) =>
    (e.eventType === 'page_view' && e.pagePath === '/app/settings/subscription') ||
    (e.eventType === 'feature_view' && (e.metadata as AnalyticsMetadata | null)?.feature === 'subscription')
  ).length;
  const upgradeCtaClicks = events.filter((e) =>
    e.eventType === 'pricing_cta_click' ||
    (e.eventType === 'cta_click' && (e.metadata as AnalyticsMetadata | null)?.planTier)
  ).length;
  const billingActions = events.filter((e) => e.eventType === 'billing_action').length;
  const billingPortalOpens = events.filter((e) =>
    e.eventType === 'billing_action' && (
      (e.metadata as AnalyticsMetadata | null)?.action === 'manage_billing' ||
      (e.metadata as AnalyticsMetadata | null)?.action === 'manage_subscription'
    )
  ).length;
  const signInViews = events.filter((e) => e.eventType === 'page_view' && (e.pagePath === '/sign-in' || e.pagePath === '/sign-up')).length;
  const supportViews = events.filter((e) => e.eventType === 'page_view' && e.pagePath === '/support').length;
  const blockedFeedback = events.filter((e) =>
    e.eventType === 'feedback_submit' && (e.metadata as AnalyticsMetadata | null)?.isBlocked === true
  ).length;
  const openAppClicks = events.filter((e) => e.eventType === 'open_app_click').length;
  const downloadClicks = events.filter((e) => e.eventType === 'download_click').length;

  // Member-specific counts
  const featureViews = events.filter((e) => e.eventType === 'feature_view');
  const uniqueFeatures = new Set(featureViews.map((e) => (e.metadata as AnalyticsMetadata | null)?.feature).filter(Boolean));
  const documentViews = events.filter((e) => e.eventType === 'document_view').length;
  const quickActions = events.filter((e) => e.eventType === 'quick_action_click').length;
  const dashboardViews = events.filter((e) => e.eventType === 'page_view' && (e.pagePath === '/dashboard' || e.pagePath === '/app/overview')).length;

  // Session diversity (unique session IDs)
  const uniqueSessions = new Set(events.filter((e) => e.sessionId).map((e) => e.sessionId)).size;

  // Unique member pages visited
  const memberPagePaths = new Set(
    events.filter((e) => e.eventType === 'page_view' && getPageGroup(e.pagePath) === 'member').map((e) => e.pagePath)
  );
  const totalEvents = events.length;
  const pageViewsOnly = events.filter((e) => e.eventType === 'page_view');
  const uniquePages = new Set(pageViewsOnly.map((e) => e.pagePath));
  const onlyHomepage = uniquePages.size === 1 && uniquePages.has('/');
  const onlyPublic = events.every((e) => getPageGroup(e.pagePath) === 'public' || getPageGroup(e.pagePath) === 'unknown');

  // Workflow features used
  const WORKFLOW_FEATURES = new Set(['leads', 'jobs', 'quotes', 'invoices', 'tasks', 'assets']);
  const workflowFeaturesUsed = [...uniqueFeatures].filter((f) => WORKFLOW_FEATURES.has(f!)).length;

  // Support-after-pricing pattern
  const sorted = [...events].sort((a, b) => getTimestamp(a).localeCompare(getTimestamp(b)));
  let supportAfterPricing = false;
  let sawPricing = false;
  for (const ev of sorted) {
    if (ev.eventType === 'page_view' && ev.pagePath === '/pricing') sawPricing = true;
    if (sawPricing && ev.eventType === 'page_view' && ev.pagePath === '/support') { supportAfterPricing = true; break; }
  }

  // ════════════════════════════════════════
  //  POSITIVE SCORING RULES
  // ════════════════════════════════════════

  // Pricing page visits (strong signal, weighted by frequency)
  if (pricingPageViews >= 3) {
    rawScore += 18;
    positiveSignals.push(`visited pricing ${pricingPageViews} times`);
  } else if (pricingPageViews >= 1) {
    rawScore += 8;
    positiveSignals.push(`visited pricing ${pricingPageViews} time${pricingPageViews > 1 ? 's' : ''}`);
  }

  // Subscription page visits (very strong — already in billing flow)
  if (subscriptionPageViews >= 2) {
    rawScore += 20;
    positiveSignals.push(`viewed subscription page ${subscriptionPageViews} times`);
  } else if (subscriptionPageViews >= 1) {
    rawScore += 12;
    positiveSignals.push('viewed subscription page');
  }

  // Upgrade CTA clicks (strongest intent)
  if (upgradeCtaClicks >= 2) {
    rawScore += 25;
    positiveSignals.push(`clicked upgrade CTA ${upgradeCtaClicks} times`);
  } else if (upgradeCtaClicks >= 1) {
    rawScore += 18;
    positiveSignals.push('clicked upgrade CTA');
  }

  // Billing portal opens
  if (billingPortalOpens >= 1) {
    rawScore += 15;
    positiveSignals.push(`opened billing portal ${billingPortalOpens} time${billingPortalOpens > 1 ? 's' : ''}`);
  }

  // Billing actions (non-portal — e.g. nav to billing)
  if (billingActions > billingPortalOpens) {
    const otherBilling = billingActions - billingPortalOpens;
    rawScore += Math.min(otherBilling * 5, 10);
    positiveSignals.push(`${otherBilling} billing interaction${otherBilling > 1 ? 's' : ''}`);
  }

  // Sign-in / sign-up views (conversion stage)
  if (signInViews >= 1) {
    rawScore += 5;
    positiveSignals.push('viewed sign-in/sign-up page');
  }

  // Workflow feature usage (member engagement)
  if (workflowFeaturesUsed >= 4) {
    rawScore += 15;
    positiveSignals.push(`used ${workflowFeaturesUsed} workflow features`);
  } else if (workflowFeaturesUsed >= 2) {
    rawScore += 8;
    positiveSignals.push(`used ${workflowFeaturesUsed} workflow features`);
  } else if (workflowFeaturesUsed >= 1) {
    rawScore += 4;
    positiveSignals.push('used 1 workflow feature');
  }

  // Document views (quotes/invoices PDFs — transactional usage)
  if (documentViews >= 2) {
    rawScore += 8;
    positiveSignals.push(`viewed ${documentViews} documents`);
  } else if (documentViews >= 1) {
    rawScore += 4;
    positiveSignals.push('viewed a document');
  }

  // Multiple member pages visited (engaged member)
  if (memberPagePaths.size >= 5) {
    rawScore += 10;
    positiveSignals.push(`visited ${memberPagePaths.size} member pages`);
  } else if (memberPagePaths.size >= 3) {
    rawScore += 5;
    positiveSignals.push(`visited ${memberPagePaths.size} member pages`);
  }

  // Quick action clicks (active engagement)
  if (quickActions >= 2) {
    rawScore += 5;
    positiveSignals.push(`${quickActions} quick action clicks`);
  }

  // Return sessions (loyalty / consideration)
  if (uniqueSessions >= 3) {
    rawScore += 10;
    positiveSignals.push(`returned across ${uniqueSessions} sessions`);
  } else if (uniqueSessions >= 2) {
    rawScore += 5;
    positiveSignals.push('returned for a second session');
  }

  // Support-after-pricing (confused but interested)
  if (supportAfterPricing) {
    rawScore += 6;
    positiveSignals.push('visited support after pricing (researching before buying)');
  }

  // Open app / download clicks (platform interest)
  if (openAppClicks >= 1 || downloadClicks >= 1) {
    rawScore += 5;
    positiveSignals.push('clicked open app or download');
  }

  // Feature usage depth (many feature views)
  if (uniqueFeatures.size >= 5) {
    rawScore += 8;
    positiveSignals.push(`explored ${uniqueFeatures.size} features`);
  } else if (uniqueFeatures.size >= 3) {
    rawScore += 4;
    positiveSignals.push(`explored ${uniqueFeatures.size} features`);
  }

  // ════════════════════════════════════════
  //  NEGATIVE SCORING RULES
  // ════════════════════════════════════════

  // Single page / bounce behaviour
  if (totalEvents <= 2 && uniquePages.size <= 1) {
    rawScore -= 15;
    negativeSignals.push('single-page visit (bounce-like)');
  }

  // Only homepage browsing
  if (onlyHomepage && totalEvents <= 3) {
    rawScore -= 10;
    negativeSignals.push('only browsed homepage');
  }

  // Only public pages, no member or pricing interest
  if (onlyPublic && pricingPageViews === 0 && signInViews === 0) {
    rawScore -= 8;
    negativeSignals.push('only public pages, no pricing or sign-in interest');
  }

  // Only settings with no workflow usage
  if (hasMemberActivity && uniqueFeatures.has('settings') && workflowFeaturesUsed === 0 && subscriptionPageViews === 0) {
    rawScore -= 6;
    negativeSignals.push('settings browsing with no feature usage');
  }

  // Blocked / stuck feedback pattern
  if (blockedFeedback >= 1) {
    rawScore -= 8;
    negativeSignals.push(`${blockedFeedback} blocked/stuck feedback submission${blockedFeedback > 1 ? 's' : ''}`);
  }

  // Support-heavy with no billing interest
  if (supportViews >= 3 && pricingPageViews === 0 && subscriptionPageViews === 0 && upgradeCtaClicks === 0) {
    rawScore -= 5;
    negativeSignals.push('heavy support usage but no billing interest');
  }

  // No feature usage (member but passive)
  if (hasMemberActivity && uniqueFeatures.size === 0 && dashboardViews >= 1) {
    rawScore -= 5;
    negativeSignals.push('member with no feature exploration');
  }

  // No workflow progression
  if (hasMemberActivity && workflowFeaturesUsed === 0 && memberPagePaths.size <= 2) {
    rawScore -= 4;
    negativeSignals.push('no workflow progression');
  }

  // ════════════════════════════════════════
  //  MEMBER PRIORITY WEIGHTING (Phase F)
  // ════════════════════════════════════════

  // Members get a base boost — they've already signed up
  if (hasMemberActivity) {
    rawScore += 5;
  }

  // If member has both workflow AND billing activity, extra boost
  if (hasMemberActivity && workflowFeaturesUsed >= 1 && (billingActions >= 1 || subscriptionPageViews >= 1)) {
    rawScore += 8;
    positiveSignals.push('active member with billing engagement');
  }

  // Public-only visitors get dampened unless they show strong signals
  if (!hasMemberActivity && pricingPageViews === 0 && upgradeCtaClicks === 0) {
    rawScore = Math.round(rawScore * 0.6);
  }

  // ── Clamp to 0-100 ──
  const score = Math.max(0, Math.min(100, rawScore));

  // ── Determine band ──
  const band: UpgradeBand = score >= 75 ? 'very_high' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low';

  // ── Determine confidence ──
  let confidence: UpgradeConfidence = 'low';
  if (totalEvents >= 15 && uniqueSessions >= 2) confidence = 'high';
  else if (totalEvents >= 5) confidence = 'medium';

  // ── Build human-readable reasons ──
  const reasons: string[] = [];
  if (band === 'very_high') {
    reasons.push(`Very high upgrade intent (score: ${score}).`);
    if (positiveSignals.length > 0) reasons.push(`Key signals: ${positiveSignals.slice(0, 3).join(', ')}.`);
  } else if (band === 'high') {
    reasons.push(`High upgrade probability (score: ${score}).`);
    if (positiveSignals.length > 0) reasons.push(`Positive: ${positiveSignals.slice(0, 3).join(', ')}.`);
    if (negativeSignals.length > 0) reasons.push(`Friction: ${negativeSignals.slice(0, 2).join(', ')}.`);
  } else if (band === 'medium') {
    reasons.push(`Moderate interest detected (score: ${score}).`);
    if (positiveSignals.length > 0) reasons.push(`Shows: ${positiveSignals.slice(0, 2).join(', ')}.`);
    if (negativeSignals.length > 0) reasons.push(`But also: ${negativeSignals.slice(0, 2).join(', ')}.`);
  } else {
    reasons.push(`Low upgrade intent (score: ${score}).`);
    if (negativeSignals.length > 0) reasons.push(`Because: ${negativeSignals.slice(0, 3).join(', ')}.`);
    if (positiveSignals.length > 0) reasons.push(`Slight interest: ${positiveSignals.slice(0, 1).join(', ')}.`);
  }

  return {
    visitorId,
    score,
    band,
    reasons,
    positiveSignals,
    negativeSignals,
    confidence,
    isMember: hasMemberActivity,
  };
}

/* ── Pre-Upgrade Paths ── */

function computePrecursorPaths(events: AnalyticsEvent[], scores: UpgradeScore[]): UpgradePrecursorPath[] {
  // Identify common 2-step navigation sequences among high-intent visitors
  const highIntentIds = new Set(scores.filter((s) => s.score >= 50).map((s) => s.visitorId));
  if (highIntentIds.size === 0) return [];

  // Build page-to-page transitions for high-intent visitors
  const visitorEvents: Record<string, AnalyticsEvent[]> = {};
  events.forEach((e) => {
    if (!e.visitorId || !highIntentIds.has(e.visitorId)) return;
    if (e.eventType !== 'page_view') return;
    if (!visitorEvents[e.visitorId]) visitorEvents[e.visitorId] = [];
    visitorEvents[e.visitorId].push(e);
  });

  const pathCounts: Record<string, { count: number; scores: number[] }> = {};
  const simplifyPath = (p: string) => {
    if (p === '/') return 'homepage';
    return p.replace(/^\//, '').replace(/\//g, '/');
  };

  Object.entries(visitorEvents).forEach(([vid, vEvents]) => {
    const sorted = vEvents.sort((a, b) => getTimestamp(a).localeCompare(getTimestamp(b)));
    const visitorScore = scores.find((s) => s.visitorId === vid)?.score || 0;
    const seen = new Set<string>(); // dedupe per visitor
    for (let i = 0; i < sorted.length - 1; i++) {
      const from = simplifyPath(sorted[i].pagePath);
      const to = simplifyPath(sorted[i + 1].pagePath);
      if (from === to) continue;
      const key = `${from} → ${to}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!pathCounts[key]) pathCounts[key] = { count: 0, scores: [] };
      pathCounts[key].count++;
      pathCounts[key].scores.push(visitorScore);
    }
  });

  return Object.entries(pathCounts)
    .filter(([, data]) => data.count >= 2) // require at least 2 visitors
    .map(([path, data]) => ({
      path,
      count: data.count,
      avgScore: Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
}
