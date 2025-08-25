// lib/with-auth.ts
import { type NextRequest, NextResponse } from "next/server"
import { getAuthFromRequest } from "@/lib/auth-server"

export async function requireUser(req: NextRequest) {
  const auth = await getAuthFromRequest()
  if (!auth?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return auth // { userId }
}
