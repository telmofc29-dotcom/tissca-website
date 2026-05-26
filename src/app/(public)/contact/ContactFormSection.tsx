'use client';

import { useState, FormEvent } from 'react';
import { useLanguage } from '@/i18n';

type FormState = 'idle' | 'sending' | 'sent' | 'error';

export function ContactFormSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<FormState>('idle');
  const { t } = useLanguage();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setState('sending');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) {
        setState('error');
        return;
      }
      setState('sent');
      setName('');
      setEmail('');
      setMessage('');
    } catch {
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50 text-green-600 mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20,6 9,17 4,12" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{t.contact.form.sentTitle}</h3>
        <p className="text-sm text-slate-500 mb-6">
          {t.contact.form.sentMessage}
        </p>
        <button
          type="button"
          onClick={() => setState('idle')}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {t.contact.form.sendAnother}
        </button>
      </div>
    );
  }

  const inputBase =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="contact-name" className="block text-sm font-medium text-slate-700 mb-1.5">
          {t.contact.form.name}
        </label>
        <input
          id="contact-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.contact.form.namePlaceholder}
          className={inputBase}
        />
      </div>

      <div>
        <label htmlFor="contact-email" className="block text-sm font-medium text-slate-700 mb-1.5">
          {t.contact.form.email}
        </label>
        <input
          id="contact-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.contact.form.emailPlaceholder}
          className={inputBase}
        />
      </div>

      <div>
        <label htmlFor="contact-message" className="block text-sm font-medium text-slate-700 mb-1.5">
          {t.contact.form.message}
        </label>
        <textarea
          id="contact-message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t.contact.form.messagePlaceholder}
          className={`${inputBase} resize-none`}
        />
      </div>

      {state === 'error' && (
        <p className="text-sm text-red-600">
          {t.contact.form.error}
        </p>
      )}

      <button
        type="submit"
        disabled={state === 'sending'}
        className="w-full rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {state === 'sending' ? t.contact.form.sending : t.contact.form.submit}
      </button>
    </form>
  );
}
