export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { linkingCodes } from "@/drizzle/schema"
import { requireAuthSoft } from "@/lib/auth-server"
import { addMinutes } from "date-fns"

function genCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no O/0, I/1
  return Array.from({ length: 8 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("")
}

export async function POST() {
  const r = await requireAuthSoft()
  if (!r) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { user } = r

  const code = genCode()
  const expires = addMinutes(new Date(), 10)

  await db.insert(linkingCodes).values({
    code,
    userId: user.id,
    expiresAt: expires,
    used: false,
  })

  return NextResponse.json({ success: true, code, expiresAt: expires.toISOString() })
}
