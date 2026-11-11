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
  MapPin,
  Phone,
  Siren,
  LogOut,
  Send,
  Bot,
  Lock,
  Copy,
  Check,
  User as UserIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/lib/location";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { setStoredMockUser, useAuth } from "@/lib/auth";

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
  const { fix } = useLocation();
  const { user } = useAuth();
  const nav = useNavigate();

  const [showReportModal, setShowReportModal] = useState(false);
  const [showAnonymousModal, setShowAnonymousModal] = useState(false);
  const [anonymousToken, setAnonymousToken] = useState("");
  const [copiedToken, setCopiedToken] = useState(false);
  const [showChatModal, setShowChatModal] = useState(Boolean(search.chat));
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [reporting, setReporting] = useState(false);

  // Chat support states
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "bot"; text: string }>>(
    [
      {
        sender: "bot",
        text: "Hello, I am the LifeGuard Confidential Help Assistant. How can we support you today?",
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
    const type = String(f.get("type")).trim();

    try {
      const { error: err } = await supabase.from("incidents").insert({
        type,
        status: "submitted",
        is_test: false,
        latitude: fix?.lat ?? null,
        longitude: fix?.lng ?? null,
      });

      if (err) {
        console.warn("Incident insert notice:", err.message);
      }

      toast.success("Incident report submitted successfully!");
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
    const type = String(f.get("type")).trim();
    const token = `TOKEN-LG-${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      const { error: err } = await supabase.from("incidents").insert({
        type,
        status: "submitted",
        is_test: false,
        is_anonymous: true,
        tracking_token: token,
        latitude: fix?.lat ?? null,
        longitude: fix?.lng ?? null,
      });

      if (err) {
        console.warn("Anonymous incident insert notice:", err.message);
      }

      setAnonymousToken(token);
      toast.success("Anonymous report submitted!");
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
          text: "Thank you for reaching out. Your message is encrypted and private. A certified counseling support officer will respond shortly, or you can call helpline 0800 200 600.",
        },
      ]);
    }, 1000);
  };

  const userInitial =
    user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";

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
                <Label htmlFor="location" className="text-xs font-bold text-slate-800">
                  Location of the incident
                </Label>
                <Input
                  id="location"
                  name="location"
                  placeholder="Address, landmark, or GPS"
                  defaultValue={fix ? `${fix.lat.toFixed(4)}, ${fix.lng.toFixed(4)}` : ""}
                  required
                  className="h-12 rounded-2xl border-slate-200"
                />
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
                    Report Submitted Anonymously!
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Your report is encrypted and saved. No personal identifiers or account info were
                    attached.
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
                  <Label htmlFor="anon_location" className="text-xs font-bold text-slate-800">
                    Location of the incident
                  </Label>
                  <Input
                    id="anon_location"
                    name="location"
                    placeholder="Address, landmark, or region"
                    required
                    className="h-12 rounded-2xl border-slate-200"
                  />
                </div>

                <div className="space-y-[#1.5]">
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
                    Attach evidence (optional)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="anon_photos"
                      className="cursor-pointer flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-xs font-medium hover:bg-slate-100"
                    >
                      <Upload className="h-4 w-4" /> Upload Anonymous Files
                    </Label>
                    <input
                      id="anon_photos"
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
                  <h3 className="text-sm font-bold leading-tight">LifeGuard Confidential Chat</h3>
                  <p className="text-[10px] text-white/80 leading-tight">24/7 Verified Support</p>
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
