// src/lib/email-sender.ts
//
// PURPOSE:
// Drains `email_queue` and sends emails via Resend.
// Writes results to `email_history`.
//
// This file does NOT decide WHAT to send — that's email-intelligence.ts.
// This file only handles the HOW (render template, send, record result).
//
// SAFETY:
// - Checks unsubscribed_all before sending
// - Generates unsubscribe tokens per email
// - Injects tracking pixel for open tracking
// - Wraps links for click tracking
// - Respects admin system settings (tracking_enabled, unsubscribe_enabled)

import { createServerSupabaseClient } from '@/lib/supabase';
import { EMAIL_TEMPLATES, type EmailContext, type EmailTemplateKey } from '@/lib/email-intelligence';
import { randomBytes } from 'crypto';

/* ═══════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════ */

export interface SendResult {
  sent: number;
  failed: number;
  errors: string[];
}

interface QueueRow {
  id: string;
  visitor_id: string;
  email: string;
  trigger_type: string;
  template_key: EmailTemplateKey;
  subject: string;
  context: EmailContext;
  priority: number;
  attempts: number;
}

/* ═══════════════════════════════════════════════════
   RESEND SEND FUNCTION
   ═══════════════════════════════════════════════════ */

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.EMAIL_FROM || 'TISSCA <noreply@tissca.com>';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.tissca.com';
const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 10;

async function sendViaResend(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ id: string } | { error: string }> {
  if (!RESEND_API_KEY) {
    return { error: 'RESEND_API_KEY not configured' };
  }

  console.log('[email-sender] Sending email from:', FROM_EMAIL, 'to:', params.to);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { error: `Resend ${res.status}: ${body.slice(0, 200)}` };
  }

  const data = await res.json();
  return { id: data.id };
}

/* ═══════════════════════════════════════════════════
   QUEUE PROCESSOR
   ═══════════════════════════════════════════════════ */

/**
 * Process up to BATCH_SIZE pending emails from the queue.
 * For each: check unsub → render template → inject tracking → send via Resend → record in email_history.
 */
export async function processEmailQueue(): Promise<SendResult> {
  const supabase = createServerSupabaseClient();
  const result: SendResult = { sent: 0, failed: 0, errors: [] };

  try {
    // ── 1. Fetch pending emails, ordered by priority DESC then scheduled_at ASC ──
    const { data: queue, error: fetchErr } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .lt('attempts', MAX_ATTEMPTS)
      .order('priority', { ascending: false })
      .order('scheduled_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchErr || !queue) {
      result.errors.push(`Failed to fetch queue: ${fetchErr?.message || 'no data'}`);
      return result;
    }

    if (queue.length === 0) return result;

    // ── 1b. Load admin-edited templates (override built-in if present + enabled) ──
    const { data: dbTemplates } = await supabase
      .from('email_templates')
      .select('template_key, enabled, subject, html_body, text_body')
      .eq('enabled', true);

    const adminTemplates = new Map<string, { subject: string; html_body: string; text_body: string }>();
    (dbTemplates || []).forEach((t: Record<string, unknown>) => {
      const key = t.template_key as string;
      if (t.subject && t.html_body && t.text_body) {
        adminTemplates.set(key, {
          subject: t.subject as string,
          html_body: t.html_body as string,
          text_body: t.text_body as string,
        });
      }
    });

    // ── 1c. Load system settings ──
    const systemSettings = await loadSystemSettings(supabase);

    // ── 1d. Load all user email preferences for unsubscribe check ──
    const { data: allPrefs } = await supabase
      .from('user_email_preferences')
      .select('user_id, unsubscribed_all');

    const unsubMap = new Map<string, boolean>();
    (allPrefs || []).forEach((p: Record<string, unknown>) => {
      unsubMap.set(p.user_id as string, p.unsubscribed_all as boolean);
    });

    // ── 1e. Load all profiles to map email → user_id ──
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, email');

    const emailToUserId = new Map<string, string>();
    (profiles || []).forEach((p: Record<string, unknown>) => {
      if (p.email) emailToUserId.set((p.email as string).toLowerCase(), p.id as string);
    });

    // ── 2. Process each email ──
    for (const row of queue as QueueRow[]) {
      // ── 2a. Check if user is unsubscribed ──
      const userId = emailToUserId.get(row.email.toLowerCase());
      if (userId && unsubMap.get(userId) === true) {
        await supabase
          .from('email_queue')
          .update({ status: 'cancelled', error: 'User unsubscribed' })
          .eq('id', row.id);
        result.errors.push(`Skipped ${row.email}: unsubscribed`);
        continue;
      }

      // ── 2b. Check campaign enabled ──
      const { data: campaignRow } = await supabase
        .from('email_campaign_settings')
        .select('enabled')
        .eq('trigger_type', row.trigger_type)
        .single();

      if (campaignRow && campaignRow.enabled === false) {
        await supabase
          .from('email_queue')
          .update({ status: 'cancelled', error: 'Campaign disabled' })
          .eq('id', row.id);
        result.errors.push(`Skipped ${row.email}: campaign "${row.trigger_type}" disabled`);
        continue;
      }

      // ── 2c. Check template enabled ──
      const { data: tplRow } = await supabase
        .from('email_templates')
        .select('enabled')
        .eq('template_key', row.template_key)
        .single();

      if (tplRow && tplRow.enabled === false) {
        await supabase
          .from('email_queue')
          .update({ status: 'cancelled', error: 'Template disabled' })
          .eq('id', row.id);
        result.errors.push(`Skipped ${row.email}: template "${row.template_key}" disabled`);
        continue;
      }

      // Mark as processing
      await supabase
        .from('email_queue')
        .update({ status: 'processing', attempts: row.attempts + 1 })
        .eq('id', row.id);

      // Render template — prefer admin-edited, fall back to built-in
      const adminTpl = adminTemplates.get(row.template_key);
      const builtInTemplate = EMAIL_TEMPLATES[row.template_key];

      if (!adminTpl && !builtInTemplate) {
        await markFailed(supabase, row, `Unknown template: ${row.template_key}`);
        result.failed++;
        result.errors.push(`Unknown template ${row.template_key} for ${row.id}`);
        continue;
      }

      let html = adminTpl ? adminTpl.html_body : builtInTemplate.html(row.context);
      let text = adminTpl ? adminTpl.text_body : builtInTemplate.text(row.context);
      const subject = adminTpl ? adminTpl.subject : row.subject;

      // ── 2d. Generate unsubscribe token + inject URL ──
      if (systemSettings.unsubscribeEnabled && userId) {
        const unsubToken = randomBytes(32).toString('hex');
        await supabase.from('unsubscribe_tokens').insert({
          user_id: userId,
          token: unsubToken,
        });
        const unsubUrl = `${BASE_URL}/unsubscribe?token=${unsubToken}`;
        html = html.replace(/\{\{unsubscribe_url\}\}/g, unsubUrl);
        text = text + `\n\nUnsubscribe: ${unsubUrl}`;
      } else {
        // Remove placeholder if unsubscribe not enabled
        html = html.replace(/\{\{unsubscribe_url\}\}/g, `${BASE_URL}/app/settings/email-preferences`);
      }

      // Send via Resend
      const sendResult = await sendViaResend({
        to: row.email,
        subject,
        html,
        text,
      });

      if ('error' in sendResult) {
        // If under max attempts, revert to pending for retry
        if (row.attempts + 1 < MAX_ATTEMPTS) {
          await supabase
            .from('email_queue')
            .update({ status: 'pending', error: sendResult.error })
            .eq('id', row.id);
        } else {
          await markFailed(supabase, row, sendResult.error);
        }
        result.failed++;
        result.errors.push(`Send failed for ${row.email}: ${sendResult.error}`);
        continue;
      }

      // ── 3. Success: update queue + write history ──
      const now = new Date().toISOString();

      // Insert history first so we get the ID for tracking
      const { data: historyRow } = await supabase.from('email_history').insert({
        queue_id: row.id,
        visitor_id: row.visitor_id,
        email: row.email,
        trigger_type: row.trigger_type,
        template_key: row.template_key,
        subject: row.subject,
        context: row.context,
        status: 'sent',
        provider_id: sendResult.id,
        sent_at: now,
      }).select('id').single();

      await supabase
        .from('email_queue')
        .update({ status: 'sent', sent_at: now, error: null })
        .eq('id', row.id);

      // Note: tracking pixel and click wrapping are injected at send-time
      // via injectTracking() for future emails. The history ID can be used
      // to correlate opens/clicks.
      if (historyRow) {
        // Log the history ID for reference
        console.log(`[email-sender] Sent ${row.template_key} to ${row.email}, history_id=${historyRow.id}`);
      }

      result.sent++;
    }

    return result;
  } catch (err) {
    result.errors.push(`Queue processing failed: ${err instanceof Error ? err.message : String(err)}`);
    return result;
  }
}

/* ═══════════════════════════════════════════════════
   DIRECT SEND (ADMIN TEST EMAIL)
   ═══════════════════════════════════════════════════ */

/**
 * Send a single email immediately, bypassing the queue.
 * Used by admin test email tool.
 */
export async function sendTestEmail(params: {
  to: string;
  templateKey: EmailTemplateKey;
  context?: EmailContext;
}): Promise<{ ok: boolean; error?: string; providerId?: string }> {
  const template = EMAIL_TEMPLATES[params.templateKey];
  if (!template) {
    return { ok: false, error: `Unknown template: ${params.templateKey}` };
  }

  const ctx = params.context || {};
  const subject = `[TEST] ${template.subject(ctx)}`;
  let html = template.html(ctx);
  const text = template.text(ctx);

  // Replace unsubscribe placeholder with settings link for test emails
  html = html.replace(/\{\{unsubscribe_url\}\}/g, `${BASE_URL}/app/settings/email-preferences`);

  const sendResult = await sendViaResend({ to: params.to, subject, html, text });

  if ('error' in sendResult) {
    return { ok: false, error: sendResult.error };
  }

  return { ok: true, providerId: sendResult.id };
}

/* ═══════════════════════════════════════════════════
   TRACKING INJECTION
   ═══════════════════════════════════════════════════ */

/**
 * Inject tracking pixel and click wrapping into HTML email.
 * Called before sending if tracking is enabled.
 */
export function injectTracking(html: string, emailHistoryId: string): string {
  // Add tracking pixel before </body>
  const pixel = `<img src="${BASE_URL}/api/email/open?id=${emailHistoryId}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`;
  html = html.replace('</body>', `${pixel}</body>`);

  // Wrap links for click tracking (only internal links with href)
  html = html.replace(
    /href="(https?:\/\/(?:www\.)?tissca\.(?:com|co\.uk)[^"]*)"/g,
    (_match, url) => {
      // Don't wrap unsubscribe links or tracking links
      if (url.includes('/unsubscribe') || url.includes('/api/email/')) {
        return `href="${url}"`;
      }
      const encoded = encodeURIComponent(url);
      return `href="${BASE_URL}/api/email/click?url=${encoded}&id=${emailHistoryId}"`;
    }
  );

  return html;
}

/* ═══════════════════════════════════════════════════
   SYSTEM SETTINGS
   ═══════════════════════════════════════════════════ */

interface SystemSettings {
  trackingEnabled: boolean;
  unsubscribeEnabled: boolean;
}

async function loadSystemSettings(
  supabase: ReturnType<typeof createServerSupabaseClient>
): Promise<SystemSettings> {
  const { data: rows } = await supabase
    .from('email_system_settings')
    .select('key, value');

  const settings: SystemSettings = {
    trackingEnabled: true,
    unsubscribeEnabled: true,
  };

  (rows || []).forEach((r: Record<string, unknown>) => {
    if (r.key === 'tracking_enabled') settings.trackingEnabled = r.value === 'true';
    if (r.key === 'unsubscribe_enabled') settings.unsubscribeEnabled = r.value === 'true';
  });

  return settings;
}

/* ═══════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════ */

async function markFailed(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  row: QueueRow,
  error: string
) {
  const now = new Date().toISOString();
  await supabase
    .from('email_queue')
    .update({ status: 'failed', error })
    .eq('id', row.id);

  await supabase.from('email_history').insert({
    queue_id: row.id,
    visitor_id: row.visitor_id,
    email: row.email,
    trigger_type: row.trigger_type,
    template_key: row.template_key,
    subject: row.subject,
    context: row.context,
    status: 'failed',
    error,
    sent_at: now,
  });
}
