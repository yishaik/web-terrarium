import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getPublicGarden, workerRequest, type Visibility } from "@/lib/worker";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const garden = await getPublicGarden(slug);
    return garden ? NextResponse.json(garden) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Could not load garden." }, { status: 503 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to update a garden." }, { status: 401 });
  const { slug } = await params;
  const body = await request.json().catch(() => null) as { visibility?: unknown; continuousResearchEnabled?: unknown } | null;

  const patch: { ownerId: string; visibility?: Visibility; continuousResearchEnabled?: boolean } = { ownerId: userId };
  if (body?.visibility !== undefined) {
    if (body.visibility !== "public" && body.visibility !== "private") return NextResponse.json({ error: "Invalid visibility." }, { status: 400 });
    patch.visibility = body.visibility;
  }
  if (body?.continuousResearchEnabled !== undefined) {
    if (typeof body.continuousResearchEnabled !== "boolean") return NextResponse.json({ error: "Invalid continuous research setting." }, { status: 400 });
    patch.continuousResearchEnabled = body.continuousResearchEnabled;
  }
  if (patch.visibility === undefined && patch.continuousResearchEnabled === undefined) return NextResponse.json({ error: "No supported garden setting was provided." }, { status: 400 });

  try {
    const response = await workerRequest(`/gardens/${encodeURIComponent(slug)}`, { method: "PATCH", body: JSON.stringify(patch) });
    return NextResponse.json(await response.json());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update garden." }, { status: 503 });
  }
}
