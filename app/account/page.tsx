export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth-server"
import { getDb } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export default async function AccountPage() {
  const r = await requireAuth()
  if (!r.ok) redirect("/login")

  const db = getDb()

  const rows = await db
    .select({ id: users.id, username: users.username, email: users.email })
    .from(users)
    .where(eq(users.id, r.userId))
    .limit(1)

  const me = rows[0]
  if (!me) redirect("/login")

  return (
    <main style={{ padding: 24 }}>
      <h1>Welcome, {me.username ?? "user"}</h1>
      <p>{me.email}</p>
    </main>
  )
}
