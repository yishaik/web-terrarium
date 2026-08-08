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
  const body = await request.json().catch(() => null) as { visibility?: unknown } | null;
  const visibility: Visibility = body?.visibility === "private" ? "private" : "public";
  try {
    const response = await workerRequest(`/gardens/${encodeURIComponent(slug)}`, { method: "PATCH", body: JSON.stringify({ ownerId: userId, visibility }) });
    return NextResponse.json(await response.json());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update garden." }, { status: 503 });
  }
}
