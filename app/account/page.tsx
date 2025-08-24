export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { getServerAuth } from "@/lib/auth/middleware"
import { getDb } from "@/lib/db/index"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export default async function AccountPage() {
  const auth = await getServerAuth()
  if (!auth) {
    redirect("/login")
  }

  try {
    const db = getDb()
    const row = await db
      .select({ id: users.id, username: users.username, email: users.email })
      .from(users)
      .where(eq(users.id, auth.user.uid))
      .limit(1)

    const me = row[0]
    if (!me) {
      console.warn("[account] no user row for", auth.user.uid)
      redirect("/login")
    }

    return (
      <main style={{ padding: 24 }}>
        <h1>Welcome, {me.username}</h1>
        <p>{me.email}</p>
      </main>
    )
  } catch (e) {
    console.error("[account] db error", e)
    redirect("/login") // fail soft, avoid server render crash
  }
}
