// src/lib/admin-notifications.ts
//
// Server-side helpers for the Phase 2 platform notification system.
//
// PUBLIC API:
//   createFeedbackNotification(feedback)  — call from POST /api/feedback after insert
//   createPlatformEvent(input)            — generic event insertion
//   fanOutAdminNotifications(eventId, targetRoles) — fan-out to staff inbox
//
// All functions use the service-role Supabase client (createServerSupabaseClient).
// All functions are non-fatal: they log failures but never throw to the caller.
// Safe to call from user-facing API routes without affecting response success.

import { createServerSupabaseClient } from '@/lib/supabase';
import type { FeedbackSubmission } from '@/utils/feedback';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type EventSource   = 'system' | 'webhook' | 'api' | 'cron' | 'user_action';
export type EventModule   =
  | 'feedback' | 'crm' | 'invoices' | 'quotes' | 'planner' | 'chat'
  | 'sync' | 'subscription' | 'admin' | 'release' | 'ai' | 'accountant';

export interface CreatePlatformEventInput {
  module:          EventModule;
  event_type:      string;
  severity:        EventSeverity;
  source:          EventSource;
  workspace_id?:   string | null;
  user_id?:        string | null;
  actor_staff_id?: string | null;
  title:           string;
  body?:           string | null;
  metadata?:       Record<string, unknown>;
  entity_type?:    string | null;
  entity_id?:      string | null;
  deep_link?:      string | null;
  idempotency_key?: string | null;
}

// Staff roles that receive new-feedback notifications
const FEEDBACK_NOTIFICATION_ROLES = ['superadmin', 'admin'] as const;

// ─── createPlatformEvent ─────────────────────────────────────────────────────

/**
 * Insert a row into public.platform_events.
 * Returns the new event UUID on success, or null on failure / duplicate key.
 */
export async function createPlatformEvent(
  input: CreatePlatformEventInput,
): Promise<string | null> {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('platform_events')
      .insert({
        module:          input.module,
        event_type:      input.event_type,
        severity:        input.severity,
        source:          input.source,
        workspace_id:    input.workspace_id    ?? null,
        user_id:         input.user_id         ?? null,
        actor_staff_id:  input.actor_staff_id  ?? null,
        title:           input.title,
        body:            input.body            ?? null,
        metadata:        input.metadata        ?? {},
        entity_type:     input.entity_type     ?? null,
        entity_id:       input.entity_id       ?? null,
        deep_link:       input.deep_link       ?? null,
        idempotency_key: input.idempotency_key ?? null,
      })
      .select('id')
      .single();

    if (error) {
      // 23505 = unique_violation — duplicate idempotency_key means event was already created
      if (error.code === '23505') {
        console.log(
          '[admin-notifications] createPlatformEvent: duplicate idempotency_key, skipping:',
          input.idempotency_key,
        );
        return null;
      }
      console.error('[admin-notifications] createPlatformEvent failed:', error.message, {
        module:          input.module,
        event_type:      input.event_type,
        idempotency_key: input.idempotency_key,
      });
      return null;
    }

    return (data as { id: string }).id ?? null;
  } catch (err) {
    console.error('[admin-notifications] createPlatformEvent threw:', err);
    return null;
  }
}

// ─── fanOutAdminNotifications ─────────────────────────────────────────────────

/**
 * Fan-out a platform_event to active staff members with the specified roles.
 * Inserts one admin_notifications row per qualifying staff member.
 * Individual insert failures are logged but do not abort the operation.
 */
export async function fanOutAdminNotifications(
  eventId: string,
  targetRoles: readonly string[],
): Promise<void> {
  try {
    const supabase = createServerSupabaseClient();

    const { data: staffList, error: staffError } = await supabase
      .from('tissca_staff')
      .select('user_id')
      .in('role', targetRoles as string[])
      .eq('is_active', true);

    if (staffError) {
      console.error(
        '[admin-notifications] fanOutAdminNotifications: staff lookup failed:',
        staffError.message,
      );
      return;
    }

    if (!staffList || staffList.length === 0) {
      console.log(
        '[admin-notifications] fanOutAdminNotifications: no active staff for roles:',
        targetRoles,
      );
      return;
    }

    const rows = (staffList as { user_id: string }[]).map((s) => ({
      event_id:      eventId,
      staff_user_id: s.user_id,
    }));

    const { error: insertError } = await supabase
      .from('admin_notifications')
      .insert(rows);

    if (insertError) {
      console.error(
        '[admin-notifications] fanOutAdminNotifications: insert failed:',
        insertError.message,
        { event_id: eventId, staff_count: rows.length },
      );
    }
  } catch (err) {
    console.error('[admin-notifications] fanOutAdminNotifications threw:', err);
  }
}

// ─── Severity mapping ─────────────────────────────────────────────────────────

function feedbackToSeverity(feedback: FeedbackSubmission): EventSeverity {
  if (feedback.severity === 'critical')                              return 'critical';
  if (feedback.type === 'cancellation')                             return 'high';
  if (feedback.type === 'issue' && feedback.isBlocked === true)     return 'high';
  if (feedback.type === 'issue')                                    return 'medium';
  if (feedback.type === 'suggestion')                               return 'medium';
  if (feedback.type === 'help')                                     return 'low';
  if (feedback.type === 'review')                                   return 'info';
  return 'medium';
}

// ─── createFeedbackNotification ───────────────────────────────────────────────

/**
 * Create a platform_events row + admin_notifications fan-out for a new feedback submission.
 *
 * Designed to be called from POST /api/feedback after successful DB insert.
 * Entirely non-fatal: logs failures but never throws.
 * Uses idempotency_key `feedback.new.{id}` to prevent double-creation on retry.
 */
export async function createFeedbackNotification(
  feedback: FeedbackSubmission,
): Promise<void> {
  try {
    const severity = feedbackToSeverity(feedback);

    const eventId = await createPlatformEvent({
      module:     'feedback',
      event_type: 'feedback.new',
      severity,
      source:     'api',
      workspace_id:    feedback.workspaceId ?? null,
      user_id:         feedback.userId     ?? null,
      title:      feedback.headline,
      // Store a preview of the description (max 500 chars) to keep the event row lean
      body:       feedback.description ? feedback.description.slice(0, 500) : null,
      metadata: {
        feedback_type:     feedback.type,
        platform:          feedback.platform         ?? 'web',
        app_version:       feedback.appVersion       ?? null,
        alpha_tester:      feedback.alphaTester      ?? false,
        has_email:         Boolean(feedback.userEmail),
        screenshots_count: feedback.screenshots?.length ?? 0,
        section:           feedback.section,
        feedback_severity: feedback.severity,
      },
      entity_type:     'feedback',
      entity_id:       feedback.id,
      deep_link:       `/admin/feedback/${feedback.id}`,
      idempotency_key: `feedback.new.${feedback.id}`,
    });

    if (!eventId) {
      // Duplicate idempotency_key or insert error — skip fan-out safely
      return;
    }

    await fanOutAdminNotifications(eventId, FEEDBACK_NOTIFICATION_ROLES);
  } catch (err) {
    // Non-fatal: feedback submission must still succeed even if notification creation fails
    console.warn('[admin-notifications] createFeedbackNotification failed (non-fatal):', err);
  }
}
