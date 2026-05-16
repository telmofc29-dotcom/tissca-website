'use client';
import { useState } from 'react';
import Link from 'next/link';
import { createFeedbackSubmission, type FeedbackType, type FeedbackSection } from '@/utils/feedback';
import { trackEvent } from '@/utils/analytics';
import { useLanguage } from '@/i18n/LanguageProvider';

interface FeedbackFormProps {
  onClose: () => void;
  onSubmit?: (success: boolean) => void;
}

const AREA_KEYS: { key: string; section: FeedbackSection }[] = [
  { key: 'homepage', section: 'homepage' },
  { key: 'pricing', section: 'pricing' },
  { key: 'download', section: 'download' },
  { key: 'signin', section: 'signin' },
  { key: 'memberApp', section: 'member-app' },
  { key: 'quotesInvoices', section: 'quotes-invoices' },
  { key: 'leadsJobs', section: 'leads-jobs' },
  { key: 'billing', section: 'billing' },
  { key: 'settings', section: 'settings' },
  { key: 'support', section: 'support' },
  { key: 'other', section: 'other' },
];

export default function FeedbackForm({ onClose, onSubmit }: FeedbackFormProps) {
  const { t } = useLanguage();
  const f = t.member.feedback;
  const labels = f.labels;
  const areas = f.areas;

  const [tab, setTab] = useState<FeedbackType>('help');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [rating, setRating] = useState(0);
  const [section, setSection] = useState<FeedbackSection | ''>('');
  const [isBlocked, setIsBlocked] = useState<boolean | null>(null);
  const [benefit, setBenefit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleTabChange = (newTab: FeedbackType) => {
    setTab(newTab);
    setHeadline('');
    setDescription('');
    setEmail('');
    setRating(0);
    setSection('');
    setIsBlocked(null);
    setBenefit('');
    setSubmitted(false);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Build description with benefit for improve type
      let finalDescription = description;
      if (tab === 'suggestion' && benefit) {
        finalDescription = description + '\n\n--- Expected benefit ---\n' + benefit;
      }

      const submission = createFeedbackSubmission(
        tab,
        headline || (tab === 'review' ? `Review — ${rating}/5` : ''),
        finalDescription,
        typeof window !== 'undefined' ? window.location.pathname : '/',
        {
          userEmail: email || undefined,
          rating: tab === 'review' ? rating : undefined,
          section: (section as FeedbackSection) || undefined,
          isBlocked: isBlocked ?? undefined,
        }
      );

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      });

      if (response.ok) {
        trackEvent('feedback_submit', typeof window !== 'undefined' ? window.location.pathname : '/', {
          eventLabel: tab,
          metadata: {
            feedbackType: tab,
            supportCategory: section || undefined,
            pageContext: typeof window !== 'undefined' ? window.location.pathname : '/',
            locale: (typeof document !== 'undefined' && document.documentElement.lang) || undefined,
            isBlocked: isBlocked ?? undefined,
          },
        });
        setSubmitted(true);
        setTimeout(() => {
          onClose();
          onSubmit?.(true);
        }, 2000);
      } else {
        throw new Error('Failed to submit');
      }
    } catch (error) {
      console.error('Feedback submission error:', error);
      onSubmit?.(false);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  if (submitted) {
    return (
      <div className="p-6 text-center">
        <div className="text-4xl mb-4">✅</div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">{f.thankYou}</h3>
        <p className="text-gray-600 text-sm">{f.thankYouMessage}</p>
        {email && <p className="text-xs text-gray-500 mt-4">{f.contactNote.replace('{email}', email)}</p>}
      </div>
    );
  }

  /* ── Area selector (shared by help / issue / improve) ── */
  const areaSelector = (label: string) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <select
        value={section}
        onChange={(e) => setSection(e.target.value as FeedbackSection)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
      >
        <option value="">{labels.selectArea}</option>
        {AREA_KEYS.map(({ key, section: sec }) => (
          <option key={sec} value={sec}>
            {areas[key as keyof typeof areas]}
          </option>
        ))}
      </select>
    </div>
  );

  /* ── Email field (shared) ── */
  const emailField = (
    <input
      type="email"
      placeholder={f.emailPlaceholder}
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
    />
  );

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        {(['help', 'issue', 'suggestion', 'review'] as FeedbackType[]).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => handleTabChange(tabKey)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${
              tab === tabKey
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {f.tabs[tabKey as keyof typeof f.tabs]}
          </button>
        ))}
      </div>

      {/* Per-type form content */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {/* ───── HELP ───── */}
        {tab === 'help' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{labels.whatDoing}</label>
              <input
                type="text"
                placeholder={f.headlinePlaceholder}
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            {areaSelector(labels.whichArea)}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{labels.blocked}</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsBlocked(true)}
                  className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    isBlocked === true
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {labels.blockedYes}
                </button>
                <button
                  type="button"
                  onClick={() => setIsBlocked(false)}
                  className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    isBlocked === false
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {labels.blockedNo}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{labels.extraDetail}</label>
              <textarea
                placeholder={f.descriptionPlaceholder}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              />
            </div>

            {emailField}

            {/* Support page shortcut */}
            <Link
              href="/support"
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors no-underline"
            >
              <span>📖</span>
              <span>{labels.browseFaq ?? 'Browse FAQ & help articles'}</span>
              <span className="ml-auto text-blue-400">→</span>
            </Link>
          </>
        )}

        {/* ───── ISSUE ───── */}
        {tab === 'issue' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{labels.issueTitle}</label>
              <input
                type="text"
                placeholder={f.headlinePlaceholder}
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            {areaSelector(labels.affectedArea)}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{labels.describeIssue}</label>
              <textarea
                placeholder={f.descriptionPlaceholder}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{labels.blocked}</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsBlocked(true)}
                  className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    isBlocked === true
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {labels.blockedYes}
                </button>
                <button
                  type="button"
                  onClick={() => setIsBlocked(false)}
                  className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    isBlocked === false
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {labels.blockedNo}
                </button>
              </div>
            </div>

            {emailField}
          </>
        )}

        {/* ───── IMPROVE (suggestion) ───── */}
        {tab === 'suggestion' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{labels.improveTitle}</label>
              <input
                type="text"
                placeholder={f.headlinePlaceholder}
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            {areaSelector(labels.whichArea)}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{labels.yourSuggestion}</label>
              <textarea
                placeholder={f.descriptionPlaceholder}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{labels.expectedBenefit}</label>
              <textarea
                placeholder={labels.expectedBenefit}
                value={benefit}
                onChange={(e) => setBenefit(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              />
            </div>

            {emailField}
          </>
        )}

        {/* ───── REVIEW ───── */}
        {tab === 'review' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{labels.rateExperience}</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRating(r)}
                    className={`text-3xl p-1.5 transition-all ${
                      rating >= r ? 'opacity-100 scale-110' : 'opacity-40 hover:opacity-70'
                    }`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{labels.reviewTitle}</label>
              <input
                type="text"
                placeholder={labels.reviewTitle}
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{labels.reviewComments}</label>
              <textarea
                placeholder={labels.reviewComments}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              />
            </div>

            {emailField}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-gray-200 p-6 bg-gray-50 flex gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium"
        >
          {f.close}
        </button>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !canSubmit}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
        >
          {isSubmitting ? f.submitting : f.submit}
        </button>
      </div>
    </div>
  );
}
