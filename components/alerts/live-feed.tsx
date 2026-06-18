'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { runDetectionNowAction } from '@/lib/actions/detection';

/**
 * Subscribes to the alert SSE stream and refreshes the server-rendered list when
 * a new alert arrives. Also exposes a button to trigger detection in-process.
 */
export function LiveFeed() {
  const router = useRouter();
  const [live, setLive] = useState(false);
  const [lastTitle, setLastTitle] = useState<string | null>(null);

  useEffect(() => {
    const es = new EventSource('/api/stream/alerts');
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data?.type === 'alert') {
          setLastTitle(data.title);
          router.refresh();
        }
      } catch {
        /* ignore keep-alive comments */
      }
    };
    return () => es.close();
  }, [router]);

  return (
    <div className="flex items-center gap-3">
      {lastTitle && <span className="hidden text-xs text-slate-400 sm:inline">new: {lastTitle}</span>}
      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <span
          className={`h-2 w-2 rounded-full ${live ? 'animate-pulse bg-emerald-500' : 'bg-slate-300'}`}
        />
        {live ? 'Live' : 'Offline'}
      </span>
      <form action={runDetectionNowAction}>
        <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">
          Run detection now
        </button>
      </form>
    </div>
  );
}
