export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/drizzle/schema"
import { or, eq } from "drizzle-orm"
import { verifyPassword } from "@/lib/password"
import { createSessionToken } from "@/lib/crypto"

export async function POST(req: Request) {
  try {
    const { emailOrUsername, password } = await req.json()
    if (!emailOrUsername || !password) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const [user] = await db
      .select()
      .from(users)
      .where(or(eq(users.email, emailOrUsername), eq(users.username, emailOrUsername)))
      .limit(1)

    if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })

    const token = createSessionToken(user.id)
    const res = NextResponse.json({ success: true })
    res.cookies.set("session", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })
    return res
  } catch (e) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
