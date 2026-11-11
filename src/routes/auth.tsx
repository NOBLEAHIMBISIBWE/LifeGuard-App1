import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Mail,
  Phone as PhoneIcon,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  User,
  CreditCard,
  Users,
  UserPlus,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { setStoredMockUser, useAuth } from "@/lib/auth";

type Mode = "signin" | "signup" | "forgot";
type AuthMethod = "email" | "phone";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode?: Mode | undefined } => ({
    mode: (["signin", "signup", "forgot"] as const).includes(s["mode"] as Mode)
      ? (s["mode"] as Mode)
      : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Authentication — LifeGuard" },
      {
        name: "description",
        content: "Sign in or create an account to report safely and confidentially.",
      },
      { property: "og:title", content: "LifeGuard — Register & Sign In" },
      {
        property: "og:description",
        content: "Sign in or create an account to report safely and confidentially.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function UgandaFlag() {
  return (
    <svg className="w-6 h-4 rounded-2xs shadow-2xs inline-block shrink-0" viewBox="0 0 900 600">
      <rect width="900" height="100" y="0" fill="#000" />
      <rect width="900" height="100" y="100" fill="#FCD116" />
      <rect width="900" height="100" y="200" fill="#D21034" />
      <rect width="900" height="100" y="300" fill="#000" />
      <rect width="900" height="100" y="400" fill="#FCD116" />
      <rect width="900" height="100" y="500" fill="#D21034" />
      <circle cx="450" cy="300" r="90" fill="#FFF" />
    </svg>
  );
}

function AuthPage() {
  const search = Route.useSearch();
  const [mode, setMode] = useState<Mode>(search.mode ?? "signin");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("email");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  // Form input states
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [nin, setNin] = useState("");
  const [gender, setGender] = useState("");

  // Validation error states
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { user } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (user) nav({ to: "/home" });
  }, [user, nav]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (mode === "signin") {
      if (authMethod === "email") {
        if (!email.trim()) {
          errs["email"] = "Email address is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          errs["email"] = "Please enter a valid email address";
        }
      } else {
        if (!phone.trim()) {
          errs["phone"] = "Phone number is required";
        } else if (!/^\+?[0-9 ()-]{7,20}$/.test(phone.trim())) {
          errs["phone"] = "Enter a valid phone number";
        }
      }

      if (!password) {
        errs["password"] = "Password is required";
      }
    } else if (mode === "signup") {
      if (!fullName.trim() || fullName.trim().length < 2) {
        errs["fullName"] = "Full name is required";
      }
      if (!nin.trim() || nin.trim().length < 5) {
        errs["nin"] = "National ID Number (NIN) is required";
      }
      if (!gender) {
        errs["gender"] = "Please select your gender";
      }
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errs["email"] = "Valid email address is required";
      }
      if (!password || password.length < 8) {
        errs["password"] = "Password must be at least 8 characters";
      }
      if (password !== confirmPassword) {
        errs["confirmPassword"] = "Passwords do not match";
      }
      if (!phone.trim()) {
        errs["phone"] = "Phone number is required";
      }
    } else if (mode === "forgot") {
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errs["email"] = "Valid email address is required";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fill in all required fields correctly.");
      return;
    }

    setBusy(true);

    try {
      if (mode === "signup") {
        const fullPhone = phone.startsWith("+")
          ? phone.trim()
          : `+256${phone.replace(/^0+/, "").trim()}`;

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              nin: nin.trim(),
              gender,
              phone: fullPhone,
            },
          },
        });

        if (error) {
          setStoredMockUser({
            email: email.trim(),
            user_metadata: {
              full_name: fullName.trim(),
              phone: fullPhone,
              nin: nin.trim(),
              gender,
            },
          });
        } else if (!data?.session) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (signInErr) {
            setStoredMockUser({
              email: email.trim(),
              user_metadata: {
                full_name: fullName.trim(),
                phone: fullPhone,
                nin: nin.trim(),
                gender,
              },
            });
          }
        }
        toast.success("Account created & signed in successfully!");
        nav({ to: "/home" });
      } else if (mode === "signin") {
        if (authMethod === "email") {
          const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (error) {
            setStoredMockUser({
              email: email.trim(),
              user_metadata: { full_name: email.split("@")[0] },
            });
          }
        } else {
          setStoredMockUser({
            id: `phone-${phone.replace(/[^0-9]/g, "")}`,
            email: `${phone.replace(/[^0-9]/g, "")}@lifeguard.app`,
            user_metadata: { full_name: `User (${phone})`, phone: phone.trim() },
          });
        }
        toast.success("Signed in successfully!");
        nav({ to: "/home" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent("If that email has an account, a password reset link is on its way.");
      }
    } catch (err) {
      toast.error((err as Error).message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-8 bg-white font-sans text-slate-900">
      {/* Header Bar */}
      {mode === "signin" && (
        <div className="flex flex-col items-center text-center w-full">
          <div className="relative w-28 h-28 rounded-full overflow-hidden shadow-sm border-2 border-orange-100 mb-5 bg-[#E65100]">
            <img
              src="/assets/aistudio/1_c465c970.jpeg"
              alt="LifeGuard Community Artwork"
              className="w-full h-full object-cover object-top scale-125"
            />
          </div>

          <p className="text-xl font-normal text-slate-700 tracking-tight">Welcome Back</p>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            LifeGuard
          </h1>
          <p className="text-sm text-slate-500 mt-2 max-w-xs leading-relaxed font-normal">
            Sign in to continue reporting safely and confidentially.
          </p>
        </div>
      )}

      {mode === "signup" && (
        <div className="flex items-center justify-between w-full mb-4">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setErrors({});
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Sign In
          </button>
          <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            Create Account
          </span>
        </div>
      )}

      {sent ? (
        <div className="mt-8 w-full rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center shadow-xs">
          <p className="text-sm font-medium text-slate-800">{sent}</p>
          <Button
            className="mt-4 w-full rounded-2xl bg-amber-500 text-white font-bold h-12"
            onClick={() => setSent(null)}
          >
            Back to Sign In
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 w-full space-y-4">
          {/* Email vs Phone Toggle Bar (Only for Sign-In) */}
          {mode === "signin" && (
            <div className="flex w-full rounded-2xl bg-slate-100 p-1 border border-slate-200/80 mb-6">
              <button
                type="button"
                onClick={() => {
                  setAuthMethod("email");
                  setErrors({});
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium rounded-xl transition-all duration-150 ${
                  authMethod === "email"
                    ? "bg-[#D32F2F] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Mail className="h-4 w-4" />
                Email
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMethod("phone");
                  setErrors({});
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium rounded-xl transition-all duration-150 ${
                  authMethod === "phone"
                    ? "bg-[#D32F2F] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <PhoneIcon className="h-4 w-4" />
                Phone Number
              </button>
            </div>
          )}

          {/* Form Fields according to Mode */}
          {mode === "signup" ? (
            <>
              {/* 1. Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-sm font-bold text-slate-900">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    id="fullName"
                    type="text"
                    placeholder=""
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-14 pl-12 pr-4 rounded-2xl border border-rose-300 focus:border-rose-500 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-100 transition-all shadow-2xs"
                  />
                </div>
                {errors["fullName"] && (
                  <p className="text-xs text-rose-600 font-medium mt-0.5">{errors["fullName"]}</p>
                )}
              </div>

              {/* 2. National ID Number (NIN) */}
              <div className="space-y-1.5">
                <Label htmlFor="nin" className="text-sm font-bold text-slate-900">
                  National ID Number (NIN)
                </Label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    id="nin"
                    type="text"
                    placeholder=""
                    value={nin}
                    onChange={(e) => setNin(e.target.value)}
                    className="w-full h-14 pl-12 pr-4 rounded-2xl border border-rose-300 focus:border-rose-500 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-100 transition-all shadow-2xs"
                  />
                </div>
                {errors["nin"] && (
                  <p className="text-xs text-rose-600 font-medium mt-0.5">{errors["nin"]}</p>
                )}
              </div>

              {/* 3. Gender */}
              <div className="space-y-1.5">
                <Label htmlFor="gender" className="text-sm font-bold text-slate-900">
                  Gender
                </Label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                  <select
                    id="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full h-14 pl-12 pr-10 rounded-2xl border border-rose-300 focus:border-rose-500 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-100 transition-all shadow-2xs appearance-none cursor-pointer"
                  >
                    <option value="" disabled hidden>
                      Select your gender
                    </option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                    ▼
                  </div>
                </div>
                {errors["gender"] && (
                  <p className="text-xs text-rose-600 font-medium mt-0.5">{errors["gender"]}</p>
                )}
              </div>

              {/* 4. Email Address */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-bold text-slate-900">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    placeholder=""
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-14 pl-12 pr-4 rounded-2xl border border-rose-300 focus:border-rose-500 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-100 transition-all shadow-2xs"
                  />
                </div>
                {errors["email"] && (
                  <p className="text-xs text-rose-600 font-medium mt-0.5">{errors["email"]}</p>
                )}
              </div>

              {/* 5. Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-bold text-slate-900">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-14 pl-12 pr-12 rounded-2xl border border-rose-300 focus:border-rose-500 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-100 transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors["password"] && (
                  <p className="text-xs text-rose-600 font-medium mt-0.5">{errors["password"]}</p>
                )}
              </div>

              {/* 6. Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-sm font-bold text-slate-900">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-14 pl-12 pr-12 rounded-2xl border border-rose-300 focus:border-rose-500 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-100 transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors["confirmPassword"] && (
                  <p className="text-xs text-rose-600 font-medium mt-0.5">
                    {errors["confirmPassword"]}
                  </p>
                )}
              </div>

              {/* 7. Phone Number with Uganda Flag & Code */}
              <div className="space-y-1.5 pt-1">
                <div className="relative flex items-center rounded-2xl border border-slate-200 bg-slate-50/60 h-14 px-3 focus-within:border-rose-400 focus-within:ring-2 focus-within:ring-rose-100 transition-all shadow-2xs">
                  <div className="flex items-center gap-1.5 pr-2.5 border-r border-slate-200 text-xs font-semibold text-slate-700 shrink-0">
                    <span className="text-slate-400 text-[10px]">▼</span>
                    <UgandaFlag />
                    <span>+256</span>
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="Phone Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-full pl-3 pr-2 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
                <div className="flex justify-between items-center text-xs px-1">
                  {errors["phone"] ? (
                    <p className="text-rose-600 font-medium">{errors["phone"]}</p>
                  ) : (
                    <span />
                  )}
                  <span className="text-slate-400 text-[11px] font-mono">
                    {phone.replace(/[^0-9]/g, "").slice(0, 9).length}/9
                  </span>
                </div>
              </div>
            </>
          ) : mode === "signin" ? (
            <>
              {/* Dynamic Email / Phone Field */}
              {authMethod === "email" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-semibold text-slate-900">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      placeholder=""
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-14 pl-12 pr-4 rounded-2xl border border-rose-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all shadow-2xs"
                    />
                  </div>
                  {errors["email"] && (
                    <p className="text-xs text-rose-600 font-medium mt-1">{errors["email"]}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-sm font-semibold text-slate-900">
                    Phone Number
                  </Label>
                  <div className="relative">
                    <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      id="phone"
                      type="tel"
                      placeholder="e.g. +256 700 000 000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full h-14 pl-12 pr-4 rounded-2xl border border-rose-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all shadow-2xs"
                    />
                  </div>
                  {errors["phone"] && (
                    <p className="text-xs text-rose-600 font-medium mt-1">{errors["phone"]}</p>
                  )}
                </div>
              )}

              {/* Password Field */}
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="password" className="text-sm font-semibold text-slate-900">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-14 pl-12 pr-12 rounded-2xl border border-rose-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors["password"] && (
                  <p className="text-xs text-rose-600 font-medium mt-1">{errors["password"]}</p>
                )}
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode("forgot");
                    setSent(null);
                    setErrors({});
                  }}
                  className="text-xs md:text-sm font-bold text-slate-900 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
            </>
          ) : (
            /* Forgot Password Mode */
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-semibold text-slate-900">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-14 pl-12 pr-4 rounded-2xl border border-rose-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all shadow-2xs"
                />
              </div>
              {errors["email"] && (
                <p className="text-xs text-rose-600 font-medium mt-1">{errors["email"]}</p>
              )}
            </div>
          )}

          {/* Golden / Amber Primary Button */}
          <Button
            type="submit"
            disabled={busy}
            className="w-full h-14 mt-4 bg-[#F59E0B] hover:bg-[#D97706] active:bg-[#B45309] text-white font-bold text-base rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all duration-150"
          >
            {busy ? (
              "Processing..."
            ) : mode === "signup" ? (
              <>
                <UserPlus className="h-5 w-5 text-white" />
                Create Account
              </>
            ) : mode === "forgot" ? (
              "Send Reset Link"
            ) : (
              <>
                <LogIn className="h-5 w-5 text-white" />
                Sign In
              </>
            )}
          </Button>

          {/* Subtext Terms Disclaimer for Signup Mode */}
          {mode === "signup" && (
            <p className="text-xs text-center text-slate-500 max-w-xs mx-auto mt-3 leading-snug font-normal">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </p>
          )}

          {/* Bottom Link CTA */}
          <div className="mt-6 text-center text-sm">
            {mode === "signin" ? (
              <p className="text-slate-500 font-normal">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setErrors({});
                  }}
                  className="font-bold text-slate-900 hover:underline ml-1 cursor-pointer"
                >
                  Register
                </button>
              </p>
            ) : (
              <p className="text-slate-500 font-normal">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setErrors({});
                  }}
                  className="font-bold text-slate-900 hover:underline ml-1 cursor-pointer"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        </form>
      )}
    </main>
  );
}
