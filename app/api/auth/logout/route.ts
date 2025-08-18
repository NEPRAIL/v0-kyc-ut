import { type NextRequest, NextResponse } from "next/server"
import { lucia, validateRequest } from "@/lib/auth/lucia"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { session } = await validateRequest()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await lucia.invalidateSession(session.id)
    const sessionCookie = lucia.createBlankSessionCookie()
    cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
