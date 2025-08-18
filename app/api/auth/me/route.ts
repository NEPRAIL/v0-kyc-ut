import { NextResponse } from "next/server"
import { validateRequest } from "@/lib/auth/lucia"

export async function GET() {
  try {
    const { user } = await validateRequest()

    if (!user) {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        totpSecret: user.totpSecret,
      },
    })
  } catch (error) {
    console.error("Get user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
