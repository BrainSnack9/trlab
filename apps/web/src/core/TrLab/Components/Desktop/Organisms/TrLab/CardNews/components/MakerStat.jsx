export function MakerStat({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg border bg-slate-50 p-3">
      <span className="block text-[11px] font-semibold text-slate-400">{label}</span>
      <strong className="mt-1 block truncate text-sm font-semibold text-slate-900">{value}</strong>
    </div>
  );
}
