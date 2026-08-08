import { NextResponse } from "next/server";
import { getPopularTopics } from "@/lib/worker";

export async function GET() {
  return NextResponse.json({ topics: await getPopularTopics() });
}
