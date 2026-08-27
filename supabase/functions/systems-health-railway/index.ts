// Railway operations health for the Systems Health cockpit.
//
// Reads Railway deployment logs (server-side, token from env) and returns a
// structured summary of worker/realtime health — the signals that started the
// 2026-08-25 realtime retry storm. The browser cannot reach Railway directly,
// so this runs behind admin auth here.
//
// Env (per project, via `supabase secrets set`):
//   RAILWAY_TOKEN          — Railway GraphQL API token (never in repo)
//   RAILWAY_ENV_ID         — Railway environment id to read logs for
//   RAILWAY_SERVICE_NAMES  — comma-separated service name filters (optional)
//
// GET/POST /systems-health-railway?minutes=60

import { adminClient, corsHeaders, requireAuthedAdmin } from "../_shared/adminAuth.ts";

const RAILWAY_GQL = "https://backboard.railway.com/graphql/v2";

interface RailwayLog {
  message: string;
  severity: string;
  timestamp: string;
}

async function fetchRailwayLogs(minutes: number): Promise<RailwayLog[] | null> {
  const token = Deno.env.get("RAILWAY_TOKEN");
  const envId = Deno.env.get("RAILWAY_ENV_ID");
  if (!token || !envId) return null;

  const since = new Date(Date.now() - minutes * 60_000).toISOString();
  const query =
    "query($environmentId:String!,$since:String!){ environmentLogs(environmentId:$environmentId,anchorDate:$since,afterLimit:2000){ message severity timestamp } }";
  const body = { query, variables: { environmentId: envId, since } };

  const res = await fetch(RAILWAY_GQL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return (json?.data?.environmentLogs as RailwayLog[] | undefined) ?? null;
}

function parseHealth(logs: RailwayLog[]) {
  let realtimeFailures = 0;
  let realtimeSubscribed = 0;
  let healthCheckResubscribes = 0;
  let rateLimitWarnings = 0;
  let workerFatal = 0;
  let workerRestarts = 0;
  let uncaughtExceptions = 0;
  const errorByService = new Map<string, number>();

  for (const l of logs) {
    const m = l.message;
    const sev = (l.severity ?? "").toLowerCase();
    if (m.includes("subscription CLOSED") || m.includes("CHANNEL_ERROR")) realtimeFailures += 1;
    else if (m.includes("subscription active")) realtimeSubscribed += 1;
    else if (m.includes("Health check")) healthCheckResubscribes += 1;
    else if (m.includes("rate limit")) rateLimitWarnings += 1;
    else if (m.includes("worker-fatal") || m.includes("UNCAUGHT_EXCEPTION") || m.includes("[worker-fatal]")) workerFatal += 1;
    else if (m.includes("uncaughtException") || m.includes("uncaught exception")) uncaughtExceptions += 1;
    else if (m.includes("Restarting") || m.includes("restarting") || m.includes("Starting worker")) workerRestarts += 1;

    if (sev === "error" || sev === "fatal") {
      const key = m.slice(0, 60);
      errorByService.set(key, (errorByService.get(key) ?? 0) + 1);
    }
  }

  return {
    realtimeFailures,
    realtimeSubscribed,
    healthCheckResubscribes,
    rateLimitWarnings,
    workerFatal,
    workerRestarts,
    uncaughtExceptions,
    topErrorSignatures: [...errorByService.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([message, count]) => ({ message, count })),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = adminClient();
  const adminCheck = await requireAuthedAdmin(req, supabase);
  if ("error" in adminCheck) return adminCheck.error;

  try {
    const url = new URL(req.url);
    const queryMinutes = Number(url.searchParams.get("minutes"));
    const bodyMinutes = req.method === "POST" ? (await req.json().catch(() => ({})))?.minutes : NaN;
    const raw = Number.isFinite(bodyMinutes) ? bodyMinutes : queryMinutes;
    const minutes = Math.min(1440, Math.max(5, Number.isFinite(raw) ? raw : 60));

    const logs = await fetchRailwayLogs(minutes);
    if (!logs) {
      return Response.json(
        { error: "Railway logs unavailable (token/env not configured, or request failed).", health: null },
        { status: 200, headers: corsHeaders },
      );
    }

    const health = parseHealth(logs);
    const stormActive = health.realtimeFailures > 100 || health.rateLimitWarnings > 0;
    const workerDown = health.workerFatal > 0 || health.uncaughtExceptions > 0;

    return Response.json(
      {
        minutes,
        logLines: logs.length,
        health,
        state: workerDown ? "worker_down" : stormActive ? "storm" : health.realtimeFailures > 10 ? "degraded" : "healthy",
      },
      { status: 200, headers: corsHeaders },
    );
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err), health: null },
      { status: 500, headers: corsHeaders },
    );
  }
});
