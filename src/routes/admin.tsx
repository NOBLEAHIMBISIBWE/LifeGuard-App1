import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  ClipboardCopy,
  Download,
  FileText,
  Filter,
  Inbox,
  Lock,
  Mail,
  MapPin,
  Menu,
  MessageSquarePlus,
  Phone,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Truck,
  User,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  addIncidentNote,
  getAllIncidentsForAdmin,
  INCIDENTS_CHANGE_EVENT,
  mapCategoryToIncidentType,
  mapUiStatusToDbStatus,
  updateLocalIncidentStatus,
  type StoredIncident,
} from "@/lib/incidents";
import { mapEmbed, mapLink } from "@/lib/location";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — Incoming Sender Reports | LifeGuard" },
      {
        name: "description",
        content:
          "Administrative operations console for reviewing, triaging, and dispatching incoming citizen and anonymous incident reports.",
      },
      { property: "og:title", content: "LifeGuard Admin Panel" },
      {
        property: "og:description",
        content: "Manage and respond to incident reports submitted by senders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPanelPage,
});

type QueueFilter = "all" | "identified" | "anonymous" | "sos" | "pending";

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeCsv(val: unknown): string {
  const str = String(val ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatCoordinateSourceLabel(report: StoredIncident): string {
  switch (report.coordinate_source) {
    case "gps":
      return report.accuracy != null
        ? `Live Device GPS (±${Math.round(report.accuracy)} m)`
        : "Live Device GPS";
    case "manual":
      return "Entered Coordinates";
    case "geocoded":
      return "Geocoded Address";
    case "district_reference":
      return "District Coordinates";
    default:
      return report.accuracy != null
        ? `Device GPS (±${Math.round(report.accuracy)} m)`
        : "GPS Coordinates";
  }
}

function AdminPanelPage() {
  const { user, roles, loading: authLoading } = useAuth();
  const [reports, setReports] = useState<StoredIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [districtFilter, setDistrictFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [noteInput, setNoteInput] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  const operatorNameMeta = user?.user_metadata?.["full_name"];
  const operatorName =
    (typeof operatorNameMeta === "string" && operatorNameMeta.trim()) ||
    user?.email?.split("@")[0] ||
    "Admin Desk";

  const loadReports = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    let remoteMapped: StoredIncident[] = [];
    try {
      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        remoteMapped = data.map((row) => ({
          id: row.id,
          type:
            row.type === "medical"
              ? "Medical Emergency"
              : row.type === "fall"
                ? "Accident / Fall"
                : row.type === "safety"
                  ? "Personal Safety / GBV"
                  : "Other Incident",
          db_type: mapCategoryToIncidentType(row.type),
          status: row.status,
          created_at: row.created_at,
          is_test: row.is_test,
          is_anonymous: row.is_anonymous,
          tracking_token: row.tracking_token,
          district: row.district,
          description: row.description,
          location: row.location,
          persons_involved: row.persons_involved,
          date_of_incident: row.date_of_incident,
          evidence_names: row.evidence_names ?? [],
          latitude: row.latitude,
          longitude: row.longitude,
          accuracy: row.accuracy,
          coordinate_source: row.coordinate_source,
          heart_rate: row.heart_rate,
          spo2: row.spo2,
          user_id: row.user_id,
          sender_name: row.sender_name,
          sender_email: row.sender_email,
          sender_phone: row.sender_phone,
          sender_nin: row.sender_nin,
        }));
      }
    } catch {
      /* fallback cleanly to local reports */
    }

    const combined = getAllIncidentsForAdmin(remoteMapped);
    setReports(combined);
    setSelectedId((prev) => {
      if (prev && combined.some((r) => r.id === prev)) return prev;
      return combined[0]?.id ?? null;
    });
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadReports(false);

    const handleLocalUpdate = () => {
      loadReports(false);
    };
    window.addEventListener(INCIDENTS_CHANGE_EVENT, handleLocalUpdate);
    window.addEventListener("storage", handleLocalUpdate);

    const ch = supabase
      .channel(`admin-incidents-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, () => {
        loadReports(false);
      })
      .subscribe();

    return () => {
      window.removeEventListener(INCIDENTS_CHANGE_EVENT, handleLocalUpdate);
      window.removeEventListener("storage", handleLocalUpdate);
      supabase.removeChannel(ch);
    };
  }, [loadReports]);

  const metrics = useMemo(() => {
    const total = reports.length;
    const pending = reports.filter((r) =>
      ["submitted", "delivered", "sending"].includes(r.status),
    ).length;
    const active = reports.filter((r) => ["acknowledged", "dispatched"].includes(r.status)).length;
    const resolved = reports.filter((r) => r.status === "resolved").length;
    const anonymous = reports.filter((r) => Boolean(r.is_anonymous)).length;
    const identified = reports.filter((r) => !r.is_anonymous).length;
    const sos = reports.filter(
      (r) =>
        r.heart_rate != null ||
        r.spo2 != null ||
        r.type.toLowerCase().includes("sos") ||
        r.type.toLowerCase().includes("medical"),
    ).length;
    return { total, pending, active, resolved, anonymous, identified, sos };
  }, [reports]);

  const districts = useMemo(() => {
    const set = new Set<string>();
    for (const r of reports) {
      if (r.district && r.district.trim()) set.add(r.district.trim());
    }
    return Array.from(set).sort();
  }, [reports]);

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reports.filter((r) => {
      if (queueFilter === "identified" && r.is_anonymous) return false;
      if (queueFilter === "anonymous" && !r.is_anonymous) return false;
      if (
        queueFilter === "sos" &&
        !(
          r.heart_rate != null ||
          r.spo2 != null ||
          r.type.toLowerCase().includes("sos") ||
          r.type.toLowerCase().includes("medical")
        )
      ) {
        return false;
      }
      if (queueFilter === "pending" && !["submitted", "delivered", "sending"].includes(r.status)) {
        return false;
      }

      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (districtFilter !== "all" && (r.district || "") !== districtFilter) return false;

      if (q) {
        const haystack = [
          r.id,
          r.type,
          r.district,
          r.description,
          r.location,
          r.latitude != null && r.longitude != null
            ? `${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}`
            : null,
          r.tracking_token,
          r.sender_name,
          r.sender_email,
          r.sender_phone,
          r.sender_nin,
          r.persons_involved,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [reports, queueFilter, statusFilter, districtFilter, searchQuery]);

  const selectedReport = useMemo(
    () =>
      filteredReports.find((r) => r.id === selectedId) ??
      reports.find((r) => r.id === selectedId) ??
      filteredReports[0] ??
      null,
    [filteredReports, reports, selectedId],
  );

  async function handleStatusUpdate(target: StoredIncident, nextStatus: string) {
    setSavingStatus(true);
    try {
      updateLocalIncidentStatus(target.id, nextStatus, target);
      addIncidentNote(target.id, `Status changed to "${nextStatus}".`, operatorName, {
        ...target,
        status: nextStatus,
      });

      try {
        await supabase
          .from("incidents")
          .update({
            status: mapUiStatusToDbStatus(nextStatus),
            updated_at: new Date().toISOString(),
          })
          .eq("id", target.id);

        await supabase.from("incident_events").insert({
          incident_id: target.id,
          event: `${operatorName} marked case as ${nextStatus}`,
        });
      } catch {
        /* local state remains source of truth in preview */
      }

      toast.success(`Report marked as ${nextStatus}`);
      await loadReports(false);
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedReport) return;
    const text = noteInput.trim();
    if (!text) return;

    setSavingNote(true);
    try {
      addIncidentNote(selectedReport.id, text, operatorName, selectedReport);
      try {
        await supabase.from("incident_events").insert({
          incident_id: selectedReport.id,
          event: `${operatorName}: ${text}`,
        });
      } catch {
        /* local fallback */
      }
      setNoteInput("");
      toast.success("Official note added to case timeline");
      await loadReports(false);
    } finally {
      setSavingNote(false);
    }
  }

  function handleExportCsv() {
    const headers = [
      "Report ID",
      "Submitted At",
      "Category",
      "Status",
      "Anonymous",
      "Tracking Token",
      "Sender Name",
      "Sender Phone",
      "Sender Email",
      "District",
      "Location",
      "Latitude",
      "Longitude",
      "Coordinate Source",
      "Description",
    ];
    const rows = filteredReports.map((r) => [
      r.id,
      r.created_at,
      r.type,
      r.status,
      r.is_anonymous ? "Yes" : "No",
      r.tracking_token ?? "",
      r.is_anonymous ? "Anonymous Sender" : (r.sender_name ?? ""),
      r.is_anonymous ? "" : (r.sender_phone ?? ""),
      r.is_anonymous ? "" : (r.sender_email ?? ""),
      r.district ?? "",
      r.location ?? "",
      r.latitude ?? "",
      r.longitude ?? "",
      r.latitude != null && r.longitude != null ? formatCoordinateSourceLabel(r) : "",
      r.description ?? "",
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lifeguard-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredReports.length} report(s) to CSV`);
  }

  const navItems: Array<{
    id: QueueFilter;
    label: string;
    count: number;
    icon: typeof Inbox;
  }> = [
    { id: "all", label: "All Incoming Reports", count: metrics.total, icon: Inbox },
    { id: "pending", label: "Needs Triage", count: metrics.pending, icon: ShieldAlert },
    { id: "identified", label: "Identified Senders", count: metrics.identified, icon: User },
    { id: "anonymous", label: "Anonymous Reports", count: metrics.anonymous, icon: Lock },
    { id: "sos", label: "SOS & Vitals Alerts", count: metrics.sos, icon: Siren },
  ];

  const SidebarContent = (
    <div className="flex h-full flex-col justify-between bg-slate-50/90 p-4">
      <div className="space-y-6">
        {/* Brand */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C81E1E] text-white shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">LifeGuard Admin</p>
              <p className="text-[11px] text-slate-500 leading-tight">Sender Reports Console</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="lg:hidden rounded-lg p-1 text-slate-500 hover:bg-slate-200/70"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Queues */}
        <div className="space-y-1">
          <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Report Queues
          </p>
          {navItems.map(({ id, label, count, icon: Icon }) => {
            const active = queueFilter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setQueueFilter(id);
                  setMobileNavOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                  active
                    ? "bg-[#C81E1E]/10 text-[#C81E1E] font-semibold"
                    : "text-slate-700 hover:bg-slate-200/60"
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </span>
                <span
                  className={`tabular-nums rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                    active ? "bg-[#C81E1E] text-white" : "bg-slate-200/80 text-slate-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick District Overview */}
        {districts.length > 0 && (
          <div className="space-y-1.5">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Active Districts
            </p>
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  setDistrictFilter("all");
                  setMobileNavOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs ${
                  districtFilter === "all"
                    ? "bg-white font-semibold text-slate-900 border border-slate-200"
                    : "text-slate-600 hover:bg-slate-200/60"
                }`}
              >
                <span>All Districts</span>
                <span className="tabular-nums text-[11px] text-slate-500">{reports.length}</span>
              </button>
              {districts.slice(0, 6).map((dist) => {
                const count = reports.filter((r) => r.district === dist).length;
                const active = districtFilter === dist;
                return (
                  <button
                    key={dist}
                    type="button"
                    onClick={() => {
                      setDistrictFilter(dist);
                      setMobileNavOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs ${
                      active
                        ? "bg-white font-semibold text-slate-900 border border-slate-200"
                        : "text-slate-600 hover:bg-slate-200/60"
                    }`}
                  >
                    <span className="truncate">{dist}</span>
                    <span className="tabular-nums text-[11px] text-slate-500">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="space-y-2 border-t border-slate-200 pt-4">
        <div className="px-2 py-1">
          <p className="text-[11px] text-slate-400">Signed in operator</p>
          <p className="truncate text-xs font-semibold text-slate-800">{operatorName}</p>
        </div>
        <Link
          to="/home"
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Citizen App
        </Link>
      </div>
    </div>
  );

  if (authLoading) {
    return <div className="p-8 text-center text-sm text-slate-600">Checking administrator access…</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-xl font-bold">Sign in required</h1>
        <p className="mt-2 text-sm text-slate-600">Please sign in with an administrator account.</p>
        <Link to="/auth" className="mt-4 inline-block text-red-700 underline">Go to sign in</Link>
      </div>
    );
  }

  if (!roles.includes("admin")) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-xl font-bold">Access restricted</h1>
        <p className="mt-2 text-sm text-slate-600">This dashboard is available to authorized administrators only.</p>
        <Link to="/home" className="mt-4 inline-block text-red-700 underline">Return to LifeGuard</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-200 bg-slate-50/90 sticky top-0 h-screen overflow-y-auto">
        {SidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/40" onClick={() => setMobileNavOpen(false)} />
          <div className="relative z-10 w-64 max-w-[85vw] bg-slate-50 border-r border-slate-200 h-full overflow-y-auto">
            {SidebarContent}
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden rounded-lg border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>Admin Panel</span>
                <span>/</span>
                <span className="font-semibold text-slate-900 truncate">
                  Incoming Sender Reports
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/home"
              className="lg:hidden inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> App
            </Link>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => loadReports(true)}
              disabled={refreshing}
              className="h-8 gap-1.5 rounded-lg border-slate-200 text-xs font-medium"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleExportCsv}
              disabled={filteredReports.length === 0}
              className="h-8 gap-1.5 rounded-lg bg-[#C81E1E] hover:bg-red-700 text-white text-xs font-semibold"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
        </header>

        {/* Main Scroll Area */}
        <main className="flex-1 p-4 lg:p-6 space-y-5 max-w-[1440px] w-full mx-auto">
          {/* KPI Strip — single flat bordered container */}
          <section
            aria-label="Incident Summary Metrics"
            className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-slate-200 bg-white divide-y lg:divide-y-0 lg:divide-x divide-slate-200"
          >
            <div className="p-4">
              <p className="text-xs font-medium text-slate-500">Total Reports</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                {metrics.total}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
                {metrics.identified} identified · {metrics.anonymous} anonymous
              </p>
            </div>
            <div className="p-4">
              <p className="text-xs font-medium text-slate-500">Pending Review</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-amber-700 tabular-nums">
                {metrics.pending}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">Submitted & awaiting triage</p>
            </div>
            <div className="p-4">
              <p className="text-xs font-medium text-slate-500">Active Dispatch</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-indigo-700 tabular-nums">
                {metrics.active}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">Acknowledged or unit en route</p>
            </div>
            <div className="p-4">
              <p className="text-xs font-medium text-slate-500">Resolved Cases</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-700 tabular-nums">
                {metrics.resolved}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">Closed with follow-up logged</p>
            </div>
          </section>

          {/* Search & Filter Toolbar */}
          <section className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sender name, phone, tracking token, district, or report text..."
                className="h-9 rounded-lg border-slate-200 pl-9 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                {(["all", "submitted", "acknowledged", "dispatched", "resolved"] as const).map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`rounded-md px-2.5 py-1 capitalize transition-colors ${
                        statusFilter === st
                          ? "bg-white font-semibold text-slate-900 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {st}
                    </button>
                  ),
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  aria-label="Filter by district"
                  value={districtFilter}
                  onChange={(e) => setDistrictFilter(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:border-slate-400"
                >
                  <option value="all">All Districts</option>
                  {districts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Split Master-Detail Workspace */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            {/* Left: Reports Table */}
            <section className="xl:col-span-7 rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <h1 className="text-sm font-semibold text-slate-900">
                  Sender Reports Queue{" "}
                  <span className="ml-1 text-xs font-normal text-slate-500 tabular-nums">
                    ({filteredReports.length})
                  </span>
                </h1>
                {(queueFilter !== "all" ||
                  statusFilter !== "all" ||
                  districtFilter !== "all" ||
                  searchQuery.trim() !== "") && (
                  <button
                    type="button"
                    onClick={() => {
                      setQueueFilter("all");
                      setStatusFilter("all");
                      setDistrictFilter("all");
                      setSearchQuery("");
                    }}
                    className="text-xs font-medium text-[#C81E1E] hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {loading ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Loading incoming sender reports...
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <Inbox className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-800">No matching sender reports</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Try adjusting your search or filter criteria, or submit a new report from the
                    citizen app.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="py-2.5 pl-4 pr-3">Incident</th>
                        <th className="py-2.5 px-3">Sender</th>
                        <th className="py-2.5 px-3 hidden sm:table-cell">Location &amp; GPS</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 pl-3 pr-4 text-right">Received</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredReports.map((item) => {
                        const isSelected = selectedReport?.id === item.id;
                        return (
                          <tr
                            key={item.id}
                            onClick={() => setSelectedId(item.id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? "bg-rose-50/70" : "hover:bg-slate-50"
                            }`}
                          >
                            <td className="py-3 pl-4 pr-3 align-top">
                              <p className="font-semibold text-slate-900 leading-snug">
                                {item.type}
                                {item.is_test && (
                                  <span className="ml-1.5 text-[11px] font-normal text-slate-500">
                                    (Test)
                                  </span>
                                )}
                              </p>
                              <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">
                                {item.description || item.location || item.id}
                              </p>
                            </td>
                            <td className="py-3 px-3 align-top">
                              {item.is_anonymous ? (
                                <div>
                                  <span className="inline-flex items-center gap-1 font-semibold text-[#C81E1E]">
                                    <Lock className="h-3 w-3" /> Anonymous
                                  </span>
                                  {item.tracking_token && (
                                    <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                                      {item.tracking_token}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <p className="font-medium text-slate-900">
                                    {item.sender_name || "Registered Citizen"}
                                  </p>
                                  <p className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
                                    {item.sender_phone || item.sender_email || "Account Verified"}
                                  </p>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 align-top hidden sm:table-cell">
                              <p className="text-slate-800 font-medium">
                                {item.district || item.location || "—"}
                              </p>
                              {item.latitude != null && item.longitude != null ? (
                                <p className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
                                  {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                                </p>
                              ) : (
                                <p className="mt-0.5 text-[11px] text-slate-400">No GPS pin</p>
                              )}
                            </td>
                            <td className="py-3 px-3 align-top">
                              <StatusBadge status={item.status} />
                            </td>
                            <td className="py-3 pl-3 pr-4 align-top text-right text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
                              {formatShortDate(item.created_at)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Right: Selected Report Inspector */}
            <aside className="xl:col-span-5 rounded-xl border border-slate-200 bg-white overflow-hidden">
              {!selectedReport ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Select any incoming report from the table to inspect sender information, GPS
                  coordinates, and dispatch actions.
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {/* Inspector Header */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-[11px] text-slate-500">{selectedReport.id}</p>
                        <h2 className="mt-0.5 text-base font-bold text-slate-900">
                          {selectedReport.type}
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                          Submitted {new Date(selectedReport.created_at).toLocaleString()}
                          {selectedReport.district ? ` · ${selectedReport.district}` : ""}
                        </p>
                      </div>
                      <StatusBadge status={selectedReport.status} />
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {selectedReport.status !== "acknowledged" &&
                        selectedReport.status !== "resolved" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={savingStatus}
                            onClick={() => handleStatusUpdate(selectedReport, "acknowledged")}
                            className="h-8 gap-1.5 rounded-lg border-slate-200 text-xs font-medium"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                            Acknowledge
                          </Button>
                        )}
                      {selectedReport.status !== "dispatched" &&
                        selectedReport.status !== "resolved" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={savingStatus}
                            onClick={() => handleStatusUpdate(selectedReport, "dispatched")}
                            className="h-8 gap-1.5 rounded-lg border-slate-200 text-xs font-medium"
                          >
                            <Truck className="h-3.5 w-3.5 text-indigo-600" />
                            Dispatch Unit
                          </Button>
                        )}
                      {selectedReport.status !== "resolved" && (
                        <Button
                          type="button"
                          size="sm"
                          disabled={savingStatus}
                          onClick={() => handleStatusUpdate(selectedReport, "resolved")}
                          className="h-8 gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Mark Resolved
                        </Button>
                      )}
                      {selectedReport.status !== "cancelled" &&
                        selectedReport.status !== "resolved" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={savingStatus}
                            onClick={() => handleStatusUpdate(selectedReport, "cancelled")}
                            className="h-8 gap-1 rounded-lg text-xs text-slate-500 hover:text-rose-600"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Dismiss
                          </Button>
                        )}
                    </div>
                  </div>

                  {/* Sender Identity Block */}
                  <div className="p-4 space-y-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Sender Details
                    </p>
                    {selectedReport.is_anonymous ? (
                      <div className="rounded-lg border border-rose-200 bg-rose-50/70 p-3 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 font-semibold text-[#C81E1E]">
                            <Lock className="h-3.5 w-3.5" /> Anonymous Submission
                          </span>
                          {selectedReport.tracking_token && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(selectedReport.tracking_token || "");
                                toast.success("Tracking token copied");
                              }}
                              className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-700 hover:text-slate-900"
                            >
                              {selectedReport.tracking_token}
                              <ClipboardCopy className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Identity fields (name, email, phone, NIN) were excluded to protect sender
                          confidentiality. Post updates below so the sender can track via token.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        <div className="flex items-center gap-2 text-slate-800">
                          <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold truncate">
                            {selectedReport.sender_name || "Registered Citizen"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700 tabular-nums">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {selectedReport.sender_phone ? (
                            <a
                              href={`tel:${selectedReport.sender_phone}`}
                              className="text-blue-700 hover:underline truncate"
                            >
                              {selectedReport.sender_phone}
                            </a>
                          ) : (
                            <span className="text-slate-400">No phone provided</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-slate-700">
                          <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {selectedReport.sender_email || "No email recorded"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700 tabular-nums">
                          <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {selectedReport.sender_nin
                              ? `NIN: ${selectedReport.sender_nin}`
                              : "NIN not attached"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Report Narrative & Evidence */}
                  <div className="p-4 space-y-2.5 text-xs">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Incident Details & Evidence
                    </p>
                    <p className="text-slate-800 leading-relaxed">
                      {selectedReport.description ||
                        "No written description attached to this alert."}
                    </p>
                    <div className="space-y-1 text-slate-600 pt-1">
                      {selectedReport.location && (
                        <p>
                          <span className="font-semibold text-slate-800">Reported Location:</span>{" "}
                          {selectedReport.location}
                        </p>
                      )}
                      {selectedReport.persons_involved && (
                        <p>
                          <span className="font-semibold text-slate-800">Persons Involved:</span>{" "}
                          {selectedReport.persons_involved}
                        </p>
                      )}
                      {selectedReport.date_of_incident && (
                        <p className="tabular-nums">
                          <span className="font-semibold text-slate-800">Incident Time:</span>{" "}
                          {selectedReport.date_of_incident}
                        </p>
                      )}
                      {selectedReport.evidence_names &&
                        selectedReport.evidence_names.length > 0 && (
                          <div className="pt-1 flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold text-slate-800">Evidence:</span>
                            {selectedReport.evidence_names.map((fileName) => (
                              <span
                                key={fileName}
                                className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] text-slate-700"
                              >
                                <FileText className="h-3 w-3 text-slate-400" />
                                {fileName}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>

                  {/* GPS Coordinates, Map & Wearable Vitals */}
                  <div className="p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Location Coordinates &amp; Telemetry
                      </p>
                      {selectedReport.latitude != null && selectedReport.longitude != null && (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                `${selectedReport.latitude!.toFixed(5)}, ${selectedReport.longitude!.toFixed(5)}`,
                              );
                              toast.success("Coordinates copied");
                            }}
                            className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900"
                          >
                            <ClipboardCopy className="h-3 w-3" /> Copy
                          </button>
                          <a
                            href={mapLink(selectedReport.latitude, selectedReport.longitude)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                          >
                            <MapPin className="h-3.5 w-3.5" /> Open Maps
                          </a>
                        </div>
                      )}
                    </div>

                    {(selectedReport.heart_rate != null || selectedReport.spo2 != null) && (
                      <div className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50/50 px-3 py-2 font-medium text-slate-800 tabular-nums">
                        <Activity className="h-4 w-4 text-[#C81E1E]" />
                        <span>
                          Heart Rate:{" "}
                          {selectedReport.heart_rate ? `${selectedReport.heart_rate} bpm` : "—"}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span>SpO₂: {selectedReport.spo2 ? `${selectedReport.spo2}%` : "—"}</span>
                      </div>
                    )}

                    {selectedReport.latitude != null && selectedReport.longitude != null ? (
                      <>
                        <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 tabular-nums">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400">
                              Latitude
                            </p>
                            <p className="font-mono font-semibold text-slate-900">
                              {selectedReport.latitude.toFixed(5)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400">
                              Longitude
                            </p>
                            <p className="font-mono font-semibold text-slate-900">
                              {selectedReport.longitude.toFixed(5)}
                            </p>
                          </div>
                        </div>

                        <div className="overflow-hidden rounded-lg border border-slate-200">
                          <iframe
                            title={`Location for ${selectedReport.id}`}
                            src={mapEmbed(selectedReport.latitude, selectedReport.longitude)}
                            className="h-44 w-full border-0"
                          />
                          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600 tabular-nums">
                            <span>{formatCoordinateSourceLabel(selectedReport)}</span>
                            <span className="font-mono">
                              {selectedReport.latitude.toFixed(5)},{" "}
                              {selectedReport.longitude.toFixed(5)}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-3 text-slate-500">
                        No GPS coordinates were attached to this legacy report.
                      </div>
                    )}
                  </div>

                  {/* Official Reviewer Notes & Activity Log */}
                  <div className="p-4 space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Official Response Notes & Timeline
                    </p>

                    <form onSubmit={handleAddNote} className="flex gap-2">
                      <div className="relative flex-1">
                        <MessageSquarePlus className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={noteInput}
                          onChange={(e) => setNoteInput(e.target.value)}
                          placeholder="Add dispatch update or follow-up note for sender..."
                          className="h-9 rounded-lg border-slate-200 pl-8 text-xs"
                        />
                      </div>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={savingNote || !noteInput.trim()}
                        className="h-9 gap-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-3 shrink-0"
                      >
                        <Send className="h-3.5 w-3.5" /> Post
                      </Button>
                    </form>

                    {selectedReport.reviewer_notes && selectedReport.reviewer_notes.length > 0 ? (
                      <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {selectedReport.reviewer_notes.map((entry) => (
                          <li
                            key={entry.id}
                            className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 text-xs"
                          >
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="font-semibold text-slate-800">{entry.author}</span>
                              <span className="text-slate-500 tabular-nums">
                                {formatShortDate(entry.created_at)}
                              </span>
                            </div>
                            <p className="mt-1 text-slate-700 leading-relaxed">{entry.note}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-400">
                        No official notes recorded yet. Notes posted here appear on the sender's
                        case timeline.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
