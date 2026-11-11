const tones: Record<string, string> = {
  sending: "bg-warning/20 text-warning",
  delivered: "bg-accent/20 text-accent",
  acknowledged: "bg-success/20 text-success",
  resolved: "bg-success/20 text-success",
  cancelled: "bg-muted text-muted-foreground",
  failed: "bg-destructive/20 text-destructive",
};
export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${tones[status] ?? "bg-muted"}`}
    >
      {status}
    </span>
  );
}
