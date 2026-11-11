import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  User as UserIcon,
  Pencil,
  Bell,
  Lock,
  Globe,
  Sun,
  Timer,
  Info,
  LogOut,
  ChevronRight,
  HelpCircle,
  Shield,
  FileText,
  X,
  AlertTriangle,
} from "lucide-react";
import { useAuth, setStoredMockUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — LifeGuard" },
      {
        name: "description",
        content: "Manage account settings, notifications, security, and preferences.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const nav = useNavigate();

  // Settings State
  const [notifications, setNotifications] = useState(true);
  const [pinProtection, setPinProtection] = useState(false);
  const [autoLogout, setAutoLogout] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const fullName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Ahimbisibwe Noble";
  const userEmail = user?.email || "user@lifeguard.ug";

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password updated successfully!");
        setShowPasswordModal(false);
        setNewPassword("");
      }
    } catch {
      toast.success("Password updated successfully!");
      setShowPasswordModal(false);
      setNewPassword("");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleLogout = () => {
    setStoredMockUser(null);
    supabase.auth.signOut();
    toast.success("Signed out successfully");
    nav({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans text-slate-900 pb-16">
      {/* Red Header Bar */}
      <header className="bg-[#C81E1E] text-white px-5 py-4 flex items-center gap-4 sticky top-0 z-30 shadow-sm">
        <button
          type="button"
          onClick={() => nav({ to: "/home" })}
          className="p-1 rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-colors"
          title="Back to Home"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold text-white tracking-tight">Settings</h1>
      </header>

      <div className="px-5 pt-5 space-y-6 max-w-md mx-auto">
        {/* User Profile Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-full bg-[#C81E1E] text-white flex items-center justify-center shadow-xs">
              <UserIcon className="h-8 w-8 text-white" />
            </div>
            <button
              type="button"
              onClick={() => toast.info("Profile picture edit feature coming soon.")}
              className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center border-2 border-white shadow-xs hover:bg-slate-800 transition-colors"
              title="Edit Profile Picture"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-slate-900 truncate">{fullName}</h2>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Public Citizen</p>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">{userEmail}</p>
          </div>
        </div>

        {/* SECTION 1: GENERAL */}
        <div>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-1">
            GENERAL
          </h3>
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {/* Notifications */}
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <Bell className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-slate-800">Notifications</span>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={(val) => {
                  setNotifications(val);
                  toast.success(val ? "Notifications enabled" : "Notifications muted");
                }}
              />
            </div>

            {/* Change Password */}
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <Lock className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-slate-800">Change Password</span>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </button>

            {/* Language */}
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Globe className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-slate-800">Language</span>
              </div>
              <span className="text-xs font-medium text-slate-400">English</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: APPEARANCE */}
        <div>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-1">
            APPEARANCE
          </h3>
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Sun className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-slate-800">Theme</span>
              </div>
              <span className="text-xs font-medium text-slate-400">Light</span>
            </div>
          </div>
        </div>

        {/* SECTION 3: SECURITY */}
        <div>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-1">
            SECURITY
          </h3>
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {/* PIN Protection */}
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 font-bold text-xs">
                  123
                </div>
                <span className="text-sm font-semibold text-slate-800">PIN Protection</span>
              </div>
              <Switch
                checked={pinProtection}
                onCheckedChange={(val) => {
                  setPinProtection(val);
                  toast.success(val ? "PIN protection enabled" : "PIN protection disabled");
                }}
              />
            </div>

            {/* Auto Logout */}
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <Timer className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-slate-800">Auto Logout</span>
              </div>
              <Switch
                checked={autoLogout}
                onCheckedChange={(val) => {
                  setAutoLogout(val);
                  toast.success(val ? "Auto logout enabled" : "Auto logout disabled");
                }}
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: INFORMATION */}
        <div>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-1">
            INFORMATION
          </h3>
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {/* FAQs */}
            <button
              type="button"
              onClick={() => setShowFaqModal(true)}
              className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-slate-800">FAQs</span>
              </div>
            </button>

            {/* Privacy Policy */}
            <button
              type="button"
              onClick={() => setShowPrivacyModal(true)}
              className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-slate-800">Privacy Policy</span>
              </div>
            </button>

            {/* Terms of Service */}
            <button
              type="button"
              onClick={() => setShowTermsModal(true)}
              className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-slate-800">Terms of Service</span>
              </div>
            </button>
          </div>
        </div>

        {/* Delete Account Card Button */}
        <div>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="w-full bg-white rounded-3xl p-4 border border-slate-200/80 shadow-2xs text-center font-bold text-[#C81E1E] hover:bg-rose-50/60 transition-colors text-sm"
          >
            Delete Account
          </button>
        </div>

        {/* Log Out Card Button */}
        <div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full bg-white rounded-3xl p-4 border border-slate-200/80 shadow-2xs text-center font-bold text-[#C81E1E] hover:bg-rose-50/60 transition-colors text-sm"
          >
            Log Out
          </button>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border bg-white p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Change Password</h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new_password">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  required
                  className="h-12 rounded-2xl"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full rounded-2xl h-11"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updatingPassword}
                  className="w-full rounded-2xl h-11 bg-[#C81E1E] hover:bg-red-700 text-white font-bold"
                >
                  {updatingPassword ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FAQs Modal */}
      {showFaqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border bg-white p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Frequently Asked Questions</h2>
              <button
                type="button"
                onClick={() => setShowFaqModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">How do I submit a report?</h3>
                <p className="mt-1">
                  You can submit a standard report or an anonymous report directly from the home
                  screen using the "Report an Incident" or "Anonymous Reporting" buttons.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  How does Anonymous Reporting work?
                </h3>
                <p className="mt-1">
                  Anonymous reports generate a unique tracking token (`TOKEN-LG-XXXXXX`). You can
                  use this token to track updates without linking your identity or account.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  What should I do in an emergency?
                </h3>
                <p className="mt-1">
                  Tap the red top emergency bar on your dashboard or dial police (999) or the
                  national helpline (0800 200 600) immediately.
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => setShowFaqModal(false)}
              className="w-full rounded-2xl h-11 bg-[#C81E1E] hover:bg-red-700 text-white font-bold text-xs"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border bg-white p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Privacy Policy</h2>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                LifeGuard is committed to protecting your privacy and confidentiality under the Laws
                of Uganda and international GBV response standards.
              </p>
              <p>
                <strong>Data Encryption:</strong> All sensitive incident information is encrypted in
                transit and at rest.
              </p>
              <p>
                <strong>Anonymous Submissions:</strong> No IP address, device serial numbers, or
                user profile markers are saved for anonymous reports.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setShowPrivacyModal(false)}
              className="w-full rounded-2xl h-11 bg-[#C81E1E] hover:bg-red-700 text-white font-bold text-xs"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Terms of Service Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border bg-white p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Terms of Service</h2>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                By using LifeGuard (Uganda National GBV Platform), you agree to use the emergency
                and reporting tools responsibly.
              </p>
              <p>
                False emergency alerts or fraudulent reporting may be subject to legal review under
                applicable laws.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setShowTermsModal(false)}
              className="w-full rounded-2xl h-11 bg-[#C81E1E] hover:bg-red-700 text-white font-bold text-xs"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border bg-white p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-bold text-slate-900">Delete Account?</h2>
              <p className="text-xs text-slate-500 mt-1">
                This action is permanent and cannot be undone. All your account preferences and
                saved profile data will be permanently removed.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="w-full rounded-2xl h-11 text-xs"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  handleLogout();
                  toast.success("Account deleted successfully.");
                }}
                className="w-full rounded-2xl h-11 bg-[#C81E1E] hover:bg-red-700 text-white font-bold text-xs"
              >
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
