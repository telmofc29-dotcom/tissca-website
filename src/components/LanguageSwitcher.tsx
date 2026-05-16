/**
 * LanguageSwitcher — Premium header language selector
 * =====================================================
 * Compact dropdown for switching between 5 supported languages.
 * Shows flag + locale code, with animated dropdown.
 * Works on both dark and light header backgrounds via `tone` prop.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/i18n';
import {
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
  LOCALE_FLAGS,
  type Locale,
} from '@/i18n/translations';

export function LanguageSwitcher({
  tone = 'dark',
  inline = false,
}: {
  tone?: 'dark' | 'light';
  /** When true, renders language choices as an inline expandable list instead of an absolute dropdown.
   *  Use inside overflow-hidden containers (e.g. mobile hamburger menu). */
  inline?: boolean;
}) {
  const { locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click (only for floating dropdown mode)
  useEffect(() => {
    if (inline) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [inline]);

  // Close on escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const isDark = tone === 'dark';

  const triggerButton = (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
        isDark
          ? 'text-white/70 hover:text-white hover:bg-white/10'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      }`}
      aria-label="Select language"
      aria-expanded={open}
    >
      <span className="text-sm leading-none">{LOCALE_FLAGS[locale]}</span>
      <span className="uppercase">{locale}</span>
      <svg
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      >
        <path d="M4 6l4 4 4-4" />
      </svg>
    </button>
  );

  const localeButtons = SUPPORTED_LOCALES.map((loc) => {
    const isActive = loc === locale;
    return (
      <button
        key={loc}
        type="button"
        role="option"
        aria-selected={isActive}
        onClick={() => {
          setLocale(loc as Locale);
          setOpen(false);
        }}
        className={`flex w-full items-center gap-3 px-3.5 py-2 text-sm transition-colors cursor-pointer ${
          isDark
            ? isActive
              ? 'bg-white/10 text-white'
              : 'text-white/70 hover:text-white hover:bg-white/5'
            : isActive
              ? 'bg-blue-50 text-blue-700'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
        }`}
      >
        <span className="text-base leading-none">{LOCALE_FLAGS[loc]}</span>
        <span className="font-medium">{LOCALE_LABELS[loc]}</span>
        {isActive && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ml-auto flex-shrink-0"
          >
            <polyline points="20,6 9,17 4,12" />
          </svg>
        )}
      </button>
    );
  });

  // ── Inline mode: expands in-flow (no absolute positioning) ──
  if (inline) {
    return (
      <div ref={ref}>
        {triggerButton}
        {open && (
          <div
            className={`mt-1 rounded-xl border py-1.5 ${
              isDark
                ? 'border-white/10 bg-white/5'
                : 'border-slate-200 bg-slate-50'
            }`}
            role="listbox"
            aria-label="Language options"
          >
            {localeButtons}
          </div>
        )}
      </div>
    );
  }

  // ── Default floating dropdown mode ──
  return (
    <div ref={ref} className="relative">
      {triggerButton}

      {/* Dropdown */}
      <div
        className={`absolute right-0 top-full mt-2 w-[180px] rounded-xl border py-1.5 shadow-lg transition-all duration-200 origin-top-right ${
          open
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
        } ${
          isDark
            ? 'border-white/10 bg-[#0b141b]/95 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.5)]'
            : 'border-slate-200 bg-white/95 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.1)]'
        }`}
        role="listbox"
        aria-label="Language options"
      >
        {localeButtons}
      </div>
    </div>
  );
}
