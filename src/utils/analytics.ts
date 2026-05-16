/**
 * analytics.ts — Analytics types, utilities, and constants
 * =========================================================
 * Central type definitions and helpers for the TISSCA analytics system.
 *
 * Backend contract: public.analytics_events
 * Columns: id, event_type, page_path, referrer, country, country_code,
 *          region, city, device_type, browser, os, visitor_id, session_id,
 *          event_label, event_value, metadata (jsonb), ip_hash,
 *          occurred_at, created_at
 */

/* ─── Event Types ─── */

export type AnalyticsEventType =
  | 'page_view'
  | 'cta_click'
  | 'pricing_cta_click'
  | 'download_click'
  | 'open_app_click'
  | 'support_open'
  | 'feedback_submit'
  | 'faq_open'
  | 'signin_view'
  // ── Feature-level events ──
  | 'feature_view'
  | 'document_view'
  | 'quick_action_click'
  | 'billing_action'
  | 'nav_click';

export type DeviceCategory = 'desktop' | 'mobile' | 'tablet';

/* ─── Page Groups ─── */

export type PageGroup = 'public' | 'auth' | 'member' | 'admin' | 'unknown';

/** Classify a page path into a traffic group */
export function getPageGroup(path: string): PageGroup {
  if (!path) return 'unknown';
  // Admin routes
  if (path.startsWith('/admin')) return 'admin';
  // Auth routes
  if (
    path === '/sign-in' || path === '/sign-up' ||
    path === '/login' || path === '/register' ||
    path === '/forgot-password' || path.startsWith('/auth/')
  ) return 'auth';
  // Member routes
  if (
    path.startsWith('/app/') || path.startsWith('/app') ||
    path.startsWith('/dashboard') ||
    path === '/account' || path.startsWith('/account/')
  ) return 'member';
  // Public routes (everything else)
  return 'public';
}

/* ─── Page Group Breakdown ─── */

export interface PageGroupBreakdown {
  group: PageGroup;
  pageViews: number;
  uniqueVisitors: number;
  totalEvents: number;
  topPages: CountEntry[];
}

/* ─── Member Analytics ─── */

export interface MemberAnalytics {
  totalMemberPageViews: number;
  uniqueMemberVisitors: number;
  totalMemberEvents: number;
  topMemberPages: CountEntry[];
  memberPagePerformance: PagePerformance[];
  memberRetention: {
    dashboardVisitors: number;
    deepWorkflowVisitors: number; // visitors who went beyond dashboard
    retentionRate: number; // deepWorkflow / dashboard as percentage
  };
}

/* ─── Feature Usage ─── */

export interface FeatureUsage {
  feature: string;
  views: number;
  actions: number;
  uniqueUsers: number;
  adoptionRate: number; // uniqueUsers / totalMemberVisitors as %
}

/* ─── Workflow Completion ─── */

export interface WorkflowCompletion {
  name: string;
  stages: { label: string; users: number; rate: number }[];
  overallRate: number; // first → last as %
}

/* ─── Member Behaviour Segment ─── */

export type MemberSegment = 'builder' | 'manager' | 'buyer' | 'stuck' | 'new';

export interface MemberSegmentData {
  segment: MemberSegment;
  count: number;
  percentage: number;
  description: string;
}

/* ─── Revenue Signals ─── */

export interface RevenueSignals {
  invoicesViewed: number;
  quotesViewed: number;
  upgradeClicks: number;
  billingPortalOpens: number;
  subscriptionPageViews: number;
  revenueReadyVisitors: number; // visitors with invoice or upgrade activity
}

/* ─── Feature Analytics (aggregated) ─── */

export interface FeatureAnalytics {
  featureUsage: FeatureUsage[];
  workflowCompletion: WorkflowCompletion[];
  memberSegments: MemberSegmentData[];
  revenueSignals: RevenueSignals;
}

/* ─── Upgrade Intelligence ─── */

export type UpgradeBand = 'low' | 'medium' | 'high' | 'very_high';
export type UpgradeConfidence = 'low' | 'medium' | 'high';

export interface UpgradeScore {
  visitorId: string;
  score: number; // 0-100
  band: UpgradeBand;
  reasons: string[]; // human-readable summary
  positiveSignals: string[];
  negativeSignals: string[];
  confidence: UpgradeConfidence;
  isMember: boolean; // true if visitor has member-area activity
}

export interface UpgradeScoreDistribution {
  low: number;
  medium: number;
  high: number;
  very_high: number;
}

export interface UpgradePrecursorPath {
  path: string; // e.g. "pricing → sign-in"
  count: number;
  avgScore: number;
}

export interface UpgradeIntelligence {
  averageScore: number;
  totalScored: number;
  distribution: UpgradeScoreDistribution;
  topUpgradeReady: UpgradeScore[]; // top 20 highest-scored visitors
  topPositiveSignals: CountEntry[];
  topNegativeSignals: CountEntry[];
  precursorPaths: UpgradePrecursorPath[];
  highIntentCount: number;
  veryHighIntentCount: number;
  upgradeReadyMembers: number; // members with score >= 50
}

/* ─── Metadata — flexible jsonb payload for richer events ─── */

export interface AnalyticsMetadata {
  /** Pricing tier clicked (free / pro / team / teamPro) */
  planTier?: string;
  /** UI section the CTA lives in */
  ctaSource?: string;
  /** Human-readable CTA name */
  ctaName?: string;
  /** Current i18n locale */
  locale?: string;
  /** Source page path */
  sourcePage?: string;
  /** Source section within a page */
  sourceSection?: string;
  /** Additional page context */
  pageContext?: string;
  /** Support / FAQ category */
  supportCategory?: string;
  /** Feedback type / tab */
  feedbackType?: string;
  /** Button label or type */
  buttonType?: string;
  /** FAQ category being viewed */
  faqCategory?: string;
  /** Whether user was blocked (feedback) */
  isBlocked?: boolean;
  /** Feature area (leads, jobs, quotes, invoices, tasks, assets, chat, settings, billing) */
  feature?: string;
  /** Entity type being acted on (lead, job, quote, invoice, task, asset, message) */
  entityType?: string;
  /** Action performed (view, create, update, delete, send, complete, convert) */
  action?: string;
  /** Number of items displayed / loaded */
  itemCount?: number;
  /** Whether user is workspace owner */
  isOwner?: boolean;
  /** Arbitrary extra fields */
  [key: string]: unknown;
}

/* ─── Event Shape ─── */

export interface AnalyticsEvent {
  id?: string;
  eventType: AnalyticsEventType;
  pagePath: string;
  referrer?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  deviceType?: DeviceCategory;
  browser?: string;
  os?: string;
  visitorId?: string;
  sessionId?: string;
  eventLabel?: string;
  eventValue?: string;
  metadata?: AnalyticsMetadata | null;
  ipHash?: string;
  occurredAt?: string;
  createdAt?: string;
}

/* ─── Stats Shapes (returned by GET /api/analytics) ─── */

export interface AnalyticsSummary {
  totalEvents: number;
  totalPageViews: number;
  uniqueVisitors: number;
  topPage: string | null;
  topCountry: string | null;
  topCity: string | null;
  avgEventsPerDay: number;
}

export interface CountEntry {
  key: string;
  count: number;
}

export interface CtaInsight {
  planTier: string;
  count: number;
  sources: CountEntry[];
}

/* ─── Funnel Analytics ─── */

export interface FunnelStep {
  label: string;
  count: number;
  dropoff: number; // percentage drop from previous step
}

export interface FunnelData {
  name: string;
  steps: FunnelStep[];
  totalEntries: number;
  totalExits: number;
  conversionRate: number; // first step → last step
}

/* ─── Page Performance ─── */

export interface PagePerformance {
  pagePath: string;
  views: number;
  uniqueVisitors: number;
  ctaClicks: number;
  supportOpens: number;
  feedbackSubmits: number;
  ctaRate: number; // ctaClicks / views as percentage
}

/* ─── Geography Insights ─── */

export interface GeoInsight {
  key: string; // city or country
  views: number;
  ctaClicks: number;
  pricingViews: number;
  supportViews: number;
  pricingInterest: number; // pricingViews + ctaClicks
}

/* ─── Support / Feedback Insights ─── */

export interface SupportInsights {
  totalSupportViews: number;
  totalFeedbackSubmits: number;
  feedbackByType: CountEntry[];
  feedbackBySection: CountEntry[];
  feedbackByLocale: CountEntry[];
  feedbackByCountry: CountEntry[];
  blockedCount: number;
  notBlockedCount: number;
  supportViewToFeedbackRate: number;
}

/* ─── Time Trends ─── */

export interface DailyTrend {
  date: string;
  pageViews: number;
  uniqueVisitors: number;
  ctaClicks: number;
  supportSubmits: number;
}

/* ─── Conversion Intent ─── */

export interface ConversionIntent {
  highIntentVisitors: number;
  highIntentEvents: number;
  highIntentPages: CountEntry[];
  highIntentCities: CountEntry[];
  highIntentCountries: CountEntry[];
  signals: CountEntry[];
}

/* ─── Extended CTA Insights ─── */

export interface CtaAnalytics {
  totalCtaClicks: number;
  topCtaNames: CountEntry[];
  topCtaPages: CountEntry[];
  topCtaSections: CountEntry[];
  ctaByLocale: CountEntry[];
  ctaByCountry: CountEntry[];
  ctaByCity: CountEntry[];
  ctaByTier: CtaInsight[];
}

/* ─── Automated Insight ─── */

export type InsightSeverity = 'info' | 'warning' | 'critical' | 'success';

export interface Insight {
  title: string;
  description: string;
  severity: InsightSeverity;
  metric?: string;
}

/* ─── Period Comparison ─── */

export interface ComparisonData {
  pageViews: number;
  pageViewsChange: number;
  uniqueVisitors: number;
  uniqueVisitorsChange: number;
  ctaClicks: number;
  ctaClicksChange: number;
  supportSubmits: number;
  supportSubmitsChange: number;
  totalEvents: number;
  totalEventsChange: number;
}

/* ─── CTA Performance Score ─── */

export interface CtaScore {
  ctaName: string;
  clicks: number;
  sourcePageViews: number;
  ctr: number; // clicks / sourcePageViews as percentage
  sourcePage: string;
}

/* ─── City Intelligence ─── */

export interface CityIntelligence {
  city: string;
  engagement: number; // total events
  pricingInterest: number;
  supportUsage: number;
  conversionSignals: number;
  ctaClicks: number;
  views: number;
  tag: 'high-engagement' | 'high-pricing-interest' | 'high-support' | 'low-conversion' | 'balanced';
}

/* ─── Full Stats (returned by GET /api/analytics) ─── */

export interface AnalyticsStats {
  summary: AnalyticsSummary;
  topPages: CountEntry[];
  topCountries: CountEntry[];
  topCities: CountEntry[];
  deviceBreakdown: CountEntry[];
  browserBreakdown: CountEntry[];
  osBreakdown: CountEntry[];
  eventTypeBreakdown: CountEntry[];
  recentEvents: AnalyticsEvent[];
  dailyPageViews: { date: string; count: number }[];
  ctaInsights: CtaInsight[];
  // ── Evolution Layer ──
  funnels: FunnelData[];
  ctaAnalytics: CtaAnalytics;
  pagePerformance: PagePerformance[];
  geoInsights: { countries: GeoInsight[]; cities: GeoInsight[] };
  supportInsights: SupportInsights;
  dailyTrends: DailyTrend[];
  conversionIntent: ConversionIntent;
  // ── Decision-Making Layer ──
  comparison: ComparisonData | null;
  insights: Insight[];
  ctaScores: CtaScore[];
  cityIntelligence: CityIntelligence[];
  activeFilters: Record<string, string>;
  // ── Refocus Layer ──
  pageGroupBreakdown: PageGroupBreakdown[];
  memberAnalytics: MemberAnalytics;
  // ── Feature Analytics Layer ──
  featureAnalytics: FeatureAnalytics;
  // ── Upgrade Intelligence Layer ──
  upgradeIntelligence: UpgradeIntelligence;
}

/* ─── Client-side Helpers ─── */

/** Detect device category from User-Agent */
export function detectDeviceType(ua: string): DeviceCategory {
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  if (/mobile|iphone|android.*mobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

/** Parse browser name from User-Agent */
export function detectBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return 'Opera';
  if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) return 'Chrome';
  if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) return 'Safari';
  if (/firefox\//i.test(ua)) return 'Firefox';
  return 'Other';
}

/** Parse OS name from User-Agent */
export function detectOS(ua: string): string {
  if (/windows/i.test(ua)) return 'Windows';
  if (/macintosh|mac os/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua) && !/android/i.test(ua)) return 'Linux';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  return 'Other';
}

/** Generate a simple visitor fingerprint (best-effort, not PII) */
export function generateVisitorId(): string {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('tissca_vid') : null;
  if (stored) return stored;
  const id = 'v_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('tissca_vid', id);
  }
  return id;
}

/** Generate a session ID (resets on tab close) */
export function generateSessionId(): string {
  const stored = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('tissca_sid') : null;
  if (stored) return stored;
  const id = 's_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('tissca_sid', id);
  }
  return id;
}

/** Send an analytics event to the API */
export async function trackEvent(
  eventType: AnalyticsEventType,
  pagePath: string,
  extra?: {
    eventLabel?: string;
    eventValue?: string;
    referrer?: string;
    metadata?: AnalyticsMetadata;
  }
): Promise<void> {
  try {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const payload: AnalyticsEvent = {
      eventType,
      pagePath,
      referrer: extra?.referrer || (typeof document !== 'undefined' ? document.referrer : undefined),
      deviceType: detectDeviceType(ua),
      browser: detectBrowser(ua),
      os: detectOS(ua),
      visitorId: generateVisitorId(),
      sessionId: generateSessionId(),
      eventLabel: extra?.eventLabel,
      eventValue: extra?.eventValue,
      metadata: extra?.metadata || null,
    };
    // Fire-and-forget — don't block the UI
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => { /* silently fail */ });
  } catch {
    // Silently fail — analytics must never break the app
  }
}
