import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function setStoredMockUser(_user: Partial<User> | null) {
  // Legacy compatibility: mock sessions are intentionally disabled.
  if (typeof window !== "undefined") localStorage.removeItem("lifeguard_mock_user");
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (data?.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setRolesLoading(false);
      return;
    }
    let cancelled = false;
    setRolesLoading(true);
    (async () => {
      try {
        const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
        if (!cancelled) {
          setRoles((data ?? []).map((r) => r.role));
        }
      } catch {
        if (!cancelled) {
          setRoles([]);
        }
      } finally {
        if (!cancelled) setRolesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { user, loading: loading || rolesLoading, roles };
}
