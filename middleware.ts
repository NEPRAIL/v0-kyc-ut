// middleware.ts — TEMP NO-OP to prove middleware isn't the crash source
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Exclude Next.js assets and common static files
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt)).*)",
  ],
};

export function middleware(_req: NextRequest) {
  return NextResponse.next();
}
