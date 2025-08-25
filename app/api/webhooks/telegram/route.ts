import { NextResponse } from "next/server"
import { z } from "zod"
import { getDb } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const authSchema = z.object({
  emailOrUsername: z.string().min(1),
  password: z.string().min(8).max(128),
})

export async function POST(req: Request) {
  try {
    console.log("[v0] Telegram webhook auth called")

    // Verify webhook secret
    const webhookSecret = req.headers.get("x-webhook-secret")
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET || "kycut_webhook_2024_secure_key_789xyz"

    if (webhookSecret !== expectedSecret) {
      console.log("[v0] Telegram auth failed - invalid webhook secret")
      return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const parsed = authSchema.safeParse(body)

    if (!parsed.success) {
      console.log("[v0] Telegram auth validation failed:", parsed.error.issues)
      return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 })
    }

    const { emailOrUsername, password } = parsed.data
    const db = getDb()

    console.log("[v0] Telegram auth attempt for:", emailOrUsername)

    // Find user by email or username
    const byEmail = emailOrUsername.includes("@")
    const row = await db
      .select()
      .from(users)
      .where(byEmail ? eq(users.email, emailOrUsername) : eq(users.username, emailOrUsername))
      .limit(1)

    const user = row[0]
    if (!user) {
      console.log("[v0] Telegram auth failed - user not found")
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash)
    if (!passwordValid) {
      console.log("[v0] Telegram auth failed - invalid password")
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    console.log("[v0] Telegram auth successful for user:", user.id)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.username,
      },
    })
  } catch (error) {
    console.error("[v0] Telegram webhook auth error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
