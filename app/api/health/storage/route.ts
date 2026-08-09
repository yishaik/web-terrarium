import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const url = process.env.AGENT_WORKER_URL;
  if (!url) return NextResponse.json({ ok: false, storage: "unconfigured" }, { status: 503 });
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/health`, { cache: "no-store", signal: AbortSignal.timeout(5_000) });
    if (!response.ok) return NextResponse.json({ ok: false, storage: "unhealthy", status: response.status }, { status: 503 });
    return NextResponse.json({ ok: true, storage: "healthy" }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, storage: "unreachable" }, { status: 503 });
  }
}
