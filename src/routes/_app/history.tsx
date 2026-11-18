import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Activity,
  ChevronDown,
  ChevronUp,
  Share2,
  Search,
  Lock,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { mapLink } from "@/lib/location";
import {
  findIncidentByToken,
  getLocalIncidents,
  INCIDENTS_CHANGE_EVENT,
  type IncidentNote,
  type StoredIncident,
} from "@/lib/incidents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/history")({
  validateSearch: (s: Record<string, unknown>): { incidentId?: string | undefined } => ({
    incidentId: typeof s["incidentId"] === "string" ? (s["incidentId"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Case Tracking & History — LifeGuard" },
      {
        name: "description",
        content: "Every alert you've sent with status, location, and real-time audit trail.",
      },
      { property: "og:title", content: "Case Tracking & History — LifeGuard" },
      { property: "og:description", content: "Your LifeGuard incident history and case tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
});

type IncidentItem = {
  id: string;
  type: string;
  status: string;
  created_at: string;
  is_test: boolean;
  is_anonymous?: boolean;
  tracking_token?: string | null;
  district?: string | null;
  description?: string | null;
  location?: string | null;
  persons_involved?: string | null;
  evidence_names?: string[];
  latitude: number | null;
  longitude: number | null;
  heart_rate: number | null;
  spo2: number | null;
  reviewer_notes?: IncidentNote[];
};

type EventItem = {
  id: string;
  event: string;
  created_at: string;
};

const SAMPLE_DEMO_INCIDENTS: IncidentItem[] = [
  {
    id: "inc-sample-1",
    type: "Medical Emergency",
    status: "dispatched",
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    is_test: false,
    district: "Kampala",
    latitude: 0.3476,
    longitude: 32.5825,
    heart_rate: 98,
    spo2: 97,
  },
  {
    id: "inc-sample-2",
    type: "Personal Safety / Assault",
    status: "submitted",
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    is_test: false,
    district: "Wakiso",
    latitude: 0.3136,
    longitude: 32.5811,
    heart_rate: null,
    spo2: null,
  },
];

function mergeIncidents(local: StoredIncident[], remote: IncidentItem[]): IncidentItem[] {
  const map = new Map<string, IncidentItem>();
  for (const item of remote) {
    map.set(item.id, item);
  }
  for (const item of local) {
    const existing = map.get(item.id);
    map.set(item.id, { ...existing, ...item });
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

function HistoryPage() {
  const { incidentId } = Route.useSearch();
  const nav = useNavigate();
  const [items, setItems] = useState<IncidentItem[]>([]);
  const [open, setOpen] = useState<string | null>(incidentId || null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [tokenQuery, setTokenQuery] = useState("");
  const [matchedTokenItem, setMatchedTokenItem] = useState<IncidentItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadHistory = async () => {
      const local = getLocalIncidents();
      let remote: IncidentItem[] = [];
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          const { data: rows } = await supabase
            .from("incidents")
            .select("*")
            .eq("user_id", userData.user.id)
            .order("created_at", { ascending: false });
          if (rows && rows.length > 0) {
            remote = rows as IncidentItem[];
          }
        }
      } catch {
        /* local fallback */
      }

      if (!cancelled) {
        const merged = mergeIncidents(local, remote);
        setItems(merged.length > 0 ? merged : SAMPLE_DEMO_INCIDENTS);
      }
    };

    loadHistory();
    window.addEventListener(INCIDENTS_CHANGE_EVENT, loadHistory);
    window.addEventListener("storage", loadHistory);

    return () => {
      cancelled = true;
      window.removeEventListener(INCIDENTS_CHANGE_EVENT, loadHistory);
      window.removeEventListener("storage", loadHistory);
    };
  }, []);

  useEffect(() => {
    if (incidentId) {
      setOpen(incidentId);
    }
  }, [incidentId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const selectedItem = items.find((item) => item.id === open) || matchedTokenItem;
    const noteEvents: EventItem[] = (selectedItem?.reviewer_notes ?? []).map((n) => ({
      id: n.id,
      event: `${n.author}: ${n.note}`,
      created_at: n.created_at,
    }));

    const defaultEvents: EventItem[] = [
      {
        id: "e1",
        event: "Incident report registered",
        created_at: selectedItem?.created_at ?? new Date(Date.now() - 10 * 60000).toISOString(),
      },
      {
        id: "e2",
        event: "Routed to LifeGuard Admin Desk",
        created_at: selectedItem?.created_at ?? new Date(Date.now() - 9 * 60000).toISOString(),
      },
    ];

    (async () => {
      try {
        const { data } = await supabase
          .from("incident_events")
          .select("id,event,created_at")
          .eq("incident_id", open)
          .order("created_at");
        if (!cancelled) {
          const base = data && data.length > 0 ? data : defaultEvents;
          setEvents([...noteEvents, ...base]);
        }
      } catch {
        if (!cancelled) {
          setEvents([...noteEvents, ...defaultEvents]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, items, matchedTokenItem]);

  const handleTokenLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const q = tokenQuery.trim();
    if (!q) {
      toast.error("Please enter your tracking token (e.g. TOKEN-LG-123456)");
      return;
    }
    const found = findIncidentByToken(q);
    if (found) {
      setMatchedTokenItem(found);
      setOpen(found.id);
      toast.success("Anonymous case located!");
    } else {
      setMatchedTokenItem(null);
      toast.error("No report found matching that tracking token.");
    }
  };

  return (
    <div className="px-5 pt-6 pb-12">
      {/* Sensible Back Button */}
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 -ml-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => nav({ to: "/home" })}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Button>
      </div>

      <h1 className="text-2xl font-bold">My Reports & Case Tracking</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Track all your submitted emergency alerts and reports in real time with audit trail.
      </p>

      {/* Anonymous Token Lookup */}
      <form
        onSubmit={handleTokenLookup}
        className="mt-5 rounded-2xl border border-rose-200/80 bg-[#FFF5F5] p-3.5 space-y-2.5"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
          <Lock className="h-3.5 w-3.5 text-[#C81E1E]" />
          <span>Track Anonymous Report by Token</span>
        </div>
        <div className="flex gap-2">
          <Input
            value={tokenQuery}
            onChange={(e) => setTokenQuery(e.target.value)}
            placeholder="TOKEN-LG-XXXXXX"
            className="h-10 rounded-xl bg-white text-xs font-mono"
          />
          <Button
            type="submit"
            size="sm"
            className="h-10 rounded-xl bg-[#C81E1E] hover:bg-red-700 text-white px-4 gap-1.5 text-xs font-semibold shrink-0"
          >
            <Search className="h-3.5 w-3.5" /> Lookup
          </Button>
        </div>
        {matchedTokenItem && (
          <div className="rounded-xl bg-white border border-rose-200 p-3 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">{matchedTokenItem.type}</span>
              <StatusBadge status={matchedTokenItem.status} />
            </div>
            <p className="text-slate-500">
              Token:{" "}
              <span className="font-mono font-semibold">{matchedTokenItem.tracking_token}</span>
              {matchedTokenItem.district ? ` · ${matchedTokenItem.district}` : ""}
            </p>
          </div>
        )}
      </form>

      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed p-8 text-center bg-card">
          <Calendar className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="mt-2 text-sm font-medium">No incident cases recorded yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Emergency alerts sent from your phone or wearable will show here.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((i) => {
            const isOpen = open === i.id;
            return (
              <li
                key={i.id}
                className={`rounded-2xl border bg-card p-4 transition-all shadow-2xs ${
                  isOpen ? "ring-2 ring-primary/20 border-primary/40" : "hover:border-border"
                }`}
              >
                <button
                  className="flex w-full items-center justify-between text-left"
                  onClick={() => setOpen(isOpen ? null : i.id)}
                >
                  <div className="space-y-1 pr-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-base text-foreground capitalize">
                        {i.type}{" "}
                        {i.is_test && (
                          <span className="text-xs text-muted-foreground font-normal">(Test)</span>
                        )}
                      </p>
                      {i.is_anonymous && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-[#C81E1E] border border-rose-200">
                          <Lock className="h-2.5 w-2.5" /> Anonymous
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(i.created_at).toLocaleString()}
                      {i.district ? ` · ${i.district}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={i.status} />
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="mt-4 space-y-3 border-t pt-3 text-sm animate-in fade-in">
                    {(i.tracking_token || i.description || i.location) && (
                      <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3 space-y-1.5 text-xs">
                        {i.tracking_token && (
                          <p className="font-mono font-bold text-[#C81E1E]">
                            Token: {i.tracking_token}
                          </p>
                        )}
                        {i.description && (
                          <p className="text-slate-700 leading-relaxed">{i.description}</p>
                        )}
                        {i.location && (
                          <p className="text-slate-500">
                            <span className="font-semibold text-slate-700">Reported Location:</span>{" "}
                            {i.location}
                          </p>
                        )}
                        {i.evidence_names && i.evidence_names.length > 0 && (
                          <p className="text-slate-500 flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" />
                            <span>Evidence: {i.evidence_names.join(", ")}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {/* Location & GPS */}
                    <div className="flex items-center justify-between rounded-xl bg-secondary/50 p-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-accent" />
                        <div>
                          <p className="text-xs font-medium text-foreground">GPS Location</p>
                          {i.latitude != null && i.longitude != null ? (
                            <p className="text-xs text-muted-foreground">
                              {i.latitude.toFixed(5)}, {i.longitude.toFixed(5)}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">Location not attached</p>
                          )}
                        </div>
                      </div>

                      {i.latitude != null && i.longitude != null && (
                        <a
                          className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
                          href={mapLink(i.latitude, i.longitude)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Share2 className="h-3.5 w-3.5" /> Open Map
                        </a>
                      )}
                    </div>

                    {/* Vitals */}
                    {(i.heart_rate || i.spo2) && (
                      <div className="flex items-center gap-4 text-xs font-medium rounded-xl bg-card border p-3">
                        <Activity className="h-4 w-4 text-primary" />
                        <span>Heart Rate: {i.heart_rate ? `${i.heart_rate} bpm` : "—"}</span>
                        <span>·</span>
                        <span>SpO₂: {i.spo2 ? `${i.spo2}%` : "—"}</span>
                      </div>
                    )}

                    {/* Timeline Event Audit Log */}
                    <div className="space-y-1.5 pt-1">
                      <p className="text-xs font-semibold text-foreground">
                        Case Timeline & Status Updates
                      </p>
                      <ul className="space-y-2 rounded-xl bg-muted/40 p-3">
                        {events.map((e) => (
                          <li key={e.id} className="text-xs flex items-start gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                            <div>
                              <span className="font-semibold text-foreground">{e.event}</span>
                              <span className="block text-[11px] text-muted-foreground">
                                {new Date(e.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
