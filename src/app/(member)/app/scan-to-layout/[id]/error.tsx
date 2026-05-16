'use client';

import { useEffect } from 'react';

export default function ScanToLayoutEditorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ScanToLayout Editor] Runtime error:', error);
  }, [error]);

  return (
    <div className="flex h-[70vh] items-center justify-center">
      <div className="text-center max-w-sm">
        <h3 className="text-base font-semibold text-slate-900">Layout editor error</h3>
        <p className="mt-2 text-sm text-slate-600">
          Something went wrong while loading the editor. Please try again.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
          >
            Try again
          </button>
          <a
            href="/app/scan-to-layout"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-gray-50"
          >
            Back to layouts
          </a>
        </div>
      </div>
    </div>
  );
}
