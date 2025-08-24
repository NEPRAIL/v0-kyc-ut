import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
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

    return NextResponse.json({ success: true, message: "Token is valid" })
  } catch (error) {
    console.error("Token verification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
