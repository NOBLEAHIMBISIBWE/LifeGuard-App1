import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { mapLink } from "@/lib/location";

export const Route = createFileRoute("/_app/responder")({
  head: () => ({
    meta: [
      { title: "Responder console — LifeGuard" },
      { name: "description", content: "Active LifeGuard incidents for authorized responders." },
      { property: "og:title", content: "Responder console — LifeGuard" },
      { property: "og:description", content: "Active incidents for responders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Responder,
});

type I = {
  id: string;
  type: string;
  status: string;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  heart_rate: number | null;
  spo2: number | null;
  is_test: boolean;
};

function Responder() {
  const { roles, user } = useAuth();
  const [items, setItems] = useState<I[]>([]);
  const allowed = roles.includes("responder") || roles.includes("admin");
  const load = () =>
    supabase
      .from("incidents")
      .select("*")
      .in("status", ["delivered", "acknowledged", "sending"])
      .eq("is_test", false)
      .order("created_at", { ascending: false })
      .then(({ data }) => setItems(data ?? []));
  useEffect(() => {
    if (!allowed) return;
    load();
    const ch = supabase
      .channel(`resp-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [allowed]);

  async function setStatus(id: string, status: "acknowledged" | "resolved") {
    await supabase.from("incidents").update({ status, responder_id: user!.id }).eq("id", id);
    await supabase
      .from("incident_events")
      .insert({ incident_id: id, event: `Responder marked ${status}` });
    load();
  }

  if (!allowed) return <p className="px-5 pt-6 text-muted-foreground">Responder access only.</p>;
  return (
    <div className="px-5 pt-6">
      <h1 className="text-2xl font-bold">Active incidents</h1>
      {items.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">No active incidents.</p>
      )}
      <ul className="mt-4 space-y-3">
        {items.map((i) => (
          <li key={i.id} className="rounded-xl bg-card p-4">
            <div className="flex justify-between">
              <p className="font-medium capitalize">{i.type}</p>
              <StatusBadge status={i.status} />
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(i.created_at).toLocaleString()}
            </p>
            {i.latitude != null && i.longitude != null && (
              <a
                className="mt-1 block text-sm text-accent underline"
                href={mapLink(i.latitude, i.longitude)}
                target="_blank"
                rel="noreferrer"
              >
                Open location
              </a>
            )}
            {(i.heart_rate || i.spo2) && (
              <p className="text-sm text-muted-foreground">
                HR {i.heart_rate ?? "—"} · SpO₂ {i.spo2 ?? "—"}%
              </p>
            )}
            <div className="mt-3 flex gap-2">
              {i.status !== "acknowledged" && (
                <Button size="sm" onClick={() => setStatus(i.id, "acknowledged")}>
                  Acknowledge
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => setStatus(i.id, "resolved")}>
                Resolve
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
