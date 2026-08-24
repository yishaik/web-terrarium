import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const authenticatedProxy = clerkMiddleware(async (auth, request) => {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/dashboard") || (path.startsWith("/api/terrariums") && request.method !== "GET")) {
    await auth.protect();
  }
});

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);

export default clerkEnabled ? authenticatedProxy : function demoProxy() {
  return NextResponse.next();
};

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
