import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { workerRequest } from "@/lib/worker";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to follow a topic." }, { status: 401 });
  const { slug } = await params;
  const body = await request.json().catch(() => null) as { query?: unknown } | null;
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (!query || query.length > 240) return NextResponse.json({ error: "Choose a topic of up to 240 characters." }, { status: 400 });
  try {
    const response = await workerRequest(`/gardens/${encodeURIComponent(slug)}/watchlist`, { method: "POST", body: JSON.stringify({ ownerId: userId, query }) });
    return NextResponse.json(await response.json());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not follow this topic." }, { status: 503 });
  }
}
