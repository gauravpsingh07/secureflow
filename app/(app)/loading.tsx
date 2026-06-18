export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center p-12" role="status" aria-label="Loading">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
