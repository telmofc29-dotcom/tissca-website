// src/lib/email-intelligence.ts v1.0
//
// PURPOSE:
// Behaviour-driven email trigger system. Uses analytics signals +
// upgrade scoring to classify users and decide what email to send.
//
// RULES:
// - Max 1 email per recipient per 24 h
// - Same trigger type: min 72 h gap
// - Priority: high_intent_upgrade > revenue_ready > activation_needed > feature_discovery > stuck_user
// - Never send without a real behavioural reason
// - All decisions are explainable
//
// DOES NOT send emails directly — populates email_queue for the sender to drain.

import { createServerSupabaseClient } from '@/lib/supabase';

/* ═══════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════ */

export type EmailTriggerType =
  | 'high_intent_upgrade'
  | 'activation_needed'
  | 'feature_discovery'
  | 'stuck_user'
  | 'revenue_ready';

export type EmailTemplateKey =
  | 'upgrade_push'
  | 'activation'
  | 'feature_discovery'
  | 'stuck_help'
  | 'revenue_push';

export interface EmailTrigger {
  visitorId: string;
  email: string;
  triggerType: EmailTriggerType;
  templateKey: EmailTemplateKey;
  subject: string;
  context: EmailContext;
  priority: number;
  reasons: string[];
}

export interface EmailContext {
  userName?: string;
  score?: number;
  band?: string;
  positiveSignals?: string[];
  negativeSignals?: string[];
  topFeatures?: string[];
  missingFeatures?: string[];
  daysInactive?: number;
  pricingVisits?: number;
  workflowFeaturesUsed?: number;
  ctaClicks?: number;
  [key: string]: unknown;
}

export interface EmailTemplate {
  key: EmailTemplateKey;
  subject: (ctx: EmailContext) => string;
  html: (ctx: EmailContext) => string;
  text: (ctx: EmailContext) => string;
}

export interface TriggerResult {
  triggered: EmailTrigger[];
  skipped: { visitorId: string; reason: string }[];
  errors: string[];
}

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */

const RATE_LIMIT_ANY_EMAIL_HOURS = 24;
const RATE_LIMIT_SAME_TRIGGER_HOURS = 72;

const TRIGGER_PRIORITY: Record<EmailTriggerType, number> = {
  high_intent_upgrade: 10,
  revenue_ready: 8,
  activation_needed: 5,
  feature_discovery: 3,
  stuck_user: 1,
};

const TRIGGER_TO_TEMPLATE: Record<EmailTriggerType, EmailTemplateKey> = {
  high_intent_upgrade: 'upgrade_push',
  activation_needed: 'activation',
  feature_discovery: 'feature_discovery',
  stuck_user: 'stuck_help',
  revenue_ready: 'revenue_push',
};

/* ═══════════════════════════════════════════════════
   TRIGGER CLASSIFICATION ENGINE
   ═══════════════════════════════════════════════════ */

interface VisitorSignals {
  visitorId: string;
  email: string;
  userName?: string;
  score: number;
  band: string;
  isMember: boolean;
  positiveSignals: string[];
  negativeSignals: string[];
  // Counts extracted from events
  pricingPageViews: number;
  subscriptionPageViews: number;
  upgradeCtaClicks: number;
  billingActions: number;
  workflowFeaturesUsed: number;
  totalFeatureViews: number;
  uniqueFeatures: string[];
  documentViews: number;
  supportViews: number;
  dashboardViews: number;
  memberPageCount: number;
  totalEvents: number;
  uniqueSessions: number;
  hasBlockedFeedback: boolean;
  daysSinceLastEvent: number;
}

/**
 * Classify a visitor into the best-fit trigger type.
 * Returns null if no trigger is appropriate.
 */
export function classifyVisitor(signals: VisitorSignals): { type: EmailTriggerType; reasons: string[] } | null {
  const { score, band, isMember, pricingPageViews, subscriptionPageViews, upgradeCtaClicks,
    billingActions, workflowFeaturesUsed, uniqueFeatures, documentViews,
    supportViews, dashboardViews, memberPageCount, totalEvents, uniqueSessions,
    hasBlockedFeedback, daysSinceLastEvent } = signals;

  // ── HIGH INTENT UPGRADE ──
  // Score >= 50 AND at least one strong billing signal
  if (score >= 50 && (upgradeCtaClicks >= 1 || subscriptionPageViews >= 1 || billingActions >= 1 || pricingPageViews >= 2)) {
    const reasons: string[] = [];
    if (upgradeCtaClicks >= 1) reasons.push(`clicked upgrade CTA ${upgradeCtaClicks} time(s)`);
    if (subscriptionPageViews >= 1) reasons.push(`viewed subscription page ${subscriptionPageViews} time(s)`);
    if (billingActions >= 1) reasons.push(`${billingActions} billing interaction(s)`);
    if (pricingPageViews >= 2) reasons.push(`visited pricing ${pricingPageViews} times`);
    reasons.push(`upgrade score: ${score} (${band})`);
    return { type: 'high_intent_upgrade', reasons };
  }

  // ── REVENUE READY ──
  // Member with active workflow usage + billing interest
  if (isMember && workflowFeaturesUsed >= 2 && (documentViews >= 1 || billingActions >= 1) && score >= 30) {
    const reasons: string[] = [];
    reasons.push(`using ${workflowFeaturesUsed} workflow features`);
    if (documentViews >= 1) reasons.push(`viewed ${documentViews} document(s)`);
    if (billingActions >= 1) reasons.push('interacted with billing');
    reasons.push(`upgrade score: ${score}`);
    return { type: 'revenue_ready', reasons };
  }

  // ── ACTIVATION NEEDED ──
  // Member who signed up but barely explored (dashboard-only, few events)
  if (isMember && dashboardViews >= 1 && workflowFeaturesUsed === 0 && memberPageCount <= 2 && totalEvents <= 10) {
    const reasons: string[] = [];
    reasons.push('signed up but has not explored workflow features');
    reasons.push(`only visited ${memberPageCount} member page(s)`);
    if (uniqueSessions <= 1) reasons.push('single session only');
    return { type: 'activation_needed', reasons };
  }

  // ── FEATURE DISCOVERY ──
  // Member using some features but not others (partial adoption)
  if (isMember && workflowFeaturesUsed >= 1 && workflowFeaturesUsed <= 3 && uniqueFeatures.length <= 4 && totalEvents >= 5) {
    const allWorkflow = ['leads', 'jobs', 'quotes', 'invoices', 'tasks', 'assets'];
    const missing = allWorkflow.filter((f) => !uniqueFeatures.includes(f));
    if (missing.length >= 2) {
      const reasons: string[] = [];
      reasons.push(`using ${workflowFeaturesUsed} of 6 workflow features`);
      reasons.push(`has not explored: ${missing.slice(0, 3).join(', ')}`);
      return { type: 'feature_discovery', reasons };
    }
  }

  // ── STUCK USER ──
  // Member with support-heavy behaviour, blocked feedback, or settings-only browsing
  if (isMember && (hasBlockedFeedback || (supportViews >= 2 && workflowFeaturesUsed === 0) || (daysSinceLastEvent >= 7 && dashboardViews >= 2 && workflowFeaturesUsed === 0))) {
    const reasons: string[] = [];
    if (hasBlockedFeedback) reasons.push('submitted blocked/stuck feedback');
    if (supportViews >= 2 && workflowFeaturesUsed === 0) reasons.push(`${supportViews} support visits with no feature usage`);
    if (daysSinceLastEvent >= 7) reasons.push(`inactive for ${daysSinceLastEvent} days`);
    return { type: 'stuck_user', reasons };
  }

  // No trigger matched
  return null;
}

/* ═══════════════════════════════════════════════════
   RATE LIMITING + DEDUP
   ═══════════════════════════════════════════════════ */

interface RecentEmail {
  trigger_type: string;
  sent_at: string;
}

/**
 * Check whether we can send an email to this recipient.
 * Returns null if OK, or a skip reason string.
 */
export function checkRateLimits(
  _email: string,
  triggerType: EmailTriggerType,
  recentEmails: RecentEmail[]
): string | null {
  const now = Date.now();

  // Rule 1: No more than 1 email per 24 hours to same recipient
  const anyRecent = recentEmails.find((e) => {
    const sentMs = new Date(e.sent_at).getTime();
    return (now - sentMs) < RATE_LIMIT_ANY_EMAIL_HOURS * 60 * 60 * 1000;
  });
  if (anyRecent) {
    return `rate-limited: email sent within last ${RATE_LIMIT_ANY_EMAIL_HOURS}h`;
  }

  // Rule 2: Same trigger type must have 72h gap
  const sameTriggerRecent = recentEmails.find((e) => {
    if (e.trigger_type !== triggerType) return false;
    const sentMs = new Date(e.sent_at).getTime();
    return (now - sentMs) < RATE_LIMIT_SAME_TRIGGER_HOURS * 60 * 60 * 1000;
  });
  if (sameTriggerRecent) {
    return `dedup: same trigger "${triggerType}" sent within last ${RATE_LIMIT_SAME_TRIGGER_HOURS}h`;
  }

  return null;
}

/* ═══════════════════════════════════════════════════
   EMAIL TEMPLATES
   ═══════════════════════════════════════════════════ */

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── Template type metadata (used by admin UI) ── */
export const TEMPLATE_META: Record<EmailTemplateKey, { type: 'lifecycle'; label: string; previewText: string }> = {
  upgrade_push:     { type: 'lifecycle', label: 'Upgrade Push',      previewText: 'You\u2019re outgrowing your current plan \u2014 see what\u2019s next' },
  activation:       { type: 'lifecycle', label: 'Activation',        previewText: 'Your quotes, invoices, and job management tools are ready' },
  feature_discovery:{ type: 'lifecycle', label: 'Feature Discovery', previewText: 'You\u2019re not using everything available to you' },
  stuck_help:       { type: 'lifecycle', label: 'Stuck Help',        previewText: 'Your workspace is still set up \u2014 pick up where you left off' },
  revenue_push:     { type: 'lifecycle', label: 'Revenue Push',      previewText: 'You\u2019re quoting and invoicing \u2014 time to remove the limits' },
};

/* ─────────────────────────────────────────────────────
   PREMIUM LIFECYCLE EMAIL WRAPPER
   Strong branded header, card layout, premium footer.
   Used for: upgrade_push, activation, feature_discovery,
             stuck_help, revenue_push
   ───────────────────────────────────────────────────── */

function wrapLifecycleEmail(title: string, previewText: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(title)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  body,table,td,a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table,td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }
  body { margin:0; padding:0; width:100%; background-color:#f1f5f9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
<!-- Preview text -->
<div style="display:none;font-size:1px;color:#f1f5f9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(previewText)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;">
<tr><td align="center" style="padding:32px 16px;">

  <!-- Outer container -->
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

    <!-- Branded Header -->
    <tr>
      <td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);border-radius:16px 16px 0 0;padding:36px 40px 28px;text-align:center;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="text-align:center;">
            <span style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">TISSCA</span>
          </td></tr>
          <tr><td style="padding-top:6px;text-align:center;">
            <span style="font-size:11px;font-weight:500;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">Trade Industry Software &amp; Standards</span>
          </td></tr>
        </table>
      </td>
    </tr>

    <!-- Main Card Body -->
    <tr>
      <td style="background-color:#ffffff;padding:36px 40px 32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
        ${body}
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color:#f8fafc;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;border-top:none;padding:24px 40px 28px;text-align:center;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding-bottom:12px;text-align:center;">
            <a href="${BASE_URL}/support" style="color:#64748b;font-size:12px;text-decoration:none;margin:0 8px;">Support</a>
            <span style="color:#cbd5e1;">·</span>
            <a href="${BASE_URL}/app/settings/email-preferences" style="color:#64748b;font-size:12px;text-decoration:none;margin:0 8px;">Email Settings</a>
            <span style="color:#cbd5e1;">·</span>
            <a href="{{unsubscribe_url}}" style="color:#64748b;font-size:12px;text-decoration:none;margin:0 8px;">Unsubscribe</a>
          </td></tr>
          <tr><td style="text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.5;">TISSCA · Trade Industry Software &amp; Standards Compliance Assurance</p>
            <p style="margin:4px 0 0;font-size:11px;color:#94a3b8;">You received this based on your activity on tissca.com</p>
          </td></tr>
        </table>
      </td>
    </tr>

  </table>

</td></tr>
</table>
</body>
</html>`;
}

/* Helper: premium CTA button */
function ctaButton(href: string, label: string, secondary = false): string {
  if (secondary) {
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
      <tr><td style="border-radius:10px;border:2px solid #e2e8f0;">
        <a href="${href}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#334155;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${label}</a>
      </td></tr>
    </table>`;
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
    <tr><td style="border-radius:10px;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);">
      <a href="${href}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${label}</a>
    </td></tr>
  </table>`;
}

/* Helper: info card block */
function infoCard(items: { icon: string; title: string; description: string }[]): string {
  return items.map((item) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
      <tr>
        <td style="width:40px;vertical-align:top;padding-top:2px;font-size:18px;">${item.icon}</td>
        <td style="vertical-align:top;">
          <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#1e293b;">${escapeHtml(item.title)}</p>
          <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">${item.description}</p>
        </td>
      </tr>
    </table>`).join('');
}

/* Helper: activity signals box */
function signalsBox(title: string, signals: string[]): string {
  if (!signals.length) return '';
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
      <tr><td style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;">
        <p style="margin:0 0 10px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(title)}</p>
        ${signals.map((s) => `<p style="margin:0 0 6px;font-size:13px;color:#334155;line-height:1.5;">✓ ${escapeHtml(s)}</p>`).join('')}
      </td></tr>
    </table>`;
}

/* Helper: comparison strip */
function comparisonStrip(): string {
  const plans = [
    { name: 'Free', features: ['5 quotes/month', '5 invoices/month', 'Basic templates'], highlight: false },
    { name: 'Pro', features: ['Unlimited documents', 'Premium branding', 'Priority support'], highlight: true },
    { name: 'Team Starter', features: ['Shared workspace', 'Team permissions', 'Up to 5 users'], highlight: false },
    { name: 'Team Pro', features: ['Advanced reporting', 'Audit trail', 'Unlimited users'], highlight: false },
  ];
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
      <tr>
        ${plans.map((plan) => `
          <td width="25%" style="vertical-align:top;padding:0 3px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${plan.highlight ? '#f59e0b' : '#e2e8f0'};border-radius:10px;${plan.highlight ? 'background-color:#fffbeb;' : 'background-color:#ffffff;'}">
              <tr><td style="padding:12px 8px 8px;text-align:center;border-bottom:1px solid ${plan.highlight ? '#fde68a' : '#e2e8f0'};">
                <span style="font-size:11px;font-weight:700;color:${plan.highlight ? '#d97706' : '#1e293b'};">${plan.name}</span>
              </td></tr>
              <tr><td style="padding:8px 8px 12px;">
                ${plan.features.map((f) => `<p style="margin:0 0 3px;font-size:10px;color:#64748b;line-height:1.4;">✓ ${f}</p>`).join('')}
              </td></tr>
            </table>
          </td>`).join('')}
      </tr>
    </table>`;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.tissca.com';

export const EMAIL_TEMPLATES: Record<EmailTemplateKey, EmailTemplate> = {

  /* ══════════════════════════════════════════════════
     1. UPGRADE PUSH — Lifecycle
     ══════════════════════════════════════════════════ */
  upgrade_push: {
    key: 'upgrade_push',
    subject: (ctx) => ctx.score && ctx.score >= 75
      ? 'Your Free plan is holding you back — see what Pro unlocks'
      : 'You\'re outgrowing Free — TISSCA Pro is built for this',
    html: (ctx) => {
      const greeting = ctx.userName ? `<p style="margin:0 0 20px;font-size:15px;color:#334155;">Hi ${escapeHtml(ctx.userName)},</p>` : '';
      return wrapLifecycleEmail('Upgrade to TISSCA Pro', TEMPLATE_META.upgrade_push.previewText, `
        ${greeting}
        <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">You're running real work through TISSCA — time to remove the limits</h1>
        <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">You've been actively quoting, invoicing, and managing jobs${ctx.workflowFeaturesUsed ? ` across <strong>${ctx.workflowFeaturesUsed} tools</strong>` : ''}. On the Free plan, you're capped at 5 quotes and 5 invoices per month. Pro removes those limits entirely — plus adds branded PDFs and priority support.</p>

        ${signalsBox('Your recent activity', ctx.positiveSignals?.slice(0, 4) || [])}

        ${comparisonStrip()}

        <div style="text-align:center;padding:8px 0 20px;">
          ${ctaButton(`${BASE_URL}/pricing`, 'Upgrade to Pro')}
        </div>
        <div style="text-align:center;padding:0 0 8px;">
          ${ctaButton(`${BASE_URL}/pricing`, 'Compare All Plans', true)}
        </div>
      `);
    },
    text: (ctx) => {
      const lines = [];
      if (ctx.userName) lines.push(`Hi ${ctx.userName},`);
      lines.push('');
      lines.push(`You've been actively quoting, invoicing, and managing jobs${ctx.workflowFeaturesUsed ? ` across ${ctx.workflowFeaturesUsed} tools` : ''}. On the Free plan, you're capped at 5 quotes and 5 invoices per month. Pro removes those limits entirely.`);
      if (ctx.positiveSignals?.length) {
        lines.push('');
        lines.push('YOUR RECENT ACTIVITY');
        ctx.positiveSignals.slice(0, 4).forEach((s) => lines.push(`✓ ${s}`));
      }
      lines.push('');
      lines.push('PLANS');
      lines.push('Free: 5 quotes/month, 5 invoices/month, basic templates');
      lines.push('Pro: Unlimited documents, premium branding, priority support');
      lines.push('Team Starter: Shared workspace, team permissions, up to 5 users');
      lines.push('Team Pro: Advanced reporting, audit trail, unlimited users');
      lines.push('');
      lines.push(`Upgrade to Pro: ${BASE_URL}/pricing`);
      return lines.join('\n');
    },
  },

  /* ══════════════════════════════════════════════════
     2. ACTIVATION — Lifecycle
     ══════════════════════════════════════════════════ */
  activation: {
    key: 'activation',
    subject: () => 'Your quoting and invoicing tools are set up — take a look',
    html: (ctx) => {
      const greeting = ctx.userName ? `<p style="margin:0 0 20px;font-size:15px;color:#334155;">Hi ${escapeHtml(ctx.userName)},</p>` : '';
      return wrapLifecycleEmail('Get Started with TISSCA', TEMPLATE_META.activation.previewText, `
        ${greeting}
        <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">Everything's set up — here's what you can do right now</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">You created your TISSCA account but haven't put your tools to work yet. Whether you need to chase a lead, price a job, or send an invoice — it's all here and ready to go.</p>

        ${infoCard([
          { icon: '📋', title: 'Leads', description: 'Log enquiries, track follow-ups, and convert prospects into jobs' },
          { icon: '🔨', title: 'Jobs', description: 'Organise active projects with status tracking and scheduling' },
          { icon: '📄', title: 'Quotes', description: 'Build and send branded quotes to clients in minutes' },
          { icon: '💷', title: 'Invoices', description: 'Invoice completed work and track what\'s owed' },
        ])}

        <div style="text-align:center;padding:20px 0 12px;">
          ${ctaButton(`${BASE_URL}/app/overview`, 'Open Your Dashboard')}
        </div>

        <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;line-height:1.5;">Most tradespeople send their first quote within 5 minutes of logging in.</p>
      `);
    },
    text: (ctx) => {
      const lines = [];
      if (ctx.userName) lines.push(`Hi ${ctx.userName},`);
      lines.push('');
      lines.push('Everything\'s set up — here\'s what you can do right now.');
      lines.push('');
      lines.push('You created your TISSCA account but haven\'t put your tools to work yet. Whether you need to chase a lead, price a job, or send an invoice — it\'s all here.');
      lines.push('');
      lines.push('📋 Leads — Log enquiries, track follow-ups, convert to jobs');
      lines.push('🔨 Jobs — Organise active projects with status and scheduling');
      lines.push('📄 Quotes — Build and send branded quotes in minutes');
      lines.push('💷 Invoices — Invoice completed work and track what\'s owed');
      lines.push('');
      lines.push(`Open your dashboard: ${BASE_URL}/app/overview`);
      lines.push('');
      lines.push('Most tradespeople send their first quote within 5 minutes of logging in.');
      return lines.join('\n');
    },
  },

  /* ══════════════════════════════════════════════════
     3. FEATURE DISCOVERY — Lifecycle
     ══════════════════════════════════════════════════ */
  feature_discovery: {
    key: 'feature_discovery',
    subject: (ctx) => ctx.missingFeatures && ctx.missingFeatures.length > 0
      ? `You're not using ${ctx.missingFeatures[0]} yet — it could save you time`
      : 'You\'re only using part of what TISSCA offers',
    html: (ctx) => {
      const missing = ctx.missingFeatures || [];
      const featureDescriptions: Record<string, { icon: string; desc: string }> = {
        leads:    { icon: '📋', desc: 'Log enquiries, track follow-ups, and convert prospects into paying jobs' },
        jobs:     { icon: '🔨', desc: 'Organise active projects with status tracking and scheduling' },
        quotes:   { icon: '📄', desc: 'Build and send branded quotes to clients in minutes' },
        invoices: { icon: '💷', desc: 'Invoice completed work and track what\'s owed' },
        tasks:    { icon: '✅', desc: 'Plan your day — track to-dos, call-backs, and site visits' },
        assets:   { icon: '🔧', desc: 'Log your tools, vehicles, and equipment in one place' },
      };
      const greeting = ctx.userName ? `<p style="margin:0 0 20px;font-size:15px;color:#334155;">Hi ${escapeHtml(ctx.userName)},</p>` : '';
      return wrapLifecycleEmail('Discover More Tools', TEMPLATE_META.feature_discovery.previewText, `
        ${greeting}
        <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">You're using ${ctx.workflowFeaturesUsed || 0} of 6 tools — the rest are ready when you are</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">${ctx.topFeatures ? `Good progress with <strong>${ctx.topFeatures.slice(0, 2).map((f) => f.charAt(0).toUpperCase() + f.slice(1)).join('</strong> and <strong>')}</strong>. ` : ''}These tools are already set up in your workspace and could save you time on every job:</p>

        ${missing.length > 0 ? infoCard(missing.slice(0, 3).map((f) => ({
          icon: featureDescriptions[f]?.icon || '→',
          title: f.charAt(0).toUpperCase() + f.slice(1),
          description: featureDescriptions[f]?.desc || 'Available in your workspace now',
        }))) : ''}

        ${signalsBox('What you\'re already using', ctx.topFeatures?.map((f) => f.charAt(0).toUpperCase() + f.slice(1)) || [])}

        <div style="text-align:center;padding:16px 0 8px;">
          ${ctaButton(`${BASE_URL}/app/overview`, 'Explore Your Dashboard')}
        </div>
      `);
    },
    text: (ctx) => {
      const missing = ctx.missingFeatures || [];
      const lines = [];
      if (ctx.userName) lines.push(`Hi ${ctx.userName},`);
      lines.push('');
      lines.push(`You're using ${ctx.workflowFeaturesUsed || 0} of 6 tools — the rest are ready when you are.`);
      lines.push('');
      if (missing.length > 0) {
        lines.push('Tools you haven\'t tried yet:');
        missing.slice(0, 3).forEach((f) => lines.push(`→ ${f.charAt(0).toUpperCase() + f.slice(1)}`));
      }
      if (ctx.topFeatures?.length) {
        lines.push('');
        lines.push('Already using: ' + ctx.topFeatures.map((f) => f.charAt(0).toUpperCase() + f.slice(1)).join(', '));
      }
      lines.push('');
      lines.push(`Explore your dashboard: ${BASE_URL}/app/overview`);
      return lines.join('\n');
    },
  },

  /* ══════════════════════════════════════════════════
     4. STUCK HELP — Lifecycle
     ══════════════════════════════════════════════════ */
  stuck_help: {
    key: 'stuck_help',
    subject: (ctx) => ctx.daysInactive && ctx.daysInactive >= 14
      ? 'Your TISSCA account is still here — pick up where you left off'
      : 'Anything blocking you? We can help',
    html: (ctx) => {
      const greeting = ctx.userName ? `<p style="margin:0 0 20px;font-size:15px;color:#334155;">Hi ${escapeHtml(ctx.userName)},</p>` : '';
      return wrapLifecycleEmail('Pick Up Where You Left Off', TEMPLATE_META.stuck_help.previewText, `
        ${greeting}
        <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">Your account is exactly as you left it</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">${ctx.daysInactive ? `It's been <strong>${ctx.daysInactive} days</strong> since you last logged in. ` : ''}Your data, documents, and settings are all still here — nothing's been lost. If something's not working the way you expected, or you're not sure where to start, here are a few options:</p>

        ${infoCard([
          { icon: '📖', title: 'Help Centre', description: 'Step-by-step guides for quotes, invoices, and job management' },
          { icon: '💬', title: 'Contact Support', description: 'Tell us what you need — we respond within 24 hours' },
          { icon: '🔄', title: 'Your Dashboard', description: 'Jump straight back into your workspace' },
        ])}

        <div style="text-align:center;padding:20px 0 12px;">
          ${ctaButton(`${BASE_URL}/app/overview`, 'Back to Your Dashboard')}
        </div>
        <div style="text-align:center;padding:0 0 8px;">
          ${ctaButton(`${BASE_URL}/support`, 'Contact Support', true)}
        </div>

        <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;text-align:center;line-height:1.5;">No pressure — your account stays active. We just wanted to check in.</p>
      `);
    },
    text: (ctx) => {
      const lines = [];
      if (ctx.userName) lines.push(`Hi ${ctx.userName},`);
      lines.push('');
      lines.push(`Your account is exactly as you left it.${ctx.daysInactive ? ` It's been ${ctx.daysInactive} days since your last login.` : ''}`);
      lines.push('Your data, documents, and settings are all still here.');
      lines.push('');
      lines.push('If you need help getting started:');
      lines.push(`📖 Help Centre: ${BASE_URL}/support`);
      lines.push('💬 Contact Support — we respond within 24 hours');
      lines.push(`🔄 Your Dashboard: ${BASE_URL}/app/overview`);
      lines.push('');
      lines.push('No pressure — your account stays active. We just wanted to check in.');
      return lines.join('\n');
    },
  },

  /* ══════════════════════════════════════════════════
     5. REVENUE PUSH — Lifecycle
     ══════════════════════════════════════════════════ */
  revenue_push: {
    key: 'revenue_push',
    subject: () => 'You\'re sending quotes and invoices — Pro gives you unlimited capacity',
    html: (ctx) => {
      const greeting = ctx.userName ? `<p style="margin:0 0 20px;font-size:15px;color:#334155;">Hi ${escapeHtml(ctx.userName)},</p>` : '';
      return wrapLifecycleEmail('Remove Your Limits', TEMPLATE_META.revenue_push.previewText, `
        ${greeting}
        <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">You're already running jobs through TISSCA</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">You're actively managing work through the platform${ctx.workflowFeaturesUsed ? ` — using <strong>${ctx.workflowFeaturesUsed} tools</strong>` : ''}${ctx.ctaClicks ? ` with <strong>${ctx.ctaClicks} actions</strong> this month` : ''}. You're getting value out of the Free plan — but you'll hit the monthly cap soon. Pro removes that ceiling.</p>

        ${infoCard([
          { icon: '📄', title: 'Unlimited Quotes & Invoices', description: 'No monthly caps — send as many as the work demands' },
          { icon: '🎨', title: 'Branded Documents', description: 'Your logo, colours, and company details on every PDF' },
          { icon: '⚡', title: 'Priority Support', description: 'Faster response times when you need help most' },
          { icon: '📊', title: 'Business Analytics', description: 'See which clients, jobs, and services are performing' },
        ])}

        ${signalsBox('Your current usage', ctx.positiveSignals?.slice(0, 4) || [])}

        <div style="text-align:center;padding:16px 0 12px;">
          ${ctaButton(`${BASE_URL}/pricing`, 'Upgrade to Pro')}
        </div>
        <div style="text-align:center;padding:0 0 8px;">
          ${ctaButton(`${BASE_URL}/pricing`, 'Compare All Plans', true)}
        </div>
      `);
    },
    text: (ctx) => {
      const lines = [];
      if (ctx.userName) lines.push(`Hi ${ctx.userName},`);
      lines.push('');
      lines.push(`You're already running jobs through TISSCA${ctx.workflowFeaturesUsed ? ` — using ${ctx.workflowFeaturesUsed} tools` : ''}.`);
      lines.push('You\'re getting value out of the Free plan, but you\'ll hit the monthly cap soon.');
      lines.push('');
      lines.push('Pro removes the limits:');
      lines.push('✓ Unlimited quotes & invoices');
      lines.push('✓ Branded PDFs with your logo and colours');
      lines.push('✓ Priority support');
      lines.push('✓ Business analytics');
      lines.push('');
      lines.push(`Upgrade to Pro: ${BASE_URL}/pricing`);
      lines.push(`Compare all plans: ${BASE_URL}/pricing`);
      return lines.join('\n');
    },
  },
};

/* ═══════════════════════════════════════════════════
   MAIN TRIGGER PROCESSOR
   ═══════════════════════════════════════════════════ */

/**
 * Process analytics events and upgrade scores to generate email triggers.
 * Checks admin campaign settings, user preferences, rate limits, dedup,
 * and priority before queuing.
 * Returns a summary of what was triggered and what was skipped.
 */
export async function processEmailTriggers(): Promise<TriggerResult> {
  const supabase = createServerSupabaseClient();
  const result: TriggerResult = { triggered: [], skipped: [], errors: [] };

  try {
    // ── 0. Load admin campaign settings ──
    const { data: campaignRows } = await supabase
      .from('email_campaign_settings')
      .select('trigger_type, enabled, priority, min_gap_hours, max_per_day');

    const campaignSettings = new Map<string, { enabled: boolean; priority: number; min_gap_hours: number; max_per_day: number }>();
    (campaignRows || []).forEach((r: Record<string, unknown>) => {
      campaignSettings.set(r.trigger_type as string, {
        enabled: r.enabled as boolean,
        priority: r.priority as number,
        min_gap_hours: r.min_gap_hours as number,
        max_per_day: r.max_per_day as number,
      });
    });

    // ── 0b. Load all user email preferences ──
    const { data: prefRows } = await supabase
      .from('user_email_preferences')
      .select('user_id, product_updates, feature_emails, upgrade_emails, billing_emails, reminder_emails, support_followup, weekly_summary, unsubscribed_all, frequency');

    const userPrefs = new Map<string, Record<string, unknown>>();
    (prefRows || []).forEach((r: Record<string, unknown>) => {
      userPrefs.set(r.user_id as string, r);
    });

    // ── 1. Load recent analytics events (last 30 days) ──
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: events, error: evErr } = await supabase
      .from('analytics_events')
      .select('*')
      .or(`occurred_at.gte.${since},and(occurred_at.is.null,created_at.gte.${since})`)
      .order('occurred_at', { ascending: false, nullsFirst: false })
      .limit(10000);

    if (evErr || !events) {
      result.errors.push(`Failed to load analytics events: ${evErr?.message || 'no data'}`);
      return result;
    }

    // ── 2. Group events by visitor_id ──
    const visitorEvents: Record<string, Record<string, unknown>[]> = {};
    (events as Record<string, unknown>[]).forEach((e) => {
      const vid = e.visitor_id as string | null;
      if (!vid) return;
      if (!visitorEvents[vid]) visitorEvents[vid] = [];
      visitorEvents[vid].push(e);
    });

    // ── 3. Try to match visitors to user emails ──
    // Look for visitors who have member-area activity — they have a real account
    // Match via profiles table using recent sign-in patterns
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .not('email', 'is', null);

    const emailMap = new Map<string, { email: string; name?: string }>();
    // For now, we map visitors by checking if they have member-area events
    // and cross-reference with user profiles that have matching emails
    // In production, visitor_id should be linked to user_id at sign-in time
    if (users) {
      (users as { id: string; email: string; full_name?: string }[]).forEach((u) => {
        if (u.email) emailMap.set(u.id, { email: u.email, name: u.full_name ?? undefined });
      });
    }

    // ── 4. Score and classify each visitor ──
    const triggers: EmailTrigger[] = [];

    for (const [visitorId, vEvents] of Object.entries(visitorEvents)) {
      const signals = extractSignals(visitorId, vEvents);
      if (!signals.email) continue; // Can't email without an address

      const classification = classifyVisitor(signals);
      if (!classification) {
        result.skipped.push({ visitorId, reason: 'no trigger matched' });
        continue;
      }

      const templateKey = TRIGGER_TO_TEMPLATE[classification.type];
      const template = EMAIL_TEMPLATES[templateKey];
      const context = buildEmailContext(signals, classification);

      triggers.push({
        visitorId,
        email: signals.email,
        triggerType: classification.type,
        templateKey,
        subject: template.subject(context),
        context,
        priority: TRIGGER_PRIORITY[classification.type],
        reasons: classification.reasons,
      });
    }

    // ── 5. Sort by priority (highest first) ──
    triggers.sort((a, b) => b.priority - a.priority);

    // ── 6. Campaign settings + user preferences + rate limit + dedup ──
    for (const trigger of triggers) {
      // ── 6a. Check admin campaign setting ──
      const campaign = campaignSettings.get(trigger.triggerType);
      if (campaign && !campaign.enabled) {
        result.skipped.push({ visitorId: trigger.visitorId, reason: `campaign "${trigger.triggerType}" disabled by admin` });
        continue;
      }

      // Use admin-configured priority if available
      if (campaign) {
        trigger.priority = campaign.priority;
      }

      // ── 6b. Check admin template enabled ──
      const { data: dbTemplate } = await supabase
        .from('email_templates')
        .select('enabled')
        .eq('template_key', trigger.templateKey)
        .single();
      if (dbTemplate && dbTemplate.enabled === false) {
        result.skipped.push({ visitorId: trigger.visitorId, reason: `template "${trigger.templateKey}" disabled by admin` });
        continue;
      }

      // ── 6c. Check user email preferences ──
      // Map trigger type → preference field
      const triggerPrefMap: Record<string, string> = {
        high_intent_upgrade: 'upgrade_emails',
        revenue_ready: 'upgrade_emails',
        activation_needed: 'feature_emails',
        feature_discovery: 'feature_emails',
        stuck_user: 'support_followup',
      };
      const prefField = triggerPrefMap[trigger.triggerType];
      const userPref = userPrefs.get(trigger.visitorId);
      if (userPref) {
        // Master unsubscribe
        if (userPref.unsubscribed_all === true) {
          result.skipped.push({ visitorId: trigger.visitorId, reason: 'user unsubscribed from all non-essential emails' });
          continue;
        }
        // Category-specific opt-out
        if (prefField && userPref[prefField] === false) {
          result.skipped.push({ visitorId: trigger.visitorId, reason: `user opted out of "${prefField}"` });
          continue;
        }
      }

      // ── 6d. Rate limit ──
      const gapHours = campaign?.min_gap_hours ?? RATE_LIMIT_SAME_TRIGGER_HOURS;

      // Load recent email history for this recipient
      const { data: recentEmails } = await supabase
        .from('email_history')
        .select('trigger_type, sent_at')
        .eq('email', trigger.email)
        .eq('status', 'sent')
        .gte('sent_at', new Date(Date.now() - gapHours * 60 * 60 * 1000).toISOString())
        .order('sent_at', { ascending: false })
        .limit(10);

      const skipReason = checkRateLimits(
        trigger.email,
        trigger.triggerType,
        (recentEmails || []) as RecentEmail[]
      );

      if (skipReason) {
        result.skipped.push({ visitorId: trigger.visitorId, reason: skipReason });
        continue;
      }

      // Also check if already in queue (pending/processing)
      const { data: existingQueue } = await supabase
        .from('email_queue')
        .select('id')
        .eq('email', trigger.email)
        .in('status', ['pending', 'processing'])
        .limit(1);

      if (existingQueue && existingQueue.length > 0) {
        result.skipped.push({ visitorId: trigger.visitorId, reason: 'already in queue' });
        continue;
      }

      // ── 7. Insert into email_queue ──
      const { error: insertErr } = await supabase.from('email_queue').insert({
        visitor_id: trigger.visitorId,
        email: trigger.email,
        trigger_type: trigger.triggerType,
        template_key: trigger.templateKey,
        subject: trigger.subject,
        context: trigger.context,
        priority: trigger.priority,
        status: 'pending',
        scheduled_at: new Date().toISOString(),
      });

      if (insertErr) {
        result.errors.push(`Failed to queue email for ${trigger.visitorId}: ${insertErr.message}`);
      } else {
        result.triggered.push(trigger);
      }
    }

    return result;
  } catch (err) {
    result.errors.push(`Trigger processing failed: ${err instanceof Error ? err.message : String(err)}`);
    return result;
  }
}

/* ═══════════════════════════════════════════════════
   SIGNAL EXTRACTION
   ═══════════════════════════════════════════════════ */

function getPageGroup(path: string): string {
  if (path.startsWith('/app/') || path === '/dashboard') return 'member';
  if (path === '/sign-in' || path === '/sign-up' || path === '/login' || path === '/register') return 'auth';
  if (path.startsWith('/admin')) return 'admin';
  return 'public';
}

function extractSignals(visitorId: string, events: Record<string, unknown>[]): VisitorSignals {
  const WORKFLOW_FEATURES = new Set(['leads', 'jobs', 'quotes', 'invoices', 'tasks', 'assets']);

  let email = '';
  let userName: string | undefined;
  const uniqueFeatures: string[] = [];
  const featureSet = new Set<string>();
  let pricingPageViews = 0;
  let subscriptionPageViews = 0;
  let upgradeCtaClicks = 0;
  let billingActions = 0;
  let totalFeatureViews = 0;
  let documentViews = 0;
  let supportViews = 0;
  let dashboardViews = 0;
  let hasBlockedFeedback = false;
  const uniqueSessionSet = new Set<string>();
  const memberPaths = new Set<string>();
  let hasMemberActivity = false;

  let latestTs = '';

  events.forEach((e) => {
    const eventType = e.event_type as string;
    const pagePath = e.page_path as string;
    const metadata = e.metadata as Record<string, unknown> | null;
    const sessionId = e.session_id as string | null;
    const ts = (e.occurred_at as string) || (e.created_at as string) || '';

    if (ts > latestTs) latestTs = ts;
    if (sessionId) uniqueSessionSet.add(sessionId);

    if (getPageGroup(pagePath) === 'member') {
      hasMemberActivity = true;
      memberPaths.add(pagePath);
    }

    // Event type counts
    if (eventType === 'page_view' && pagePath === '/pricing') pricingPageViews++;
    if (eventType === 'page_view' && pagePath === '/app/settings/subscription') subscriptionPageViews++;
    if (eventType === 'feature_view' && metadata?.feature === 'subscription') subscriptionPageViews++;
    if (eventType === 'pricing_cta_click') upgradeCtaClicks++;
    if (eventType === 'cta_click' && metadata?.planTier) upgradeCtaClicks++;
    if (eventType === 'billing_action') billingActions++;
    if (eventType === 'feature_view') {
      totalFeatureViews++;
      const feature = metadata?.feature as string | undefined;
      if (feature && !featureSet.has(feature)) {
        featureSet.add(feature);
        uniqueFeatures.push(feature);
      }
    }
    if (eventType === 'document_view') documentViews++;
    if (eventType === 'page_view' && pagePath === '/support') supportViews++;
    if (eventType === 'page_view' && (pagePath === '/dashboard' || pagePath === '/app/overview')) dashboardViews++;
    if (eventType === 'feedback_submit' && metadata?.isBlocked === true) hasBlockedFeedback = true;
  });

  const workflowFeaturesUsed = uniqueFeatures.filter((f) => WORKFLOW_FEATURES.has(f)).length;
  const daysSinceLastEvent = latestTs
    ? Math.floor((Date.now() - new Date(latestTs).getTime()) / (24 * 60 * 60 * 1000))
    : 999;

  // Compute a basic upgrade score inline (mirrors route.ts scoreVisitor logic)
  let rawScore = 0;
  if (pricingPageViews >= 3) rawScore += 18; else if (pricingPageViews >= 1) rawScore += 8;
  if (subscriptionPageViews >= 2) rawScore += 20; else if (subscriptionPageViews >= 1) rawScore += 12;
  if (upgradeCtaClicks >= 2) rawScore += 25; else if (upgradeCtaClicks >= 1) rawScore += 18;
  if (billingActions >= 1) rawScore += 15;
  if (workflowFeaturesUsed >= 4) rawScore += 15; else if (workflowFeaturesUsed >= 2) rawScore += 8; else if (workflowFeaturesUsed >= 1) rawScore += 4;
  if (documentViews >= 2) rawScore += 8; else if (documentViews >= 1) rawScore += 4;
  if (memberPaths.size >= 5) rawScore += 10; else if (memberPaths.size >= 3) rawScore += 5;
  if (uniqueSessionSet.size >= 3) rawScore += 10; else if (uniqueSessionSet.size >= 2) rawScore += 5;
  if (hasMemberActivity) rawScore += 5;
  if (events.length <= 2) rawScore -= 15;
  if (!hasMemberActivity && pricingPageViews === 0 && upgradeCtaClicks === 0) rawScore = Math.round(rawScore * 0.6);
  const score = Math.max(0, Math.min(100, rawScore));
  const band = score >= 75 ? 'very_high' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low';

  const positiveSignals: string[] = [];
  const negativeSignals: string[] = [];
  if (pricingPageViews >= 1) positiveSignals.push(`visited pricing ${pricingPageViews} time(s)`);
  if (upgradeCtaClicks >= 1) positiveSignals.push(`clicked upgrade CTA ${upgradeCtaClicks} time(s)`);
  if (subscriptionPageViews >= 1) positiveSignals.push(`viewed subscription page`);
  if (billingActions >= 1) positiveSignals.push(`${billingActions} billing interaction(s)`);
  if (workflowFeaturesUsed >= 1) positiveSignals.push(`using ${workflowFeaturesUsed} workflow features`);
  if (events.length <= 3) negativeSignals.push('very few events');
  if (hasBlockedFeedback) negativeSignals.push('submitted blocked feedback');

  return {
    visitorId,
    email,
    userName,
    score,
    band,
    isMember: hasMemberActivity,
    positiveSignals,
    negativeSignals,
    pricingPageViews,
    subscriptionPageViews,
    upgradeCtaClicks,
    billingActions,
    workflowFeaturesUsed,
    totalFeatureViews,
    uniqueFeatures,
    documentViews,
    supportViews,
    dashboardViews,
    memberPageCount: memberPaths.size,
    totalEvents: events.length,
    uniqueSessions: uniqueSessionSet.size,
    hasBlockedFeedback,
    daysSinceLastEvent,
  };
}

/* ═══════════════════════════════════════════════════
   CONTEXT BUILDER
   ═══════════════════════════════════════════════════ */

function buildEmailContext(
  signals: VisitorSignals,
  classification: { type: EmailTriggerType; reasons: string[] }
): EmailContext {
  const WORKFLOW_FEATURES = ['leads', 'jobs', 'quotes', 'invoices', 'tasks', 'assets'];
  const missing = WORKFLOW_FEATURES.filter((f) => !signals.uniqueFeatures.includes(f));

  return {
    userName: signals.userName,
    score: signals.score,
    band: signals.band,
    positiveSignals: signals.positiveSignals,
    negativeSignals: signals.negativeSignals,
    topFeatures: signals.uniqueFeatures.slice(0, 5),
    missingFeatures: missing,
    daysInactive: signals.daysSinceLastEvent,
    pricingVisits: signals.pricingPageViews,
    workflowFeaturesUsed: signals.workflowFeaturesUsed,
    ctaClicks: signals.upgradeCtaClicks,
    triggerType: classification.type,
    triggerReasons: classification.reasons,
  };
}
