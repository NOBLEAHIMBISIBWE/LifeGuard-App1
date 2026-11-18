import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  HeartPulse,
  Car,
  ShieldAlert,
  HelpCircle,
  Phone,
  Share2,
  X,
  ArrowLeft,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  mapCategoryToIncidentType,
  saveLocalIncident,
  updateLocalIncidentStatus,
} from "@/lib/incidents";
import { useLocation, mapEmbed, mapLink } from "@/lib/location";
import { useWearable, isStale } from "@/lib/ble";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";

type IType = "medical" | "fall" | "safety" | "other";

export const Route = createFileRoute("/_app/sos")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { source?: string | undefined; test?: boolean | undefined } => ({
    source: typeof s["source"] === "string" ? (s["source"] as string) : undefined,
    test: s["test"] === true || s["test"] === "true" ? true : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Emergency SOS — LifeGuard" },
      {
        name: "description",
        content: "Send an emergency alert with your location to your contacts and responders.",
      },
      { property: "og:title", content: "Emergency SOS — LifeGuard" },
      { property: "og:description", content: "Send an emergency alert with your location." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SosPage,
});

const TYPES: { id: IType; label: string; icon: typeof Car }[] = [
  { id: "medical", label: "Medical", icon: HeartPulse },
  { id: "fall", label: "Accident / fall", icon: Car },
  { id: "safety", label: "Personal safety", icon: ShieldAlert },
  { id: "other", label: "Other", icon: HelpCircle },
];
const COUNTDOWN = 5;

function SosPage() {
  const { source, test } = Route.useSearch();
  const nav = useNavigate();
  const { user } = useAuth();
  const { fix } = useLocation();
  const w = useWearable();
  const [type, setType] = useState<IType>(source === "wearable" ? "other" : "medical");
  const [count, setCount] = useState(COUNTDOWN);
  const [incident, setIncident] = useState<{ id: string; status: string } | null>(null);
  const [shareHealth, setShareHealth] = useState(false);
  const sent = useRef(false);
  const fixRef = useRef(fix);
  fixRef.current = fix;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase
        .from("profiles")
        .select("share_health")
        .eq("id", data.user.id)
        .single()
        .then(({ data: p }) => setShareHealth(!!p?.share_health));
    });
  }, []);

  useEffect(() => {
    if (incident) return;
    if (count <= 0) {
      send();
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, incident]);

  useEffect(() => {
    if (!incident || !incident.id) return;
    const ch = supabase
      .channel(`inc-${incident.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "incidents", filter: `id=eq.${incident.id}` },
        (p) => setIncident({ id: incident.id, status: (p.new as { status: string }).status }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [incident?.id]);

  useEffect(() => {
    if (!incident || !fix || ["cancelled", "resolved"].includes(incident.status) || !incident.id)
      return;
    supabase
      .from("incidents")
      .update({
        latitude: fix.lat,
        longitude: fix.lng,
        accuracy: fix.accuracy,
        updated_at: new Date().toISOString(),
      })
      .eq("id", incident.id)
      .then();
  }, [fix?.at, incident?.id]);

  async function send() {
    if (sent.current) return;
    sent.current = true;
    const f = fixRef.current;
    const vitalsOk = shareHealth && !isStale(w.vitals.at);
    const incidentId = `inc-${Date.now()}`;
    const labelMap: Record<IType, string> = {
      medical: "Medical Emergency",
      fall: "Accident / Fall",
      safety: "Personal Safety / SOS",
      other: "Emergency SOS Alert",
    };

    const senderNameMeta = user?.user_metadata?.["full_name"];
    const senderPhoneMeta = user?.user_metadata?.["phone"];
    const senderNinMeta = user?.user_metadata?.["nin"];
    const senderDetails = {
      user_id: user?.id ?? null,
      sender_name:
        (typeof senderNameMeta === "string" && senderNameMeta.trim()) ||
        user?.email?.split("@")[0] ||
        "SOS User",
      sender_email: user?.email ?? null,
      sender_phone: typeof senderPhoneMeta === "string" ? senderPhoneMeta : null,
      sender_nin: typeof senderNinMeta === "string" ? senderNinMeta : null,
      description: `SOS alert triggered via ${source ?? "app"}${test ? " (Test Mode)" : ""}.`,
    };

    try {
      const { data, error } = await supabase
        .from("incidents")
        .insert({
          type,
          is_test: !!test,
          status: "delivered",
          latitude: f?.lat ?? null,
          longitude: f?.lng ?? null,
          accuracy: f?.accuracy ?? null,
          heart_rate: vitalsOk ? w.vitals.hr : null,
          spo2: vitalsOk ? w.vitals.spo2 : null,
        })
        .select("id,status")
        .single();

      const resolvedId = !error && data ? data.id : incidentId;
      const resolvedStatus = !error && data ? data.status : "delivered";

      saveLocalIncident({
        id: resolvedId,
        type: labelMap[type],
        db_type: mapCategoryToIncidentType(type),
        status: resolvedStatus,
        created_at: new Date().toISOString(),
        is_test: !!test,
        latitude: f?.lat ?? null,
        longitude: f?.lng ?? null,
        accuracy: f?.accuracy ?? null,
        coordinate_source: f ? "gps" : null,
        heart_rate: vitalsOk ? w.vitals.hr : null,
        spo2: vitalsOk ? w.vitals.spo2 : null,
        ...senderDetails,
      });

      if (!error && data) {
        setIncident(data);
        await supabase.from("incident_events").insert({
          incident_id: data.id,
          event: `Alert created (${source ?? "app"})${test ? " — TEST" : ""}`,
        });
      } else {
        setIncident({ id: resolvedId, status: resolvedStatus });
      }
    } catch {
      saveLocalIncident({
        id: incidentId,
        type: labelMap[type],
        db_type: mapCategoryToIncidentType(type),
        status: "delivered",
        created_at: new Date().toISOString(),
        is_test: !!test,
        latitude: f?.lat ?? null,
        longitude: f?.lng ?? null,
        accuracy: f?.accuracy ?? null,
        coordinate_source: f ? "gps" : null,
        heart_rate: vitalsOk ? w.vitals.hr : null,
        spo2: vitalsOk ? w.vitals.spo2 : null,
        ...senderDetails,
      });
      setIncident({ id: incidentId, status: "delivered" });
    }
  }

  async function cancel() {
    if (!incident) {
      nav({ to: "/home" });
      return;
    }
    updateLocalIncidentStatus(incident.id, "cancelled");
    if (incident.id) {
      try {
        await supabase.from("incidents").update({ status: "cancelled" }).eq("id", incident.id);
        await supabase
          .from("incident_events")
          .insert({ incident_id: incident.id, event: "Cancelled by user" });
      } catch {
        /* ignore */
      }
    }
    toast("Alert cancelled — kept in your history");
    nav({ to: "/home" });
  }

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

      <h1 className="text-2xl font-bold">{test ? "Test Alert" : "Emergency SOS Alert"}</h1>

      {!incident ? (
        <>
          <div className="my-8 flex flex-col items-center">
            <div className="sos-button flex h-40 w-40 items-center justify-center rounded-full font-display text-6xl font-bold text-primary-foreground">
              {count}
            </div>
            <p className="mt-6 text-center text-sm font-medium text-muted-foreground">
              Sending in {count}s. Pick what's happening:
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {TYPES.map(({ id, label, icon: I }) => (
              <button
                key={id}
                onClick={() => setType(id)}
                className={`rounded-2xl border-2 p-4 text-left transition-all ${
                  type === id ? "border-primary bg-primary/10 shadow-xs" : "border-border bg-card"
                }`}
              >
                <I className="h-5 w-5 text-primary" />
                <p className="mt-2 text-sm font-semibold text-foreground">{label}</p>
              </button>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button size="lg" variant="secondary" onClick={cancel}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button size="lg" onClick={() => setCount(0)}>
              Send Now
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between rounded-2xl border bg-card p-4 shadow-xs">
            <span className="text-sm font-medium">Alert Status</span>
            <StatusBadge status={incident.status} />
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            Your emergency alert is active and visible to LifeGuard responders and contacts.
          </p>

          {fix ? (
            <div className="mt-4 overflow-hidden rounded-2xl border bg-card shadow-xs">
              <iframe
                title="Your location"
                src={mapEmbed(fix.lat, fix.lng)}
                className="h-52 w-full border-0"
              />
              <div className="flex items-center justify-between p-3 text-xs bg-muted/50">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                  Sharing Live GPS · ±{Math.round(fix.accuracy)} m
                </span>
                <button
                  className="flex items-center gap-1 text-accent font-medium hover:underline"
                  onClick={() => {
                    navigator.clipboard.writeText(mapLink(fix.lat, fix.lng));
                    toast.success("Location link copied");
                  }}
                >
                  <Share2 className="h-3.5 w-3.5" /> Copy Link
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-warning">
              Location unavailable — allow location access.
            </p>
          )}

          <div className="mt-6 grid gap-3">
            <Button asChild size="lg" className="w-full">
              <a href="tel:112">
                <Phone className="h-4 w-4 mr-1.5" /> Call Security / Police (112)
              </a>
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="w-full gap-2"
              onClick={() => nav({ to: "/history", search: { incidentId: incident.id } })}
            >
              <FileText className="h-4 w-4" /> View Case in Tracking History
            </Button>

            {!["cancelled", "resolved"].includes(incident.status) && (
              <Button size="lg" variant="secondary" onClick={cancel}>
                Cancel Alert — false alarm
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
