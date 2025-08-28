import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { getDb } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"

const bodySchema = z.object({ email: z.string().email(), username: z.string().min(3) })

export async function PUT(request: NextRequest) {
  try {
  const auth = await requireAuth()
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { email, username } = bodySchema.parse(await request.json())
  const db = getDb()

    // Validate input
    if (!email || !username) {
      return NextResponse.json({ error: "Email and username are required" }, { status: 400 })
    }

    // Uniqueness checks
    const conflictEmail = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
    if (conflictEmail[0] && conflictEmail[0].id !== auth.userId) {
      return NextResponse.json({ error: "Email is already taken" }, { status: 409 })
    }
    const conflictUsername = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1)
    if (conflictUsername[0] && conflictUsername[0].id !== auth.userId) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 409 })
    }

    await db
      .update(users)
      .set({ email, username, emailVerified: false, updatedAt: new Date() })
      .where(eq(users.id, auth.userId))

    return NextResponse.json({ message: "Profile updated successfully" })
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
