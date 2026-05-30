import { addFeedbackSubmission, getAllFeedback, filterFeedback, type FeedbackSubmission, type FeedbackFilter, type FeedbackSeverity, type FeedbackReproducibility } from '@/utils/feedback';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { createFeedbackNotification } from '@/lib/admin-notifications';

export const dynamic = 'force-dynamic';

// Rate limiter: 10 submissions per IP per minute (generous for legitimate users)
const feedbackLimiter = rateLimit({ interval: 60_000, limit: 10 });

/** Extract Bearer token from Authorization header */
function extractBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get('Authorization');
  if (!auth) return null;
  const [type, token] = auth.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token.trim();
}

/** Verify caller is active platform staff. Returns staffRecord on success. */
async function requirePlatformStaff(req: NextRequest) {
  const token = extractBearerToken(req);
  if (!token) return { error: 'Unauthorized', status: 401 as const };

  const supabase = createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return { error: 'Unauthorized', status: 401 as const };

  const { data: staffRecord, error: staffError } = await supabase
    .from('tissca_staff')
    .select('role, is_active')
    .eq('user_id', user.id)
    .maybeSingle();

  if (staffError) return { error: 'Staff evaluation failed', status: 500 as const };
  if (!staffRecord?.is_active) return { error: 'Forbidden', status: 403 as const };

  return { supabase, user };
}

/**
 * Persist a feedback submission to the Supabase `feedback` table.
 * Falls back to in-memory store if the table doesn't exist or write fails.
 */
async function persistFeedback(submission: FeedbackSubmission): Promise<void> {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from('feedback').insert({
      id: submission.id,
      type: submission.type,
      status: submission.status,
      section: submission.section,
      headline: submission.headline,
      description: submission.description,
      user_email: submission.userEmail ?? null,
      url: submission.url,
      device_type: submission.deviceType,
      user_agent: submission.userAgent ?? null,
      rating: submission.rating ?? null,
      cancellation_reasons: submission.cancellationReasons ?? null,
      cancellation_context: submission.cancellationContext ?? null,
      is_blocked: submission.isBlocked ?? null,
      internal_notes: submission.internalNotes ?? null,
      created_at: submission.createdAt,
      updated_at: submission.updatedAt,
      // Phase 1 columns
      user_id: submission.userId ?? null,
      workspace_id: submission.workspaceId ?? null,
      platform: submission.platform ?? 'web',
      app_version: submission.appVersion ?? null,
      build_number: submission.buildNumber ?? null,
      os_version: submission.osVersion ?? null,
      device_model: submission.deviceModel ?? null,
      screenshots: submission.screenshots ?? null,
      alpha_tester: submission.alphaTester ?? false,
      // Phase 4
      severity: submission.severity ?? 'medium',
      reproducibility: submission.reproducibility ?? null,
      status_changed_at: submission.statusChangedAt ?? null,
      fixed_in_version: submission.fixedInVersion ?? null,
      duplicate_of_id: submission.duplicateOfId ?? null,
    });
    if (error) {
      console.warn('[Feedback API] DB insert failed, using in-memory fallback:', error.message);
      addFeedbackSubmission(submission);
    }
  } catch {
    // Fallback to in-memory
    addFeedbackSubmission(submission);
  }
}

/**
 * Read all feedback from Supabase `feedback` table.
 * Falls back to in-memory store if the table doesn't exist.
 */
async function readAllFeedback(filters?: FeedbackFilter): Promise<FeedbackSubmission[]> {
  try {
    const supabase = createServerSupabaseClient();
    let query = supabase.from('feedback').select('*').order('created_at', { ascending: false });

    if (filters?.type) query = query.eq('type', filters.type);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.section) query = query.eq('section', filters.section);
    if (filters?.severity) query = query.eq('severity', filters.severity);
    if (filters?.platform) query = query.eq('platform', filters.platform);
    if (filters?.alphaTester !== undefined) query = query.eq('alpha_tester', filters.alphaTester);

    const { data, error } = await query;
    if (error || !data) {
      console.warn('[Feedback API] DB read failed, using in-memory fallback:', error?.message);
      return filters ? filterFeedback(filters) : getAllFeedback();
    }

    return (data as Record<string, unknown>[]).map((row) => ({
      id: String(row.id ?? ''),
      type: String(row.type ?? 'help') as FeedbackSubmission['type'],
      status: String(row.status ?? 'new') as FeedbackSubmission['status'],
      section: String(row.section ?? 'other') as FeedbackSubmission['section'],
      headline: String(row.headline ?? ''),
      description: String(row.description ?? ''),
      userEmail: (row.user_email as string) ?? undefined,
      url: String(row.url ?? ''),
      timestamp: String(row.created_at ?? ''),
      deviceType: String(row.device_type ?? 'desktop') as FeedbackSubmission['deviceType'],
      userAgent: (row.user_agent as string) ?? undefined,
      rating: (row.rating as number) ?? undefined,
      cancellationReasons: (row.cancellation_reasons as string[]) ?? undefined,
      cancellationContext: (row.cancellation_context as string as FeedbackSubmission['cancellationContext']) ?? undefined,
      isBlocked: row.is_blocked === true ? true : row.is_blocked === false ? false : undefined,
      internalNotes: (row.internal_notes as string) ?? undefined,
      createdAt: String(row.created_at ?? ''),
      updatedAt: String(row.updated_at ?? ''),
      // Phase 1
      userId: (row.user_id as string) ?? undefined,
      workspaceId: (row.workspace_id as string) ?? undefined,
      platform: (row.platform as FeedbackSubmission['platform']) ?? 'web',
      appVersion: (row.app_version as string) ?? undefined,
      buildNumber: (row.build_number as string) ?? undefined,
      osVersion: (row.os_version as string) ?? undefined,
      deviceModel: (row.device_model as string) ?? undefined,
      screenshots: (row.screenshots as string[]) ?? undefined,
      alphaTester: row.alpha_tester === true,
      adminReply: (row.admin_reply as string) ?? undefined,
      repliedAt: (row.replied_at as string) ?? undefined,
      triageTags: (row.triage_tags as string[]) ?? undefined,
      // Phase 4
      severity: (row.severity as FeedbackSeverity) ?? 'medium',
      reproducibility: (row.reproducibility as FeedbackReproducibility) ?? undefined,
      statusChangedAt: (row.status_changed_at as string) ?? undefined,
      fixedInVersion: (row.fixed_in_version as string) ?? undefined,
      duplicateOfId: (row.duplicate_of_id as string) ?? undefined,
    }));
  } catch {
    return filters ? filterFeedback(filters) : getAllFeedback();
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip = getClientIp(request);
    if (!feedbackLimiter.check(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body: FeedbackSubmission = await request.json();

    // Validate required fields
    if (!body.type || !body.headline || !body.description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate enum values at boundary
    const validTypes = ['help', 'issue', 'suggestion', 'review', 'cancellation'];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // Validate platform — must be one of the allowed values (or absent → defaults to 'web')
    const validPlatforms = ['web', 'android', 'ios', 'api'];
    const incomingPlatform = body.platform ?? 'web';
    if (!validPlatforms.includes(incomingPlatform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    // Validate screenshots — must be an array of strings, max 10, each ≤ 2048 chars
    if (body.screenshots !== undefined) {
      if (!Array.isArray(body.screenshots)) {
        return NextResponse.json({ error: 'screenshots must be an array' }, { status: 400 });
      }
      if (body.screenshots.length > 10) {
        return NextResponse.json({ error: 'screenshots: max 10 items allowed' }, { status: 400 });
      }
      for (const s of body.screenshots) {
        if (typeof s !== 'string' || s.length > 2048) {
          return NextResponse.json({ error: 'screenshots: each item must be a string ≤ 2048 chars' }, { status: 400 });
        }
      }
    }

    // Extract user identity from Bearer token when present (optional auth).
    // SECURITY: user_id and workspace_id are NEVER taken from the client body —
    // they are always derived server-side from the validated token.
    let userId: string | undefined;
    let workspaceId: string | undefined;
    const token = extractBearerToken(request);
    if (token) {
      try {
        const supabase = createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          userId = user.id;
          // Best-effort workspace lookup
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('workspace_id')
            .eq('user_id', user.id)
            .maybeSingle();
          workspaceId = (profile?.workspace_id as string) ?? undefined;
        }
      } catch {
        // Non-fatal — anonymous submission is still valid
      }
    }

    // Add user agent from request headers
    const userAgent = request.headers.get('user-agent') || undefined;
    const submission: FeedbackSubmission = {
      ...body,
      userAgent,
      platform: incomingPlatform,
      // Always use server-derived identity — never trust client-supplied user_id/workspace_id
      userId,
      workspaceId,
      updatedAt: new Date().toISOString(),
    };

    // Persist to DB (falls back to in-memory)
    await persistFeedback(submission);
    console.log(`[POST /api/feedback] Feedback persisted: id=${submission.id} type=${submission.type}`);

    // Phase 2: emit platform_event + fan-out admin_notifications.
    // IMPORTANT: must be AWAITED (not fire-and-forget) so the serverless function
    // stays alive to complete the Supabase writes before Vercel freezes the context.
    // The try/catch ensures feedback still returns success if notification fails.
    try {
      await createFeedbackNotification(submission);
    } catch (err) {
      console.warn('[POST /api/feedback] Notification emission failed (non-fatal):', err);
    }

    return NextResponse.json({
      success: true,
      id: submission.id,
      message: 'Feedback submitted successfully',
    });
  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Admin-only: require valid platform staff token
    const auth = await requirePlatformStaff(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as FeedbackSubmission['type'] | null;
    const status = searchParams.get('status') as FeedbackSubmission['status'] | null;
    const section = searchParams.get('section') as FeedbackSubmission['section'] | null;
    const severity = searchParams.get('severity') as FeedbackSeverity | null;
    const platform = searchParams.get('platform') as FeedbackSubmission['platform'] | null;
    const alphaTesterParam = searchParams.get('alphaTester');

    const filters: FeedbackFilter = {};
    if (type) filters.type = type;
    if (status) filters.status = status;
    if (section) filters.section = section;
    if (severity) filters.severity = severity;
    if (platform) filters.platform = platform;
    if (alphaTesterParam === 'true') filters.alphaTester = true;
    if (alphaTesterParam === 'false') filters.alphaTester = false;

    const feedback = await readAllFeedback(Object.keys(filters).length > 0 ? filters : undefined);

    // Compute stats
    const cancellationReasonCounts: Record<string, number> = {};
    feedback
      .filter(f => f.type === 'cancellation' && f.cancellationReasons)
      .forEach(f => {
        f.cancellationReasons!.forEach(reason => {
          cancellationReasonCounts[reason] = (cancellationReasonCounts[reason] || 0) + 1;
        });
      });

    const stats = {
      total: feedback.length,
      byType: {
        help: feedback.filter(f => f.type === 'help').length,
        issue: feedback.filter(f => f.type === 'issue').length,
        suggestion: feedback.filter(f => f.type === 'suggestion').length,
        review: feedback.filter(f => f.type === 'review').length,
        cancellation: feedback.filter(f => f.type === 'cancellation').length,
      },
      byStatus: {
        new: feedback.filter(f => f.status === 'new').length,
        'in-progress': feedback.filter(f => f.status === 'in-progress').length,
        done: feedback.filter(f => f.status === 'done').length,
      },
      avgRating: (() => {
        const rated = feedback.filter(f => f.rating);
        if (rated.length === 0) return 0;
        return rated.reduce((sum, f) => sum + (f.rating || 0), 0) / rated.length;
      })(),
      cancellationReasonCounts,
      // Phase 4 — release intelligence
      criticalUnresolved: feedback.filter(f =>
        f.severity === 'critical' &&
        !['fixed', 'released', 'closed', 'done'].includes(f.status)
      ).length,
      byAppVersion: (() => {
        const map: Record<string, { total: number; critical: number; open: number }> = {};
        feedback
          .filter(f => f.appVersion && f.platform !== 'web')
          .forEach(f => {
            const v = f.appVersion!;
            if (!map[v]) map[v] = { total: 0, critical: 0, open: 0 };
            map[v].total++;
            if (f.severity === 'critical') map[v].critical++;
            if (!['fixed', 'released', 'closed', 'done'].includes(f.status)) map[v].open++;
          });
        return map;
      })(),
    };

    return NextResponse.json({ feedback, stats });
  } catch (error) {
    console.error('Feedback API GET error:', error);
    return NextResponse.json(
      { error: 'Failed to read feedback' },
      { status: 500 }
    );
  }
}
