import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getOwnerGardens, workerRequest, type Visibility } from "@/lib/worker";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 45);
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to view your gardens." }, { status: 401 });
  try { return NextResponse.json({ gardens: await getOwnerGardens(userId) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load gardens." }, { status: 503 }); }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to create a garden." }, { status: 401 });
  const body = await request.json().catch(() => null) as { title?: unknown; visibility?: unknown } | null;
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 80) : "";
  const visibility: Visibility = body?.visibility === "private" ? "private" : "public";
  const slug = slugify(title);
  if (slug.length < 3) return NextResponse.json({ error: "Choose a garden name of at least 3 letters." }, { status: 400 });
  try {
    const response = await workerRequest("/gardens", { method: "POST", body: JSON.stringify({ slug, title, ownerId: userId, visibility }) });
    return NextResponse.json(await response.json(), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create a garden." }, { status: 503 });
  }
}
