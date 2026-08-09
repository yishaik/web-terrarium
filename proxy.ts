import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware(async (auth, request) => {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/dashboard") || (path.startsWith("/api/terrariums") && request.method !== "GET")) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
