'use client';

import React, { ReactNode } from 'react';

interface CalculatorLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  exampleTitle: string;
  exampleInputs: string;
  exampleOutputs: string;
  howToUse: string[];
  relatedGuides: { title: string; href: string }[];
}

export default function CalculatorLayout({
  title,
  subtitle,
  children,
  exampleTitle,
  exampleInputs,
  exampleOutputs,
  howToUse,
  relatedGuides,
}: CalculatorLayoutProps) {
  return (
    <>
      {/* Page Header */}
      <section className="bg-slate-700 text-white py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <h1 className="text-4xl font-bold mb-4">{title}</h1>
          <p className="text-lg text-gray-200 max-w-3xl">{subtitle}</p>
        </div>
      </section>

      {/* Main Calculator Area */}
      <section className="py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Calculator Form */}
            <div className="lg:col-span-2">{children}</div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* How to Use */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4 text-slate-900">How to Use</h2>
                <ol className="space-y-3">
                  {howToUse.map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {i + 1}
                      </span>
                      <span className="text-sm text-slate-700">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Example */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4 text-slate-900">Example</h2>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-sm text-slate-900 mb-2">{exampleTitle}</h3>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1">Inputs:</p>
                    <p className="text-sm text-slate-700 whitespace-pre-line">{exampleInputs}</p>
                  </div>
                  <div className="border-t border-green-200 pt-3">
                    <p className="text-xs font-semibold text-slate-700 mb-1">Results:</p>
                    <p className="text-sm text-slate-700 whitespace-pre-line">{exampleOutputs}</p>
                  </div>
                </div>
              </div>

              {/* Related Guides */}
              {relatedGuides.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h2 className="text-lg font-bold mb-4 text-slate-900">Related Guides</h2>
                  <ul className="space-y-2">
                    {relatedGuides.map((guide) => (
                      <li key={guide.href}>
                        <a
                          href={guide.href}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium transition-colors"
                        >
                          {guide.title} →
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// ============================================================================
// RESULT CARD COMPONENT
// ============================================================================

interface ResultCardProps {
  label: string;
  value: string | number;
  unit?: string;
  highlighted?: boolean;
  icon?: string;
}

export function ResultCard({ label, value, unit, highlighted = false, icon }: ResultCardProps) {
  return (
    <div
      className={`p-4 rounded-lg border-2 transition-all ${
        highlighted
          ? 'bg-blue-50 border-blue-400 shadow-md'
          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
      }`}
    >
      <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900 flex items-center gap-2">
        {icon && <span className="text-xl">{icon}</span>}
        <span>
          {typeof value === 'number' ? value.toLocaleString() : value}
          {unit && <span className="text-lg ml-2 text-gray-500">{unit}</span>}
        </span>
      </p>
    </div>
  );
}

// ============================================================================
// INPUT WRAPPER COMPONENT
// ============================================================================

interface InputWrapperProps {
  label: string;
  description?: string;
  children: ReactNode;
  required?: boolean;
  hint?: string;
}

export function InputWrapper({
  label,
  description,
  children,
  required = true,
  hint,
}: InputWrapperProps) {
  return (
    <div className="mb-6">
      <label className="block text-sm font-semibold text-slate-900 mb-2">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      {description && <p className="text-xs text-gray-600 mb-3">{description}</p>}
      {children}
      {hint && <p className="text-xs text-gray-500 mt-2 italic">{hint}</p>}
    </div>
  );
}

// ============================================================================
// FORM SECTION COMPONENT
// ============================================================================

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <div className="mb-8 p-6 bg-white border border-gray-200 rounded-lg">
      <h2 className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
      {description && <p className="text-sm text-gray-600 mb-6">{description}</p>}
      {children}
    </div>
  );
}

// ============================================================================
// RESULTS GRID COMPONENT
// ============================================================================

interface ResultsGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
}

export function ResultsGrid({ children, columns = 2 }: ResultsGridProps) {
  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  }[columns];

  return <div className={`grid ${gridClass} gap-4 mb-6`}>{children}</div>;
}
