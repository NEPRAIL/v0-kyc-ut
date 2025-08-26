import { NextResponse } from "next/server"
import { requireAuthSoft } from "@/lib/auth-server"

export async function GET() {
  const r = await requireAuthSoft()
  if (!r) return NextResponse.json({ authenticated: false }, { status: 200 })
  const { user } = r
  return NextResponse.json({ authenticated: true, user: { id: user.id, email: user.email, username: user.username } })
}
