export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-server";
import { getDb } from "@/lib/db";          // your Drizzle factory
import { users } from "@/db/schema";       // adjust import to your schema path
import { eq } from "drizzle-orm";

export default async function AccountPage() {
  const r = await requireAuth();
  if (!r.ok) redirect("/login");

  try {
    const db = getDb();
    const row = await db
      .select({ id: users.id, username: users.username, email: users.email })
      .from(users)
      .where(eq(users.id, r.userId))
      .limit(1);

    const me = row[0];
    if (!me) {
      console.warn("[account] no user row for", r.userId);
      redirect("/login");
    }

    return (
      <main style={{ padding: 24 }}>
        <h1>Welcome, {me.username}</h1>
        <p>{me.email}</p>
      </main>
    );
  } catch (e) {
    console.error("[account] db error", e);
    redirect("/login"); // fail soft, avoid server render crash
  }
}
