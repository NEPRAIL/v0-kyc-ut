import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Check if token exists and is not expired
    const users = await sql`
      SELECT id, email FROM users 
      WHERE password_reset_token = ${token} 
      AND password_reset_expires > NOW()
      LIMIT 1
    `

    if (users.length === 0) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 })
    }

    const user = users[0]

    // Hash the new password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Update password and clear reset token
    await sql`
      UPDATE users 
      SET password_hash = ${hashedPassword},
          password_reset_token = NULL,
          password_reset_expires = NULL,
          updated_at = NOW()
      WHERE id = ${user.id}
    `

    console.log(`Password reset successful for user: ${user.email}`)

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully",
    })
  } catch (error) {
    console.error("Password reset error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
