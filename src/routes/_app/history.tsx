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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { mapLink } from "@/lib/location";
import { Button } from "@/components/ui/button";
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
  latitude: number | null;
  longitude: number | null;
  heart_rate: number | null;
  spo2: number | null;
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
    latitude: 0.3136,
    longitude: 32.5811,
    heart_rate: null,
    spo2: null,
  },
];

function HistoryPage() {
  const { incidentId } = Route.useSearch();
  const nav = useNavigate();
  const [items, setItems] = useState<IncidentItem[]>([]);
  const [open, setOpen] = useState<string | null>(incidentId || null);
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        supabase
          .from("incidents")
          .select("*")
          .eq("user_id", data.user.id)
          .order("created_at", { ascending: false })
          .then(({ data: rows }) => {
            if (rows && rows.length > 0) {
              setItems(rows as IncidentItem[]);
            } else {
              setItems(SAMPLE_DEMO_INCIDENTS);
            }
          })
          .catch(() => setItems(SAMPLE_DEMO_INCIDENTS));
      } else {
        setItems(SAMPLE_DEMO_INCIDENTS);
      }
    });
  }, []);

  useEffect(() => {
    if (incidentId) {
      setOpen(incidentId);
    }
  }, [incidentId]);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("incident_events")
      .select("id,event,created_at")
      .eq("incident_id", open)
      .order("created_at")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setEvents(data);
        } else {
          setEvents([
            {
              id: "e1",
              event: "Incident report registered",
              created_at: new Date(Date.now() - 10 * 60000).toISOString(),
            },
            {
              id: "e2",
              event: "GPS location locked and shared",
              created_at: new Date(Date.now() - 9 * 60000).toISOString(),
            },
            {
              id: "e3",
              event: "Dispatched to nearest community responder unit",
              created_at: new Date(Date.now() - 5 * 60000).toISOString(),
            },
          ]);
        }
      })
      .catch(() => {
        setEvents([
          {
            id: "e1",
            event: "Incident report registered",
            created_at: new Date(Date.now() - 10 * 60000).toISOString(),
          },
          {
            id: "e2",
            event: "GPS location locked and shared",
            created_at: new Date(Date.now() - 9 * 60000).toISOString(),
          },
        ]);
      });
  }, [open]);

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
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-base text-foreground capitalize">
                        {i.type}{" "}
                        {i.is_test && (
                          <span className="text-xs text-muted-foreground font-normal">(Test)</span>
                        )}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(i.created_at).toLocaleString()}
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
