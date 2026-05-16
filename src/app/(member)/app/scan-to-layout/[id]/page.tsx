// src/app/(member)/app/scan-to-layout/[id]/page.tsx v3.0
//
// PURPOSE:
// Thin wrapper that dynamically imports the heavy editor.
// This ensures the page always shows a visible loading state
// while the 300+ KB editor chunk downloads and evaluates.
//
// WHY ssr: false?
// The editor uses HTML5 Canvas, spatial engine, and warehouse
// registry (460 KB total). Loading it CSR-only avoids hydration
// mismatches and server-side evaluation failures that can cause
// blank pages.

'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// ─── Inline error boundary (catches chunk load / render failures) ──────────
class EditorErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[EditorErrorBoundary] caught:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ background: '#fef2f2', border: '2px solid #ef4444', padding: 20, borderRadius: 12, maxWidth: 480, margin: '40px auto', fontFamily: 'system-ui' }}>
            <h3 style={{ color: '#dc2626', fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>
              Editor failed to load
            </h3>
            <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 12px' }}>
              {this.state.error.message}
            </p>
            <pre style={{ textAlign: 'left', fontSize: 11, color: '#475569', background: '#f8fafc', padding: 12, borderRadius: 8, overflow: 'auto', maxHeight: 200, whiteSpace: 'pre-wrap' }}>
              {this.state.error.stack}
            </pre>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button
                onClick={() => this.setState({ error: null })}
                style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Try again
              </button>
              <a
                href="/app/scan-to-layout"
                style={{ background: '#e2e8f0', color: '#334155', textDecoration: 'none', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}
              >
                Back to layouts
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Dynamic import (ssr: false = client-only, no hydration mismatch) ──────
const EditorContent = dynamic(() => import('./EditorContent'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        <p className="mt-3 text-sm text-slate-500">Loading layout editor...</p>
      </div>
    </div>
  ),
});

export default function ScanToLayoutEditorPage() {
  return (
    <EditorErrorBoundary>
      <EditorContent />
    </EditorErrorBoundary>
  );
}
