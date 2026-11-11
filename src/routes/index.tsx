import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { HeartPulse, MapPin, Bluetooth, BellRing, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LifeGuard — Smart Emergency Response" },
      {
        name: "description",
        content:
          "One tap or a wearable button alerts your trusted contacts and responders with your location.",
      },
      { property: "og:title", content: "LifeGuard — Smart Emergency Response" },
      {
        property: "og:description",
        content:
          "Wearable-connected SOS, live location and health readings for you and the people who care.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Onboarding,
});

const perms = [
  {
    icon: MapPin,
    t: "Location",
    d: "Shared only during an emergency you start. You'll always see when it's on.",
  },
  {
    icon: Bluetooth,
    t: "Bluetooth",
    d: "Connects your LifeGuard wearable for SOS presses and readings.",
  },
  {
    icon: HeartPulse,
    t: "Health sensors",
    d: "Heart rate and SpO₂ are screening readings, not a medical diagnosis.",
  },
  {
    icon: BellRing,
    t: "Notifications",
    d: "Lets responders and contacts reach you about an incident.",
  },
];

function Onboarding() {
  const { user } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (user) nav({ to: "/home" });
  }, [user, nav]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-7 w-7 text-primary" />
        <span className="font-display text-xl font-bold">LifeGuard</span>
      </div>
      <h1 className="mt-10 text-4xl font-bold leading-tight">
        Your safety is a <span className="text-primary">priority.</span>
      </h1>
      <p className="mt-3 text-muted-foreground">
        Your wearable and phone work together to alert the people you trust — with your location —
        when something goes wrong.
      </p>
      <ul className="mt-8 space-y-4">
        {perms.map(({ icon: I, t, d }) => (
          <li key={t} className="flex gap-3 rounded-xl bg-card p-4">
            <I className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div>
              <p className="font-medium">{t}</p>
              <p className="text-sm text-muted-foreground">{d}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs text-muted-foreground">
        Privacy: we store only your name, phone, contacts and incidents. Your data is never sold.
        LifeGuard does not contact public emergency services automatically.
      </p>
      <div className="mt-auto space-y-3 pt-8">
        <Button asChild size="lg" className="w-full">
          <Link to="/auth" search={{ mode: "signup" }}>
            I agree — create account
          </Link>
        </Button>
        <Button asChild size="lg" variant="secondary" className="w-full">
          <Link to="/auth" search={{ mode: "signin" }}>
            I already have an account
          </Link>
        </Button>
      </div>
    </main>
  );
}
