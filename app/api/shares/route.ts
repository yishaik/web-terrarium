import { NextResponse } from "next/server";
import type { ResearchRun } from "@/lib/research";
import { workerRequest } from "@/lib/worker";

function isRun(value: unknown): value is ResearchRun {
  return Boolean(value && typeof value === "object" && typeof (value as ResearchRun).query === "string" && Array.isArray((value as ResearchRun).sources));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { run?: unknown } | null;
  if (!isRun(body?.run)) return NextResponse.json({ error: "Choose a research result to share." }, { status: 400 });
  const id = crypto.randomUUID();
  try {
    await workerRequest(`/shares/${id}`, { method: "POST", body: JSON.stringify({ run: body.run }) });
    return NextResponse.json({ id, url: new URL(`/s/${id}`, request.url).toString() }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create a share link." }, { status: 503 });
  }
}
