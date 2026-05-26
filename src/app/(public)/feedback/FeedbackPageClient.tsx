// src/app/(public)/feedback/FeedbackPageClient.tsx
//
// Full-page feedback form for /feedback.
// Reuses createFeedbackSubmission() + POST /api/feedback.
// Same backend, same admin dashboard — no separate table or endpoint.

'use client';

import { useState } from 'react';
import { createFeedbackSubmission, type FeedbackSection } from '@/utils/feedback';
import { trackEvent } from '@/utils/analytics';

// ─── Area options (mirrors FeedbackForm.tsx) ─────────────────────────────────

const AREAS: { label: string; value: FeedbackSection }[] = [
  { label: 'Homepage', value: 'homepage' },
  { label: 'Pricing', value: 'pricing' },
  { label: 'Download', value: 'download' },
  { label: 'Sign in / Account', value: 'signin' },
  { label: 'Member App', value: 'member-app' },
  { label: 'Quotes & Invoices', value: 'quotes-invoices' },
  { label: 'Leads & Jobs', value: 'leads-jobs' },
  { label: 'Billing / Subscription', value: 'billing' },
  { label: 'Settings', value: 'settings' },
  { label: 'Support / Help', value: 'support' },
  { label: 'Other', value: 'other' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'help' | 'issue' | 'suggestion' | 'review';

// ─── Shared field components (inline — avoids a separate import) ──────────────

const INPUT_CLASS =
  'w-full px-4 py-3 rounded-lg bg-white/[0.06] border border-white/[0.12] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#cbb26b] focus:border-transparent text-sm transition-colors';

const TEXTAREA_CLASS =
  'w-full px-4 py-3 rounded-lg bg-white/[0.06] border border-white/[0.12] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#cbb26b] focus:border-transparent resize-none text-sm transition-colors';

const LABEL_CLASS = 'block text-sm font-medium text-white/70 mb-2';

// ─── Main component ───────────────────────────────────────────────────────────

export default function FeedbackPageClient() {
  const [tab, setTab] = useState<Tab>('help');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [rating, setRating] = useState(0);
  const [section, setSection] = useState<FeedbackSection | ''>('');
  const [isBlocked, setIsBlocked] = useState<boolean | null>(null);
  const [benefit, setBenefit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const resetFields = () => {
    setHeadline('');
    setDescription('');
    setEmail('');
    setRating(0);
    setSection('');
    setIsBlocked(null);
    setBenefit('');
    setErrorMsg('');
    setSubmitted(false);
  };

  const handleTabChange = (next: Tab) => {
    setTab(next);
    resetFields();
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  const canSubmit = (() => {
    switch (tab) {
      case 'help':
        return headline.trim().length > 0 && section !== '' && isBlocked !== null;
      case 'issue':
        return headline.trim().length > 0 && description.trim().length > 0;
      case 'suggestion':
        return headline.trim().length > 0 && description.trim().length > 0;
      case 'review':
        return rating > 0;
      default:
        return false;
    }
  })();

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      let finalDescription = description;
      if (tab === 'suggestion' && benefit) {
        finalDescription = description + '\n\n--- Expected benefit ---\n' + benefit;
      }

      const submission = createFeedbackSubmission(
        tab,
        headline || (tab === 'review' ? `Review — ${rating}/5` : ''),
        finalDescription,
        '/feedback',
        {
          userEmail: email || undefined,
          rating: tab === 'review' ? rating : undefined,
          section: (section as FeedbackSection) || undefined,
          isBlocked: isBlocked ?? undefined,
          // Metadata: identify this as from the public standalone page
          platform: 'web',
          alphaTester: false,
        }
      );

      // Inject source field so admin can filter public_feedback_page submissions
      const payload = {
        ...submission,
        source: 'public_feedback_page',
      };

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        trackEvent('feedback_submit', '/feedback', {
          eventLabel: tab,
          metadata: {
            feedbackType: tab,
            supportCategory: section || undefined,
            pageContext: '/feedback',
            source: 'public_feedback_page',
            isBlocked: isBlocked ?? undefined,
          },
        });
        setSubmitted(true);
      } else {
        const data = await response.json().catch(() => ({}));
        setErrorMsg(
          data?.error ||
            'Something went wrong. Please try again or email us directly.'
        );
      }
    } catch {
      setErrorMsg('Unable to send. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Area selector (shared) ──────────────────────────────────────────────────
  const AreaSelector = ({ label }: { label: string }) => (
    <div>
      <label className={LABEL_CLASS}>{label}</label>
      <select
        value={section}
        onChange={(e) => setSection(e.target.value as FeedbackSection)}
        className="w-full px-4 py-3 rounded-lg bg-white/[0.06] border border-white/[0.12] text-white focus:outline-none focus:ring-2 focus:ring-[#cbb26b] focus:border-transparent text-sm transition-colors appearance-none"
        style={{ colorScheme: 'dark' }}
      >
        <option value="" className="bg-[#0d1520] text-white">Select an area…</option>
        {AREAS.map(({ label: l, value }) => (
          <option key={value} value={value} className="bg-[#0d1520] text-white">
            {l}
          </option>
        ))}
      </select>
    </div>
  );

  // ── Email field (shared) ────────────────────────────────────────────────────
  const EmailField = () => (
    <div>
      <label className={LABEL_CLASS}>
        Your email <span className="text-white/30 font-normal">(optional)</span>
      </label>
      <input
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={INPUT_CLASS}
      />
      <p className="text-xs text-white/30 mt-1.5">
        For urgent account or billing issues, include your email so we can reply.
      </p>
    </div>
  );

  // ── Success state ───────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a0f14] flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-6">✅</div>
          <h2 className="text-2xl font-bold text-white mb-3">Thanks for your feedback!</h2>
          <p className="text-white/50 text-sm leading-relaxed mb-8">
            Your message has been received. We review all submissions and use them to improve TISSCA.
          </p>
          {email && (
            <p className="text-white/30 text-xs mb-8">
              We&rsquo;ll reply to <span className="text-white/50">{email}</span> if a response is needed.
            </p>
          )}
          <button
            onClick={() => { resetFields(); }}
            className="px-6 py-3 rounded-lg bg-[#cbb26b] text-[#0a0f14] font-semibold text-sm hover:bg-[#d4be7a] transition-colors"
          >
            Send another
          </button>
        </div>
      </div>
    );
  }

  // ── Tab config ──────────────────────────────────────────────────────────────
  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'help',       label: 'Help',     icon: '❓' },
    { key: 'issue',      label: 'Issue',    icon: '🐛' },
    { key: 'suggestion', label: 'Improve',  icon: '💡' },
    { key: 'review',     label: 'Review',   icon: '⭐' },
  ];

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0f14] px-4 py-16 md:py-24">
      <div className="max-w-xl mx-auto">

        {/* Page header */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
            Help &amp; Feedback
          </h1>
          <p className="text-white/50 text-sm md:text-base leading-relaxed max-w-sm mx-auto">
            Send feedback, report an issue, suggest improvements, or leave a review.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0d1520] shadow-2xl overflow-hidden">

          {/* Tab bar */}
          <div className="grid grid-cols-4 border-b border-white/[0.08] bg-[#0a0f14]">
            {TABS.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => handleTabChange(key)}
                className={`flex flex-col items-center gap-1 py-4 text-xs font-medium transition-all focus:outline-none ${
                  tab === key
                    ? 'text-[#cbb26b] border-b-2 border-[#cbb26b]'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                <span className="text-lg leading-none">{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Form fields */}
          <div className="p-6 space-y-5">

            {/* ── HELP ─────────────────────────────────────────────────────── */}
            {tab === 'help' && (
              <>
                <div>
                  <label className={LABEL_CLASS}>What are you trying to do?</label>
                  <input
                    type="text"
                    placeholder="Describe what you're trying to do…"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>

                <AreaSelector label="Which area is this about?" />

                <div>
                  <label className={LABEL_CLASS}>Are you blocked or stuck?</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsBlocked(true)}
                      className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                        isBlocked === true
                          ? 'border-red-500/60 bg-red-500/10 text-red-400'
                          : 'border-white/[0.12] bg-white/[0.04] text-white/60 hover:bg-white/[0.08]'
                      }`}
                    >
                      Yes, blocked
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsBlocked(false)}
                      className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                        isBlocked === false
                          ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400'
                          : 'border-white/[0.12] bg-white/[0.04] text-white/60 hover:bg-white/[0.08]'
                      }`}
                    >
                      Just a question
                    </button>
                  </div>
                </div>

                <div>
                  <label className={LABEL_CLASS}>
                    Any extra detail? <span className="text-white/30 font-normal">(optional)</span>
                  </label>
                  <textarea
                    placeholder="More context helps us help you faster…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className={TEXTAREA_CLASS}
                  />
                </div>

                <EmailField />
              </>
            )}

            {/* ── ISSUE ────────────────────────────────────────────────────── */}
            {tab === 'issue' && (
              <>
                <div>
                  <label className={LABEL_CLASS}>What went wrong?</label>
                  <input
                    type="text"
                    placeholder="Brief title of the issue…"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>

                <AreaSelector label="Which area is affected?" />

                <div>
                  <label className={LABEL_CLASS}>Describe the issue</label>
                  <textarea
                    placeholder="Steps to reproduce, what you expected, what happened instead…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    className={TEXTAREA_CLASS}
                  />
                </div>

                <div>
                  <label className={LABEL_CLASS}>Is this blocking you?</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsBlocked(true)}
                      className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                        isBlocked === true
                          ? 'border-red-500/60 bg-red-500/10 text-red-400'
                          : 'border-white/[0.12] bg-white/[0.04] text-white/60 hover:bg-white/[0.08]'
                      }`}
                    >
                      Yes, blocked
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsBlocked(false)}
                      className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                        isBlocked === false
                          ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400'
                          : 'border-white/[0.12] bg-white/[0.04] text-white/60 hover:bg-white/[0.08]'
                      }`}
                    >
                      Not blocking
                    </button>
                  </div>
                </div>

                {/* TODO: Screenshot attachment — /api/feedback/screenshots endpoint exists
                    but no shared upload component yet. Wire here once the component is
                    extracted from the Phase 3 screenshot pipeline. Do not duplicate the
                    upload logic. */}

                <EmailField />
              </>
            )}

            {/* ── SUGGESTION ───────────────────────────────────────────────── */}
            {tab === 'suggestion' && (
              <>
                <div>
                  <label className={LABEL_CLASS}>What would you like to improve?</label>
                  <input
                    type="text"
                    placeholder="Feature or area to improve…"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>

                <AreaSelector label="Which area?" />

                <div>
                  <label className={LABEL_CLASS}>Your suggestion</label>
                  <textarea
                    placeholder="Describe the change or feature you have in mind…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className={TEXTAREA_CLASS}
                  />
                </div>

                <div>
                  <label className={LABEL_CLASS}>
                    Expected benefit <span className="text-white/30 font-normal">(optional)</span>
                  </label>
                  <textarea
                    placeholder="How would this improve your workflow?"
                    value={benefit}
                    onChange={(e) => setBenefit(e.target.value)}
                    rows={2}
                    className={TEXTAREA_CLASS}
                  />
                </div>

                <EmailField />
              </>
            )}

            {/* ── REVIEW ───────────────────────────────────────────────────── */}
            {tab === 'review' && (
              <>
                <div>
                  <label className={LABEL_CLASS}>Rate your experience</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRating(r)}
                        className={`text-4xl p-1 transition-all select-none ${
                          rating >= r ? 'opacity-100 scale-110' : 'opacity-30 hover:opacity-60'
                        }`}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={LABEL_CLASS}>
                    Review title <span className="text-white/30 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Summarise your experience…"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>

                <div>
                  <label className={LABEL_CLASS}>
                    Comments <span className="text-white/30 font-normal">(optional)</span>
                  </label>
                  <textarea
                    placeholder="Tell us more about your experience…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className={TEXTAREA_CLASS}
                  />
                </div>

                <EmailField />
              </>
            )}

            {/* Error banner */}
            {errorMsg && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3">
                <p className="text-red-400 text-sm">{errorMsg}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="w-full py-3.5 rounded-lg bg-[#cbb26b] text-[#0a0f14] font-semibold text-sm hover:bg-[#d4be7a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Sending…' : 'Send feedback'}
            </button>

            <p className="text-center text-white/25 text-xs">
              Anonymous submissions welcome. Include your email only if you want a reply.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
