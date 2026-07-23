import { createClient } from "npm:@supabase/supabase-js@2.110.5";

interface InvitePreviewRow {
  valid: boolean;
  label: string | null;
  package_ids: string[];
}

const localOrigins = new Set([
  "http://127.0.0.1:57145",
  "http://localhost:57145",
]);

function configuredOrigins(): Set<string> {
  const configured = Deno.env.get("ALLOWED_ORIGINS") ?? "";
  return new Set([
    ...localOrigins,
    ...configured.split(",").map((origin) => origin.trim()).filter(Boolean),
  ]);
}

function corsHeaders(origin: string | null): HeadersInit {
  const allowedOrigins = configuredOrigins();
  const allowedOrigin = origin !== null && allowedOrigins.has(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");
  if (origin !== null && !configuredOrigins().has(origin)) {
    return jsonResponse({ valid: false }, 403, origin);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (request.method !== "POST") {
    return jsonResponse({ valid: false }, 405, origin);
  }

  let code: string;
  try {
    const body = await request.json() as { code?: unknown };
    code = typeof body.code === "string" ? body.code : "";
  } catch {
    return jsonResponse({ valid: false }, 400, origin);
  }

  if (code.length < 20 || code.length > 128) {
    return jsonResponse({ valid: false }, 200, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (supabaseUrl === undefined || serviceRoleKey === undefined) {
    return jsonResponse({ valid: false }, 503, origin);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.rpc("validate_invite_for_registration", {
    p_code: code,
  });

  if (error !== null) {
    return jsonResponse({ valid: false }, 503, origin);
  }

  const result = (data as InvitePreviewRow[] | null)?.[0];
  if (result?.valid !== true) {
    return jsonResponse({ valid: false }, 200, origin);
  }

  return jsonResponse(
    {
      valid: true,
      label: result.label,
      packages: result.package_ids,
    },
    200,
    origin,
  );
});
