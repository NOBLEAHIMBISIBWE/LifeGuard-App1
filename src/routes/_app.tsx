import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Home, FileText, LifeBuoy, MessageSquare, Bluetooth } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app")({ component: AppLayout });

function AppLayout() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  if (loading || !user) return <div className="min-h-screen bg-white" />;

  const tabs = [
    { to: "/home", icon: Home, label: "Home" },
    { to: "/history", icon: FileText, label: "My Reports" },
    { to: "/contacts", icon: LifeBuoy, label: "Support" },
    { to: "/home", icon: MessageSquare, label: "Chat Support", search: { chat: true } },
  ] as const;

  return (
    <div className="mx-auto min-h-screen max-w-md pb-20 bg-white font-sans text-slate-900">
      <Outlet />
      <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur-md z-40">
        <div className="mx-auto flex max-w-md justify-around py-2">
          {tabs.map(({ to, icon: I, label, search }) => (
            <Link
              key={label}
              to={to}
              search={search}
              className="flex flex-col items-center gap-1 px-3 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
              activeProps={{ className: "text-slate-900 font-bold" }}
            >
              <I className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
      <span className="hidden">
        <Bluetooth />
      </span>
    </div>
  );
}
