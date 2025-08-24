import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const raw = cookies().get("session")?.value ?? null;
    const parsed = raw ? await verifySession(raw) : null;
    return NextResponse.json({
      hasCookie: !!raw,
      parsed: parsed ? { uid: parsed.uid, exp: parsed.exp } : null,
      hasSessionSecret: !!process.env.SESSION_SECRET,
    });
  } catch (e) {
    return NextResponse.json({ error: "debug failed" }, { status: 500 });
  }
}
