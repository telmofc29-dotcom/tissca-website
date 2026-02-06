'use client';
import { useState } from 'react';
import { createFeedbackSubmission, type FeedbackType, BOT_QUESTIONS } from '@/utils/feedback';

interface FeedbackFormProps {
  onClose: () => void;
  onSubmit?: (success: boolean) => void;
}

export default function FeedbackForm({ onClose, onSubmit }: FeedbackFormProps) {
  const [tab, setTab] = useState<FeedbackType>('help');
  const [step, setStep] = useState(0);
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const questions = BOT_QUESTIONS[tab];
  const currentQuestion = questions[step];
  const isLastStep = step === questions.length - 1;

  const handleNextStep = () => {
    if (isLastStep) {
      handleSubmit();
    } else {
      setStep(step + 1);
    }
  };

  const handlePrevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const submission = createFeedbackSubmission(
        tab,
        headline,
        description,
        typeof window !== 'undefined' ? window.location.pathname : '/',
        { userEmail: email || undefined, rating: tab === 'review' ? rating : undefined }
      );

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      });

      if (response.ok) {
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

  const handleTabChange = (newTab: FeedbackType) => {
    setTab(newTab);
    setStep(0);
    setHeadline('');
    setDescription('');
    setEmail('');
    setRating(0);
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="p-6 text-center">
        <div className="text-4xl mb-4">✅</div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Thank You!</h3>
        <p className="text-gray-600 text-sm">Your feedback has been received and will help us improve TISSCA.</p>
        {email && <p className="text-xs text-gray-500 mt-4">We'll contact you at {email} if you need a response.</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        {(['help', 'issue', 'suggestion', 'review'] as FeedbackType[]).map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${
              tab === t
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t === 'help' && '🤔 Help'}
            {t === 'issue' && '🐛 Issue'}
            {t === 'suggestion' && '💡 Improve'}
            {t === 'review' && '⭐ Review'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2">Step {step + 1} of {questions.length}</p>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div
              className="bg-blue-600 h-1 rounded-full transition-all"
              style={{ width: `${((step + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        <h3 className="text-lg font-semibold text-slate-900 mb-4">{currentQuestion}</h3>

        {/* Rating for Review Tab - Step 0 */}
        {tab === 'review' && step === 0 && (
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                onClick={() => setRating(r)}
                className={`text-3xl p-2 transition-all ${
                  rating >= r ? 'opacity-100 scale-110' : 'opacity-50 hover:opacity-75'
                }`}
              >
                ⭐
              </button>
            ))}
          </div>
        )}

        {/* Headline Input - Visible from step 1 onwards */}
        {step > 0 && (
          <input
            type="text"
            placeholder="Brief headline (required)"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
          />
        )}

        {/* Description Input - Visible from last step onwards */}
        {step === questions.length - 1 && (
          <div className="space-y-4">
            <textarea
              placeholder="Tell us more... (required)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />

            <div>
              <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                <input
                  type="email"
                  placeholder="Email (optional - if you'd like a response)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-gray-200 p-6 bg-gray-50 flex gap-3">
        {step > 0 && (
          <button
            onClick={handlePrevStep}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium"
          >
            ← Back
          </button>
        )}

        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium"
        >
          Close
        </button>

        <button
          onClick={handleNextStep}
          disabled={
            isSubmitting ||
            (step > 0 && !headline) ||
            (isLastStep && !description) ||
            (tab === 'review' && step === 0 && rating === 0)
          }
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
        >
          {isSubmitting ? 'Submitting...' : isLastStep ? '✓ Submit' : 'Next →'}
        </button>
      </div>
    </div>
  );
}
