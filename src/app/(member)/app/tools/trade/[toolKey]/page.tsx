// src/app/(member)/app/tools/trade/[toolKey]/page.tsx
//
// ANDROID PARITY: Dynamic page for all Android-parity trade tools.
// Routes like /app/tools/trade/kitchen, /app/tools/trade/flooring, etc.
// Loads the ToolDefinition and renders TradeToolForm.

'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { TOOL_DEFINITIONS } from '@/lib/tools/tool-definitions';
import type { ToolKey } from '@/lib/tools/tool-types';
import TradeToolForm from '@/components/tools/TradeToolForm';

export default function TradeToolPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawKey = params.toolKey as string;
  const attachmentId = searchParams.get('attachmentId');

  // Map URL slug to toolKey (slugs use hyphens, toolKeys use underscores)
  const toolKey = rawKey.replace(/-/g, '_') as ToolKey;
  const definition = TOOL_DEFINITIONS[toolKey];

  if (!definition || toolKey === 'general_estimate') {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <h3 className="text-base font-semibold text-slate-900">Tool not found</h3>
          <p className="mt-1 text-sm text-slate-600">
            Tool key &quot;{rawKey}&quot; does not have an active implementation.
          </p>
          <button
            onClick={() => router.push('/app/tools')}
            className="mt-4 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
          >
            Back to Tools
          </button>
        </div>
      </div>
    );
  }

  return <TradeToolForm definition={definition} attachmentId={attachmentId} />;
}
