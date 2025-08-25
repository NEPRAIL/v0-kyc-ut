import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEBUG_ROUTES !== "1") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  try {
    const secret = process.env.SESSION_SECRET || ""
    const h = await bcrypt.hash("x", 10)
    const ok = await bcrypt.compare("x", h)
    return NextResponse.json({
      ok,
      sessionSecretLen: secret.length,
      sessionSecretLooksValid: secret.length >= 32,
      runtime: "nodejs",
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
