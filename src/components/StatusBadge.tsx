const tones: Record<string, string> = {
  submitted: "bg-amber-500/15 text-amber-800",
  sending: "bg-amber-500/15 text-amber-800",
  delivered: "bg-slate-100 text-slate-700",
  acknowledged: "bg-blue-500/15 text-blue-700",
  dispatched: "bg-indigo-500/15 text-indigo-700",
  resolved: "bg-emerald-500/15 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-500",
  failed: "bg-rose-500/15 text-rose-700",
};
export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold capitalize ${tones[status] ?? "bg-slate-100 text-slate-700"}`}
    >
      {status}
    </span>
  );
}
