import { addFeedbackSubmission, getAllFeedback, filterFeedback, type FeedbackSubmission, type FeedbackFilter } from '@/utils/feedback';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

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
    }));
  } catch {
    return filters ? filterFeedback(filters) : getAllFeedback();
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: FeedbackSubmission = await request.json();

    // Validate required fields
    if (!body.type || !body.headline || !body.description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Add user agent from request
    const userAgent = request.headers.get('user-agent') || undefined;
    const submission = {
      ...body,
      userAgent,
      updatedAt: new Date().toISOString(),
    };

    // Persist to DB (falls back to in-memory)
    await persistFeedback(submission);

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
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as FeedbackSubmission['type'] | null;
    const status = searchParams.get('status') as FeedbackSubmission['status'] | null;
    const section = searchParams.get('section') as FeedbackSubmission['section'] | null;

    const filters: FeedbackFilter = {};
    if (type) filters.type = type;
    if (status) filters.status = status;
    if (section) filters.section = section;

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
