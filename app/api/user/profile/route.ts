import { NextResponse } from "next/server"
import { z } from "zod"
import { getDb } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { requireAuth } from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const updateProfileSchema = z.object({
  username: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  name: z.string().min(1).max(100).optional(),
})

export async function GET() {
  try {
  const auth = await requireAuth()
  if (!auth.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = getDb()
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
  createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Profile fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireAuth()
  if (!auth.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = updateProfileSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 })
    }

    const db = getDb()
    const updateData = parsed.data

    // Check if username/email already exists (if being updated)
    if (updateData.username || updateData.email) {
      const existingUser = await db
        .select()
        .from(users)
        .where(updateData.username ? eq(users.username, updateData.username) : eq(users.email, updateData.email!))
        .limit(1)

      if (existingUser[0] && existingUser[0].id !== auth.userId) {
        return NextResponse.json(
          { error: updateData.username ? "Username already taken" : "Email already taken" },
          { status: 409 },
        )
      }
    }

  await db.update(users).set({ ...updateData, updatedAt: new Date() }).where(eq(users.id, auth.userId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
