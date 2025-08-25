import { NextResponse } from "next/server"
import { verifySession } from "@/lib/security"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const cookie = (req.headers.get("cookie") || "")
      .split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("session="))
      ?.split("=")[1]

    const session = cookie ? await verifySession(cookie) : null

    const res = NextResponse.json({ authenticated: !!session, uid: session?.uid ?? null })
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    return res
  } catch (e) {
    return NextResponse.json({ authenticated: false }, { status: 200 })
  }
}
