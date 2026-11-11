import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bluetooth, HeartPulse, Droplet } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useWearable, connectWearable, disconnectWearable, isStale } from "@/lib/ble";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_app/device")({
  head: () => ({
    meta: [
      { title: "Health & wearable — LifeGuard" },
      {
        name: "description",
        content: "Connect your LifeGuard wearable and review heart rate and SpO₂ readings.",
      },
      { property: "og:title", content: "Health & wearable — LifeGuard" },
      { property: "og:description", content: "Wearable connection and health readings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DevicePage,
});

type R = { recorded_at: string; heart_rate: number | null; spo2: number | null };

function DevicePage() {
  const w = useWearable();
  const [hist, setHist] = useState<R[]>([]);
  const [share, setShare] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("health_readings")
      .select("recorded_at,heart_rate,spo2")
      .order("recorded_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setHist((data ?? []).reverse()));
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUid(data.user.id);
      supabase
        .from("profiles")
        .select("share_health")
        .eq("id", data.user.id)
        .single()
        .then(({ data: p }) => setShare(!!p?.share_health));
    });
  }, [w.lastSync]);

  const stale = isStale(w.vitals.at);
  const lowQ = w.vitals.quality != null && w.vitals.quality < 50;

  return (
    <div className="px-5 pt-6">
      <h1 className="text-2xl font-bold">Health & wearable</h1>

      <section className="mt-4 rounded-xl bg-card p-4">
        <div className="flex items-center gap-3">
          <Bluetooth
            className={
              w.status === "connected" ? "h-6 w-6 text-success" : "h-6 w-6 text-muted-foreground"
            }
          />
          <div className="flex-1">
            <p className="font-medium">{w.deviceName ?? "No wearable"}</p>
            <p className="text-xs capitalize text-muted-foreground">
              {w.status}
              {w.battery != null && ` · battery ${w.battery}%`}
              {w.lastSync && ` · synced ${new Date(w.lastSync).toLocaleTimeString()}`}
            </p>
          </div>
        </div>
        {w.status === "unsupported" ? (
          <p className="mt-3 text-sm text-warning">
            This browser can't use Bluetooth. Open LifeGuard in Chrome on Android or desktop.
          </p>
        ) : w.status === "connected" ? (
          <Button variant="secondary" className="mt-3 w-full" onClick={disconnectWearable}>
            Disconnect
          </Button>
        ) : (
          <Button
            className="mt-3 w-full"
            disabled={w.status === "scanning"}
            onClick={() => connectWearable().catch((e) => toast.error(e.message))}
          >
            {w.status === "scanning" ? "Scanning…" : "Scan & connect"}
          </Button>
        )}
        <Button asChild variant="ghost" className="mt-2 w-full">
          <Link to="/sos" search={{ test: true }}>
            Test SOS (no real alert to responders)
          </Link>
        </Button>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Reading
          icon={HeartPulse}
          label="Heart rate"
          value={w.vitals.hr}
          unit="bpm"
          stale={stale}
        />
        <Reading
          icon={Droplet}
          label="SpO₂ (estimated)"
          value={w.vitals.spo2}
          unit="%"
          stale={stale}
        />
      </div>
      {lowQ && (
        <p className="mt-2 text-xs text-warning">
          Signal quality is low — reading may be unreliable.
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Screening readings only, not a medical diagnosis.
      </p>

      <section className="mt-6 rounded-xl bg-card p-4">
        <h2 className="mb-2 font-semibold">History</h2>
        {hist.length < 2 ? (
          <p className="text-sm text-muted-foreground">
            No readings recorded yet. Connect your wearable to start.
          </p>
        ) : (
          <div className="h-48">
            <ResponsiveContainer>
              <LineChart
                data={hist.map((r) => ({
                  t: new Date(r.recorded_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  hr: r.heart_rate,
                  spo2: r.spo2,
                }))}
              >
                <XAxis dataKey="t" stroke="var(--muted-foreground)" fontSize={10} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "none" }} />
                <Line dataKey="hr" stroke="var(--chart-1)" dot={false} name="HR" />
                <Line dataKey="spo2" stroke="var(--chart-2)" dot={false} name="SpO₂" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="mt-4 flex items-center justify-between rounded-xl bg-card p-4">
        <div>
          <p className="font-medium">Include readings in alerts</p>
          <p className="text-xs text-muted-foreground">
            Responders see your latest vitals when you send SOS.
          </p>
        </div>
        <Switch
          checked={share}
          onCheckedChange={async (v) => {
            setShare(v);
            if (uid) await supabase.from("profiles").update({ share_health: v }).eq("id", uid);
          }}
        />
      </section>
    </div>
  );
}

function Reading({
  icon: I,
  label,
  value,
  unit,
  stale,
}: {
  icon: typeof Droplet;
  label: string;
  value: number | null;
  unit: string;
  stale: boolean;
}) {
  return (
    <div className="rounded-xl bg-card p-4">
      <I className="h-5 w-5 text-primary" />
      <p className="mt-2 text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-bold">
        {value && !stale ? `${value}` : "—"}
        <span className="ml-1 text-sm font-normal text-muted-foreground">
          {value && !stale ? unit : stale && value ? "stale" : "no data"}
        </span>
      </p>
    </div>
  );
}
