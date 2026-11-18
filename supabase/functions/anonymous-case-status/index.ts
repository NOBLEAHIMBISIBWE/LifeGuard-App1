import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Anonymous case lookup is missing server configuration.");
    return json({ error: "Case lookup is temporarily unavailable." }, 503);
  }

  let token = "";
  try {
    const body = await req.json();
    token = typeof body?.token === "string" ? body.token.trim().toUpperCase() : "";
  } catch {
    return json({ error: "A valid tracking token is required." }, 400);
  }
  if (!/^TOKEN-LG-[A-Z0-9]{6,32}$/.test(token)) {
    return json({ error: "Enter a valid LifeGuard tracking token." }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const clientIp = forwardedFor || req.headers.get("cf-connecting-ip") || "unknown";
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${clientIp}:${serviceRoleKey}`),
    );
    const ipHash = Array.from(new Uint8Array(digest))
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");

    const { data: allowed, error: rateLimitError } = await supabase.rpc(
      "allow_anonymous_case_lookup",
      { _ip_hash: ipHash },
    );
    if (rateLimitError) {
      console.error("Anonymous lookup rate-limit check failed:", rateLimitError.message);
      return json({ error: "Case lookup is temporarily unavailable." }, 503);
    }
    if (!allowed) return json({ error: "Too many lookup attempts. Please wait 10 minutes and try again." }, 429);

    const { data, error } = await supabase
      .from("incidents")
      .select("id,type,status,created_at,is_anonymous,tracking_token,district")
      .eq("tracking_token", token)
      .eq("is_anonymous", true)
      .maybeSingle();

    if (error) {
      console.error("Anonymous case lookup failed:", error.message);
      return json({ error: "Case lookup is temporarily unavailable." }, 503);
    }
    if (!data) return json({ error: "No report found matching that tracking token." }, 404);

    // Never return reporter identity, narrative, precise location, or uploaded evidence.
    return json({
      case: {
        id: data.id,
        type: data.type,
        status: data.status,
        created_at: data.created_at,
        is_anonymous: true,
        tracking_token: data.tracking_token,
        district: data.district,
      },
    });
  } catch (error) {
    console.error("Anonymous case lookup error:", error);
    return json({ error: "Case lookup is temporarily unavailable." }, 503);
  }
});
