import { NextResponse } from "next/server"
import { z } from "zod"
import { getDb } from "@/lib/db"
import { users } from "@/lib/db/schema" // adjust paths
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  emailOrUsername: z.string().min(1),
  password: z.string().min(8).max(128),
})

function setCookie(res: NextResponse, uid: string) {
  const secret = process.env.SESSION_SECRET || ""
  if (!secret) {
    return NextResponse.json({ error: "Server misconfigured: missing env" }, { status: 500 })
  }
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 3600
  const payload = Buffer.from(JSON.stringify({ uid, exp })).toString("base64url")
  const key = (() => {
    try {
      const k = Buffer.from(secret, "base64")
      if (k.length >= 32) return k
    } catch {}
    const k2 = Buffer.from(secret, "utf8")
    return k2
  })()

  const mac = crypto.createHmac("sha256", key).update(payload).digest("base64url")
  const cookieVal = `${payload}.${mac}`

  res.cookies.set("session", cookieVal, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  })

  return res
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", code: "VALIDATION_ERROR", issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const { emailOrUsername, password } = parsed.data
    const db = getDb()

    const byEmail = emailOrUsername.includes("@")
    const row = await db
      .select()
      .from(users)
      .where(byEmail ? eq(users.email, emailOrUsername) : eq(users.username, emailOrUsername))
      .limit(1)

    const user = row[0]
    if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })

    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })

    // (Optional) persist session row if you use a sessions table:
    // await db.insert(sessions).values({ id: "sess_"+crypto.randomBytes(16).toString("hex"), user_id: user.id, expires_at: new Date(Date.now()+7*864e5) });

    const res = NextResponse.json({ success: true })
    return setCookie(res, user.id)
  } catch (e) {
    console.error("[login] error", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
