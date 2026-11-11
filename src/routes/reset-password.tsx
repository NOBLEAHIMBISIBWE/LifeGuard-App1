import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — LifeGuard" },
      { name: "description", content: "Choose a new password for your LifeGuard account." },
      { property: "og:title", content: "Set a new password — LifeGuard" },
      { property: "og:description", content: "Choose a new password for your LifeGuard account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState("");
  const nav = useNavigate();
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    nav({ to: "/home" });
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-3xl font-bold">New password</h1>
      <form onSubmit={save} className="mt-6 space-y-4">
        <Input
          type="password"
          minLength={8}
          required
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="At least 8 characters"
          className="h-12"
        />
        <Button size="lg" className="w-full">
          Save password
        </Button>
      </form>
    </main>
  );
}
