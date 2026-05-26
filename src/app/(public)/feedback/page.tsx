// src/app/(public)/feedback/page.tsx
//
// PURPOSE:
//   Dedicated public feedback page at /feedback.
//   Shareable URL for Google Play Console, iOS App Store, emails, and support links.
//   Reuses createFeedbackSubmission() + POST /api/feedback — the same backend
//   as the floating FeedbackButton modal. Submissions appear in the existing
//   admin feedback dashboard without any extra configuration.
//
// RULES:
//   - Anonymous submissions work (no login required).
//   - Authenticated user context is derived server-side only (no user_id in body).
//   - platform = "web", source = "public_feedback_page" baked into submission.
//   - Screenshot upload: TODO — /api/feedback/screenshots exists server-side but
//     is not yet wired into any form component. Do not invent a second upload
//     system. Add file attachment UI once the shared upload component is ready.
//
// VERSION HISTORY:
//   v1.0.0 (2026-05-26): Initial — full-page inline form, dark TISSCA shell.

import type { Metadata } from 'next';
import FeedbackPageClient from './FeedbackPageClient';

export const metadata: Metadata = {
  title: 'Help & Feedback — TISSCA',
  description:
    'Send feedback, report an issue, suggest improvements, or leave a review for TISSCA.',
  // Canonical URL for store listings
  alternates: { canonical: 'https://www.tissca.com/feedback' },
};

export default function FeedbackPage() {
  return <FeedbackPageClient />;
}
