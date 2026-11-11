import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function getStoredMockUser(): User | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("lifeguard_mock_user");
  if (!stored) return null;
  try {
    return JSON.parse(stored) as User;
  } catch {
    return null;
  }
}

export function setStoredMockUser(user: Partial<User> | null) {
  if (typeof window === "undefined") return;
  if (!user) {
    localStorage.removeItem("lifeguard_mock_user");
    window.dispatchEvent(new CustomEvent("lifeguard-auth-change"));
    return;
  }
  const fullUser: User = {
    id: user.id || "mock-user-123",
    app_metadata: user.app_metadata || {},
    user_metadata: user.user_metadata || {},
    aud: "authenticated",
    created_at: user.created_at || new Date().toISOString(),
    email: user.email || "user@lifeguard.app",
  };
  localStorage.setItem("lifeguard_mock_user", JSON.stringify(fullUser));
  window.dispatchEvent(new CustomEvent("lifeguard-auth-change"));
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => getStoredMockUser());
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    const handleAuthChange = () => {
      const mock = getStoredMockUser();
      if (mock) {
        setUser(mock);
      }
    };
    window.addEventListener("lifeguard-auth-change", handleAuthChange);

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(getStoredMockUser());
      }
    });

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (data?.user) {
          setUser(data.user);
        } else {
          setUser(getStoredMockUser());
        }
      })
      .catch(() => {
        setUser(getStoredMockUser());
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("lifeguard-auth-change", handleAuthChange);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => setRoles((data ?? []).map((r) => r.role)))
      .catch(() => setRoles([]));
  }, [user]);

  return { user, loading, roles };
}
