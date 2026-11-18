import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bell,
  X,
  ChevronRight,
  Shield,
  PlusCircle,
  Folder,
  ShieldAlert,
  AlertTriangle,
  MessageSquare,
  Upload,
  Siren,
  Send,
  Bot,
  Lock,
  Copy,
  Check,
  ShieldCheck,
  MapPin,
  LocateFixed,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveReportCoordinates, useLocation } from "@/lib/location";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { mapCategoryToIncidentType, saveLocalIncident } from "@/lib/incidents";

const UGANDA_DISTRICTS = [
  "Kampala",
  "Wakiso",
  "Mukono",
  "Jinja",
  "Gulu",
  "Mbarara",
  "Arua",
  "Mbale",
  "Kasese",
  "Masaka",
  "Hoima",
  "Fort Portal / Kabarole",
  "Lira",
  "Soroti",
  "Kabale",
  "Tororo",
  "Entebbe",
  "Other",
];

async function uploadIncidentEvidence(userId: string, incidentId: string, files: File[]): Promise<string[]> {
  if (files.length > 10) throw new Error("You can attach up to 10 evidence files.");
  const uploaded: string[] = [];
  try {
    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) {
        throw new Error(`${file.name} exceeds the 20 MB file limit.`);
      }
      if (!["image/jpeg", "image/png", "image/webp", "image/heic", "video/mp4", "video/webm", "audio/mpeg", "audio/mp4", "audio/wav", "audio/webm"].includes(file.type)) {
        throw new Error(`${file.name} has an unsupported file type.`);
      }
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
      const path = `${userId}/${incidentId}/${crypto.randomUUID()}-${safeName}`;
      const { error } = await supabase.storage.from("incident-evidence").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      uploaded.push(path);
    }
    return uploaded;
  } catch (error) {
    if (uploaded.length) await supabase.storage.from("incident-evidence").remove(uploaded);
    throw error;
  }
}

export const Route = createFileRoute("/_app/home")({
  validateSearch: (s: Record<string, unknown>): { chat?: boolean | undefined } => ({
    chat: s["chat"] === true || s["chat"] === "true" ? true : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Home — LifeGuard" },
      {
        name: "description",
        content: "Uganda National GBV Platform — Report safely and confidentially.",
      },
      { property: "og:title", content: "LifeGuard — Home Dashboard" },
      {
        property: "og:description",
        content: "Uganda National GBV Platform — Report safely and confidentially.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const search = Route.useSearch();
  const { fix, error: gpsError, locating, refresh: refreshGps } = useLocation();
  const { user } = useAuth();
  const nav = useNavigate();

  const [showReportModal, setShowReportModal] = useState(false);
  const [showAnonymousModal, setShowAnonymousModal] = useState(false);
  const [anonymousToken, setAnonymousToken] = useState("");
  const [anonymousSavedRemotely, setAnonymousSavedRemotely] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [showChatModal, setShowChatModal] = useState(Boolean(search.chat));
  const [reporting, setReporting] = useState(false);

  // Chat support states
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "bot"; text: string }>>(
    [
      {
        sender: "bot",
        text: "Hello. I am LifeGuard's automated support guide. This chat is not monitored by a counselor and cannot dispatch emergency services. If you are in immediate danger, call Police 999 or the GBV Helpline 0800 200 600.",
      },
    ],
  );
  const [inputMessage, setInputMessage] = useState("");

  useEffect(() => {
    if (search.chat) {
      setShowChatModal(true);
    }
  }, [search.chat]);

  async function handleReportSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setReporting(true);
    const f = new FormData(e.currentTarget);
    const category = String(f.get("type") ?? "").trim();
    const district = String(f.get("district") ?? "").trim();
    const description = String(f.get("description") ?? "").trim();
    const locationText = String(f.get("location") ?? "").trim();
    const personsInvolved = String(f.get("persons_involved") ?? "").trim();
    const dateOfIncident = String(f.get("date_of_incident") ?? "").trim();
    const files = f.getAll("photos").filter((v): v is File => v instanceof File && v.size > 0);
    const dbType = mapCategoryToIncidentType(category);
    const localId = `inc-${Date.now()}`;

    try {
      const coords = await resolveReportCoordinates({
        fix,
        locationText,
        district,
      });

      let savedId = localId;
      let remoteSaved = false;
      try {
        const { data, error: err } = await supabase
          .from("incidents")
          .insert({
            type: dbType,
            status: "delivered",
            is_test: false,
            is_anonymous: false,
            district,
            description,
            location: locationText,
            persons_involved: personsInvolved || null,
            date_of_incident: dateOfIncident ? new Date(dateOfIncident).toISOString() : null,
            evidence_names: [],
            sender_name:
              (typeof user?.user_metadata?.["full_name"] === "string" &&
                user.user_metadata["full_name"].trim()) ||
              user?.email?.split("@")[0] ||
              "Registered Citizen",
            sender_email: user?.email ?? null,
            sender_phone:
              typeof user?.user_metadata?.["phone"] === "string"
                ? user.user_metadata["phone"]
                : null,
            sender_nin:
              typeof user?.user_metadata?.["nin"] === "string"
                ? user.user_metadata["nin"]
                : null,
            coordinate_source: coords.source,
            latitude: coords.lat,
            longitude: coords.lng,
            accuracy: coords.accuracy,
          })
          .select("id")
          .single();

        if (err) {
          console.warn("Incident insert notice:", err.message);
        } else if (data?.id) {
          savedId = data.id;
          remoteSaved = true;
        }
      } catch {
        /* local persistence fallback */
      }

      let evidenceReferences = files.map((file) => file.name);
      if (files.length > 0 && user?.id && savedId !== localId) {
        try {
          evidenceReferences = await uploadIncidentEvidence(user.id, savedId, files);
          const { error: evidenceUpdateError } = await supabase
            .from("incidents")
            .update({ evidence_names: evidenceReferences })
            .eq("id", savedId);
          if (evidenceUpdateError) throw evidenceUpdateError;
        } catch (evidenceError) {
          evidenceReferences = files.map((file) => file.name);
          toast.warning("Your report was sent, but evidence upload failed. Please contact support to attach the files.");
          console.warn("Evidence upload failed:", evidenceError);
        }
      } else if (files.length > 0) {
        toast.warning("Your report was saved locally, but attachments could not be uploaded because the case is not yet saved to your account.");
      }

      const senderNameMeta = user?.user_metadata?.["full_name"];
      const senderPhoneMeta = user?.user_metadata?.["phone"];
      const senderNinMeta = user?.user_metadata?.["nin"];

      saveLocalIncident({
        id: savedId,
        type: category || dbType,
        db_type: dbType,
        status: "submitted",
        created_at: new Date().toISOString(),
        is_test: false,
        is_anonymous: false,
        district,
        description,
        location: locationText,
        persons_involved: personsInvolved,
        date_of_incident: dateOfIncident,
        evidence_names: evidenceReferences,
        latitude: coords.lat,
        longitude: coords.lng,
        accuracy: coords.accuracy,
        coordinate_source: coords.source,
        heart_rate: null,
        spo2: null,
        user_id: user?.id ?? null,
        sender_name:
          (typeof senderNameMeta === "string" && senderNameMeta.trim()) ||
          user?.email?.split("@")[0] ||
          "Registered Citizen",
        sender_email: user?.email ?? null,
        sender_phone: typeof senderPhoneMeta === "string" ? senderPhoneMeta : null,
        sender_nin: typeof senderNinMeta === "string" ? senderNinMeta : null,
        reviewer_notes: [],
      });

      if (remoteSaved) {
        toast.success("Your incident report was sent to the LifeGuard response system.");
      } else {
        toast.error("This report is saved only on this device. It has NOT reached the LifeGuard response team. Check your connection and submit again.");
      }
      setShowReportModal(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setReporting(false);
    }
  }

  async function handleAnonymousReportSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setReporting(true);
    const f = new FormData(e.currentTarget);
    const category = String(f.get("type") ?? "").trim();
    const district = String(f.get("district") ?? "").trim();
    const description = String(f.get("description") ?? "").trim();
    const locationText = String(f.get("location") ?? "").trim();
    const dateOfIncident = String(f.get("date_of_incident") ?? "").trim();
    const files = f.getAll("photos").filter((v): v is File => v instanceof File && v.size > 0);
    if (files.length > 0) {
      toast.error("For your privacy, anonymous evidence uploads are not enabled yet. Submit without attachments or sign in to upload evidence securely.");
      setReporting(false);
      return;
    }
    const dbType = mapCategoryToIncidentType(category);
    const token = `TOKEN-LG-${crypto.randomUUID().replaceAll("-", "").slice(0, 20).toUpperCase()}`;
    const localId = crypto.randomUUID();

    try {
      const coords = await resolveReportCoordinates({
        fix,
        locationText,
        district,
      });

      let savedId = localId;
      let remoteSaved = false;
      try {
        const { data, error: err } = await supabase
          .from("incidents")
          .insert({
            id: localId,
            type: dbType,
            status: "delivered",
            is_test: false,
            is_anonymous: true,
            tracking_token: token,
            district,
            description,
            location: locationText,
            date_of_incident: dateOfIncident ? new Date(dateOfIncident).toISOString() : null,
            evidence_names: files.map((file) => file.name),
            coordinate_source: coords.source,
            latitude: coords.lat,
            longitude: coords.lng,
            accuracy: coords.accuracy,
          });

        if (err) {
          console.warn("Anonymous incident insert notice:", err.message);
        } else {
          savedId = localId;
          remoteSaved = true;
        }
      } catch {
        /* local persistence fallback */
      }

      saveLocalIncident({
        id: savedId,
        type: category || dbType,
        db_type: dbType,
        status: "submitted",
        created_at: new Date().toISOString(),
        is_test: false,
        is_anonymous: true,
        tracking_token: token,
        district,
        description,
        location: locationText,
        date_of_incident: dateOfIncident,
        evidence_names: files.map((file) => file.name),
        latitude: coords.lat,
        longitude: coords.lng,
        accuracy: coords.accuracy,
        coordinate_source: coords.source,
        heart_rate: null,
        spo2: null,
        user_id: null,
        sender_name: "Anonymous Sender",
        sender_email: null,
        sender_phone: null,
        sender_nin: null,
        reviewer_notes: [],
      });

      setAnonymousToken(token);
      setAnonymousSavedRemotely(remoteSaved);
      if (remoteSaved) {
        toast.success("Your anonymous report was sent to the LifeGuard response system.");
      } else {
        toast.error("This anonymous report is saved only on this device. It has NOT reached the LifeGuard response team. Keep the token and submit again when your connection is restored.");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setReporting(false);
    }
  }

  const handleCopyToken = () => {
    if (!anonymousToken) return;
    navigator.clipboard.writeText(anonymousToken);
    setCopiedToken(true);
    toast.success("Tracking token copied to clipboard!");
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage.trim();
    setChatMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setInputMessage("");

    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Thank you for reaching out. This automated guide cannot contact a counselor or emergency services. If you need immediate help, call Police 999 or the GBV Helpline 0800 200 600. To request case follow-up, submit a report through LifeGuard.",
        },
      ]);
    }, 1000);
  };

  const fullNameMeta = user?.user_metadata?.["full_name"];
  const userInitial =
    (typeof fullNameMeta === "string" && fullNameMeta[0]?.toUpperCase()) ||
    user?.email?.[0]?.toUpperCase() ||
    "U";

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 pb-10">
      {/* 1. Top Red Navigation Header Bar */}
      <header className="bg-[#C81E1E] text-white px-5 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-full overflow-hidden border border-white/30 bg-[#E65100] shrink-0">
            <img
              src="/assets/aistudio/1_c465c970.jpeg"
              alt="LifeGuard Avatar"
              className="w-full h-full object-cover object-top scale-125"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">LifeGuard</h1>
            <span className="text-[11px] font-normal text-white/80 leading-tight block truncate max-w-[180px]">
              Uganda National GBV Platf...
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            to="/admin"
            className="p-1.5 text-white/90 hover:text-white transition-colors"
            title="Admin Dashboard"
          >
            <ShieldCheck className="h-5 w-5" />
          </Link>

          <button
            type="button"
            onClick={() => toast.info("No new notifications")}
            className="p-1.5 text-white/90 hover:text-white transition-colors relative"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => nav({ to: "/settings" })}
              className="w-8 h-8 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center font-bold text-xs shadow-2xs hover:bg-amber-300 transition-colors"
              title="Settings & Profile"
            >
              {userInitial}
            </button>
          </div>
        </div>
      </header>

      <div className="px-5 pt-4 space-y-4">
        {/* 2. Top Emergency Danger Pill Banner */}
        <Link
          to="/contacts"
          className="bg-[#A61C1C] hover:bg-[#8F1717] text-white rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <Siren className="h-4 w-4 text-white animate-pulse" />
            </div>
            <p className="text-xs md:text-sm font-semibold text-white leading-tight">
              In immediate danger? Tap here for emergency contacts.
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-white/80 shrink-0" />
        </Link>

        {/* 3. Main Red Hero Card */}
        <div className="bg-[#C81E1E] text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
          <div className="bg-white/10 p-2.5 rounded-2xl inline-flex text-white mb-2">
            <Shield className="h-6 w-6" />
          </div>

          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white leading-snug">
            Your voice matters. Your safety matters.
          </h2>

          <p className="text-xs md:text-sm text-white/90 leading-relaxed font-normal mt-2.5 mb-6">
            Report GBV or sexual harassment safely and confidentially. Every report is reviewed by
            trained officials.
          </p>

          <Button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="w-full h-12 bg-[#F59E0B] hover:bg-[#D97706] active:bg-[#B45309] text-white font-bold text-sm md:text-base rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all duration-150"
          >
            <PlusCircle className="h-5 w-5 text-white" />
            Report an Incident
          </Button>
        </div>

        {/* 4. Section Title */}
        <div className="pt-2">
          <h3 className="text-lg font-bold text-slate-900">Quick Actions</h3>

          {/* 5. Quick Actions 2x2 Grid */}
          <div className="grid grid-cols-2 gap-3.5 mt-3">
            {/* Card 1: My Reports */}
            <Link
              to="/history"
              className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between min-h-[140px]"
            >
              <div>
                <div className="bg-blue-50 text-blue-600 rounded-xl p-2.5 w-10 h-10 flex items-center justify-center mb-3">
                  <Folder className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-sm text-slate-900">My Reports</h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-tight">
                  Track your submitted cases
                </p>
              </div>
            </Link>

            {/* Card 2: Support Services */}
            <Link
              to="/contacts"
              className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between min-h-[140px]"
            >
              <div>
                <div className="bg-emerald-50 text-emerald-600 rounded-xl p-2.5 w-10 h-10 flex items-center justify-center mb-3">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-sm text-slate-900">Support Services</h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-tight">
                  Counseling & medical help
                </p>
              </div>
            </Link>

            {/* Card 3: Emergency */}
            <a
              href="tel:999"
              className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:border-rose-300 transition-all cursor-pointer flex flex-col justify-between min-h-[140px]"
            >
              <div>
                <div className="bg-rose-50 text-rose-600 rounded-xl p-2.5 w-10 h-10 flex items-center justify-center mb-3">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-sm text-slate-900">Emergency</h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-tight">
                  Quick dial to security
                </p>
              </div>
            </a>

            {/* Card 4: Chat Support */}
            <div
              onClick={() => setShowChatModal(true)}
              className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between min-h-[140px] relative"
            >
              <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-2xs absolute top-4 right-4 flex items-center gap-1">
                Live
              </span>
              <div>
                <div className="bg-blue-50 text-blue-600 rounded-xl p-2.5 w-10 h-10 flex items-center justify-center mb-3">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-sm text-slate-900">Chat Support</h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-tight">
                  Talk to an AI counselor
                </p>
              </div>
            </div>
          </div>

          {/* 6. Anonymous Reporting Available Card */}
          <div
            onClick={() => {
              setShowAnonymousModal(true);
              setAnonymousToken("");
            }}
            className="bg-[#FFF5F5] border border-rose-200/80 rounded-2xl p-4 mt-4 flex items-start gap-3.5 shadow-2xs hover:border-rose-300 transition-all cursor-pointer"
          >
            <div className="bg-[#C81E1E] text-white p-3 rounded-xl flex items-center justify-center shrink-0 shadow-xs">
              <Lock className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm text-slate-900 leading-tight">
                Anonymous Reporting Available
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                You can submit a report without revealing your identity. A tracking token lets you
                follow up later.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Standard Incident Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="my-8 w-full max-w-md rounded-3xl border bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xl font-bold text-slate-900">Report an Incident</h2>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="type" className="text-xs font-bold text-slate-800">
                  Type of incident
                </Label>
                <select
                  id="type"
                  name="type"
                  required
                  className="flex h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                >
                  <option value="">Select type of incident</option>
                  <option value="Gender-Based Violence (GBV)">Gender-Based Violence (GBV)</option>
                  <option value="Sexual Harassment">Sexual Harassment</option>
                  <option value="Medical Emergency">Medical Emergency</option>
                  <option value="Accident / Fall">Accident / Fall</option>
                  <option value="Personal Safety / Assault">Personal Safety / Assault</option>
                  <option value="Robbery / Theft">Robbery / Theft</option>
                  <option value="Domestic Violence">Domestic Violence</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="district" className="text-xs font-bold text-slate-800">
                  District of the incident
                </Label>
                <select
                  id="district"
                  name="district"
                  required
                  className="flex h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                >
                  <option value="">Select district</option>
                  {UGANDA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-bold text-slate-800">
                  Description of the incident
                </Label>
                <textarea
                  id="description"
                  name="description"
                  required
                  rows={3}
                  placeholder="Describe what happened in detail..."
                  className="flex w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="location" className="text-xs font-bold text-slate-800">
                    Location of the incident
                  </Label>
                  <button
                    type="button"
                    onClick={refreshGps}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C81E1E] hover:underline"
                  >
                    <LocateFixed className="h-3 w-3" />
                    {locating ? "Locating..." : fix ? "Refresh GPS" : "Capture GPS"}
                  </button>
                </div>
                <Input
                  id="location"
                  name="location"
                  placeholder="Address, landmark, or GPS"
                  defaultValue={fix ? `${fix.lat.toFixed(5)}, ${fix.lng.toFixed(5)}` : ""}
                  required
                  className="h-12 rounded-2xl border-slate-200"
                />
                <div className="flex items-center gap-1.5 text-[11px] px-1">
                  <MapPin
                    className={`h-3 w-3 shrink-0 ${fix ? "text-emerald-600" : "text-slate-400"}`}
                  />
                  {fix ? (
                    <span className="font-mono text-emerald-700">
                      GPS Coordinates attached: {fix.lat.toFixed(5)}, {fix.lng.toFixed(5)} (±
                      {Math.round(fix.accuracy)} m)
                    </span>
                  ) : (
                    <span className="text-slate-500">
                      {gpsError
                        ? `${gpsError} — coordinates will resolve from address & district.`
                        : "Coordinates will be captured automatically from GPS, address, or district."}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="persons_involved" className="text-xs font-bold text-slate-800">
                  Persons involved
                </Label>
                <Input
                  id="persons_involved"
                  name="persons_involved"
                  placeholder="Names, physical descriptions, or count"
                  required
                  className="h-12 rounded-2xl border-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="date_of_incident" className="text-xs font-bold text-slate-800">
                  Date of incident
                </Label>
                <Input
                  id="date_of_incident"
                  name="date_of_incident"
                  type="datetime-local"
                  required
                  className="h-12 rounded-2xl border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-800">
                  Attach evidence (photos, video, audio)
                </Label>
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="photos"
                    className="cursor-pointer flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-xs font-medium hover:bg-slate-100"
                  >
                    <Upload className="h-4 w-4" /> Upload Evidence
                  </Label>
                  <input
                    id="photos"
                    name="photos"
                    type="file"
                    accept="image/*,video/*,audio/*"
                    multiple
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full rounded-2xl h-12"
                  onClick={() => setShowReportModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={reporting}
                  className="w-full rounded-2xl h-12 bg-amber-500 hover:bg-amber-600 text-white font-bold"
                >
                  {reporting ? "Submitting…" : "Submit Report"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Anonymous Report Modal */}
      {showAnonymousModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="my-8 w-full max-w-md rounded-3xl border bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="bg-[#C81E1E] text-white p-1.5 rounded-lg">
                  <Lock className="h-4 w-4" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Anonymous Incident Report</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAnonymousModal(false);
                  setAnonymousToken("");
                }}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {anonymousToken ? (
              <div className="space-y-4 py-3 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {anonymousSavedRemotely ? "Report Submitted Anonymously!" : "Report Not Yet Sent"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    {anonymousSavedRemotely
                      ? "Your report was sent without personal identifiers or account information."
                      : "This report is stored only on this device and has not reached response staff. Retry when you have a reliable connection."}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Your Secret Tracking Token
                  </p>
                  <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3">
                    <span className="font-mono font-bold text-slate-900 text-sm tracking-wider">
                      {anonymousToken}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyToken}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                    >
                      {copiedToken ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-600" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" /> Copy
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-rose-600 leading-snug">
                    Important: Save or copy this token. You will need it to follow up on your case
                    without logging in.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    setShowAnonymousModal(false);
                    setAnonymousToken("");
                  }}
                  className="w-full rounded-2xl h-12 bg-[#C81E1E] hover:bg-red-700 text-white font-bold text-sm"
                >
                  Done
                </Button>
              </div>
            ) : (
              <form onSubmit={handleAnonymousReportSubmit} className="space-y-4 pt-1">
                <div className="p-3 bg-amber-50 border border-amber-200/70 rounded-2xl text-xs text-amber-900 leading-relaxed flex items-start gap-2">
                  <Lock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    This report will be completely anonymous. Your identity, email, and phone number
                    will NOT be recorded.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="anon_type" className="text-xs font-bold text-slate-800">
                    Type of incident
                  </Label>
                  <select
                    id="anon_type"
                    name="type"
                    required
                    className="flex h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                  >
                    <option value="">Select type of incident</option>
                    <option value="Gender-Based Violence (GBV)">Gender-Based Violence (GBV)</option>
                    <option value="Sexual Harassment">Sexual Harassment</option>
                    <option value="Medical Emergency">Medical Emergency</option>
                    <option value="Accident / Fall">Accident / Fall</option>
                    <option value="Personal Safety / Assault">Personal Safety / Assault</option>
                    <option value="Robbery / Theft">Robbery / Theft</option>
                    <option value="Domestic Violence">Domestic Violence</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="anon_district" className="text-xs font-bold text-slate-800">
                    District of the incident
                  </Label>
                  <select
                    id="anon_district"
                    name="district"
                    required
                    className="flex h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                  >
                    <option value="">Select district</option>
                    {UGANDA_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="anon_description" className="text-xs font-bold text-slate-800">
                    Description of the incident
                  </Label>
                  <textarea
                    id="anon_description"
                    name="description"
                    required
                    rows={3}
                    placeholder="Describe what happened confidentially..."
                    className="flex w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="anon_location" className="text-xs font-bold text-slate-800">
                      Location of the incident
                    </Label>
                    <button
                      type="button"
                      onClick={refreshGps}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C81E1E] hover:underline"
                    >
                      <LocateFixed className="h-3 w-3" />
                      {locating ? "Locating..." : fix ? "Refresh GPS" : "Capture GPS"}
                    </button>
                  </div>
                  <Input
                    id="anon_location"
                    name="location"
                    placeholder="Address, landmark, or region"
                    defaultValue={fix ? `${fix.lat.toFixed(5)}, ${fix.lng.toFixed(5)}` : ""}
                    required
                    className="h-12 rounded-2xl border-slate-200"
                  />
                  <div className="flex items-center gap-1.5 text-[11px] px-1">
                    <MapPin
                      className={`h-3 w-3 shrink-0 ${fix ? "text-emerald-600" : "text-slate-400"}`}
                    />
                    {fix ? (
                      <span className="font-mono text-emerald-700">
                        GPS Coordinates attached: {fix.lat.toFixed(5)}, {fix.lng.toFixed(5)} (±
                        {Math.round(fix.accuracy)} m)
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        Coordinates will resolve automatically from address & district.
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="anon_date" className="text-xs font-bold text-slate-800">
                    Approximate date/time
                  </Label>
                  <Input
                    id="anon_date"
                    name="date_of_incident"
                    type="datetime-local"
                    required
                    className="h-12 rounded-2xl border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-800">
                    Evidence attachments
                  </Label>
                  <p className="text-xs text-slate-500">
                    Anonymous reports can be submitted without files. To upload sensitive evidence securely, sign in and use the identified reporting form.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full rounded-2xl h-12"
                    onClick={() => setShowAnonymousModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={reporting}
                    className="w-full rounded-2xl h-12 bg-[#C81E1E] hover:bg-red-700 text-white font-bold"
                  >
                    {reporting ? "Submitting…" : "Submit Anonymously"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Live Chat Support Modal */}
      {showChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border bg-white shadow-2xl flex flex-col h-[520px] overflow-hidden">
            {/* Header */}
            <div className="bg-[#C81E1E] text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-tight">LifeGuard Support Guide</h3>
                  <p className="text-[10px] text-white/80 leading-tight">Automated information — not monitored</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChatModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-slate-50 text-xs">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed shadow-2xs ${
                      msg.sender === "user"
                        ? "bg-[#C81E1E] text-white rounded-br-none font-medium"
                        : "bg-white text-slate-800 border border-slate-200 rounded-bl-none font-normal"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input Box */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t border-slate-200 bg-white flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                placeholder="Type your message confidentially..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 h-11 px-4 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:border-rose-400"
              />
              <Button
                type="submit"
                size="icon"
                className="h-11 w-11 rounded-2xl bg-[#C81E1E] hover:bg-red-700 text-white shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
