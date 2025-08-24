import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/middleware"
import { getUserByEmail, getUserByUsername } from "@/lib/auth/database"
import { isValidEmail, isValidUsername } from "@/lib/auth/security"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function PUT(request: NextRequest) {
  try {
    const { user } = await requireAuth(request)
    const { email, username } = await request.json()

    // Validate input
    if (!email || !username) {
      return NextResponse.json({ error: "Email and username are required" }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    if (!isValidUsername(username)) {
      return NextResponse.json({ error: "Invalid username format" }, { status: 400 })
    }

    // Check if email is taken by another user
    if (email !== user.email) {
      const existingUser = await getUserByEmail(email)
      if (existingUser && existingUser.id !== user.id) {
        return NextResponse.json({ error: "Email is already taken" }, { status: 409 })
      }
    }

    // Check if username is taken by another user
    if (username !== user.username) {
      const existingUser = await getUserByUsername(username)
      if (existingUser && existingUser.id !== user.id) {
        return NextResponse.json({ error: "Username is already taken" }, { status: 409 })
      }
    }

    // Update user profile
    await sql`
      UPDATE users 
      SET email = ${email}, 
          username = ${username},
          email_verified = ${email !== user.email ? false : user.email_verified},
          updated_at = NOW()
      WHERE id = ${user.id}
    `

    return NextResponse.json({ message: "Profile updated successfully" })
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
