export type Bar = { label: string; value: number };

/** Minimal dependency-free bar chart. Heights are pixel values vs. the max. */
export function BarChart({ data, height = 120 }: { data: Bar[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const usable = height - 18;
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
          <div
            className="w-full rounded-t bg-indigo-500"
            style={{ height: Math.max(2, Math.round((d.value / max) * usable)) }}
            title={`${d.label}: ${d.value}`}
          />
          <span className="text-[10px] text-slate-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
