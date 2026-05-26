// src/app/api/contact/route.ts
//
// PURPOSE:
// - Public POST endpoint for the contact form.
// - Accepts { name, email, message } and persists to the feedback table
//   as a 'help' submission with section='support'.
// - Rate limited by IP: 5 submissions per minute.

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { createFeedbackSubmission, addFeedbackSubmission } from '@/utils/feedback';

const contactLimiter = rateLimit({ interval: 60_000, limit: 5 });

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip = getClientIp(request);
    if (!contactLimiter.check(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const message = typeof body?.message === 'string' ? body.message.trim() : '';

    // Validate inputs at boundary
    if (!name || !email || !message) {
      return NextResponse.json({ error: 'name, email, and message are required' }, { status: 400 });
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Truncate to prevent oversized payloads
    const safeHeadline = name.substring(0, 200);
    const safeDescription = message.substring(0, 5000);

    const userAgent = request.headers.get('user-agent') || undefined;

    const submission = createFeedbackSubmission(
      'help',
      safeHeadline,
      safeDescription,
      '/contact',
      {
        userEmail: email,
        section: 'support',
        platform: 'web',
        userAgent,
      }
    );

    // Persist to Supabase feedback table, fall back to in-memory
    try {
      const supabase = createServerSupabaseClient();
      const now = new Date().toISOString();
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
        platform: 'web',
        alpha_tester: false,
        created_at: now,
        updated_at: now,
      });
      if (error) {
        console.warn('[POST /api/contact] DB insert failed, using in-memory fallback:', error.message);
        addFeedbackSubmission(submission);
      }
    } catch {
      addFeedbackSubmission(submission);
    }

    return NextResponse.json({ success: true, id: submission.id });
  } catch (error) {
    console.error('[POST /api/contact] error:', error);
    return NextResponse.json({ error: 'Failed to submit message' }, { status: 500 });
  }
}
