import { NextResponse } from "next/server";
import { answerLivingDocumentQuestion } from "@/lib/document/ask";
import { loadPublicLivingDocument } from "@/lib/document/load";
import { checkRateLimit, requestIdentity } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const identity = requestIdentity(request);
  const limit = checkRateLimit(`ask:${slug}:${identity}`, 20, 60_000);
  if (!limit.allowed) {
    const retryAfter = Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000));
    return NextResponse.json({ error: "Too many document questions. Try again shortly." }, {
      status: 429,
      headers: { "retry-after": String(retryAfter), "cache-control": "no-store" },
    });
  }

  const body = await request.json().catch(() => null) as { question?: unknown } | null;
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!question || question.length > 320) return NextResponse.json({ error: "Ask a question of up to 320 characters." }, { status: 400 });

  const loaded = await loadPublicLivingDocument(slug).catch(() => null);
  if (!loaded) return NextResponse.json({ error: "Living document not found." }, { status: 404 });

  const token = request.headers.get("x-vercel-oidc-token") || process.env.VERCEL_OIDC_TOKEN || process.env.AI_GATEWAY_API_KEY;
  const answer = await answerLivingDocumentQuestion({ question, document: loaded.document, token });
  console.info("living_document_ask", { slug, version: loaded.document.documentVersion, coverage: answer.coverage, citations: answer.citations.length, model: answer.model ?? "deterministic" });
  return NextResponse.json(answer, { headers: {
    "cache-control": "no-store",
    "x-ratelimit-remaining": String(limit.remaining),
  } });
}
