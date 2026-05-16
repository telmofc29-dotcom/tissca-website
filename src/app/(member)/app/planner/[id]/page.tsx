// src/app/(member)/app/planner/[id]/page.tsx v2.0
//
// PURPOSE:
// Redirect legacy planner/[id] route to the correct scan-to-layout/[id] editor.
// The room layout editor now lives under /app/scan-to-layout/[id].

'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function PlannerEditorRedirect() {
  const params = useParams();
  const router = useRouter();
  const layoutId = params.id as string;

  useEffect(() => {
    router.replace(`/app/scan-to-layout/${layoutId}`);
  }, [router, layoutId]);

  return (
    <div className="flex h-[70vh] items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        <p className="mt-3 text-sm text-slate-500">Redirecting to layout editor...</p>
      </div>
    </div>
  );
}
