export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { getServerAuth } from "@/lib/auth/middleware"
import { getDb } from "@/lib/db/index"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export default async function AccountPage() {
  console.log("[v0] Account page loading")

  const auth = await getServerAuth()
  console.log("[v0] Auth result:", auth ? { uid: auth.user?.uid, fullAuth: auth } : "null")

  if (!auth) {
    console.log("[v0] No auth, redirecting to login")
    redirect("/login")
  }

  try {
    console.log("[v0] Getting database connection")
    const db = getDb()

    console.log("[v0] Querying user data for ID:", auth.user.uid)
    const row = await db
      .select({ id: users.id, username: users.username, email: users.email })
      .from(users)
      .where(eq(users.id, auth.user.uid))
      .limit(1)

    console.log("[v0] Database query result:", row)
    const me = row[0]

    if (!me) {
      console.warn("[v0] No user row found for ID:", auth.user.uid)
      redirect("/login")
    }

    console.log("[v0] Account page rendering for user:", me.username)
    return (
      <main style={{ padding: 24 }}>
        <h1>Welcome, {me.username}</h1>
        <p>{me.email}</p>
      </main>
    )
  } catch (e) {
    console.error("[v0] Account page database error:", e)
    console.error("[v0] Error stack:", e instanceof Error ? e.stack : "No stack trace")
    redirect("/login") // fail soft, avoid server render crash
  }
}
