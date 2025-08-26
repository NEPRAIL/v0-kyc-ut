import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { randomBytes } from "node:crypto"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Check if user exists
    const users = await sql`
      SELECT id, email, username FROM users WHERE email = ${email} LIMIT 1
    `

    if (users.length === 0) {
      // Don't reveal if email exists or not for security
      return NextResponse.json({
        success: true,
        message: "If an account with that email exists, we've sent password reset instructions.",
      })
    }

    const user = users[0]

    // Generate secure reset token
    const resetToken = randomBytes(32).toString("hex")
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now

    // Store reset token in database
    await sql`
      UPDATE users 
      SET password_reset_token = ${resetToken}, 
          password_reset_expires = ${resetTokenExpiry.toISOString()}
      WHERE id = ${user.id}
    `

    // In a real application, you would send an email here
    // For now, we'll log the reset link
    const resetUrl = `${process.env.WEBSITE_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`
    console.log(`Password reset link for ${email}: ${resetUrl}`)

    // TODO: Send email with reset link
    // await sendPasswordResetEmail(email, resetUrl)

    return NextResponse.json({
      success: true,
      message: "Password reset instructions sent to your email.",
    })
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
