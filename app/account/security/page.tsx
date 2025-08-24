export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-server";
import { getDb } from "@/lib/db";
import { users } from "@/db/schema";        // adjust to your actual path
import { eq } from "drizzle-orm";

export default async function AccountPage() {
  const r = await requireAuth();
  if (!r.ok) redirect("/login");

  let me: { id: string; username: string | null; email: string | null } | null = null;

  try {
    const db = getDb();
    const rows = await db
      .select({ id: users.id, username: users.username, email: users.email })
      .from(users)
      .where(eq(users.id, r.userId))       // <-- Make sure users.id type matches r.userId
      .limit(1);

    me = rows[0] ?? null;
  } catch (e) {
    console.error("[account] DB error", e);
    // don't throw inside a Server Component; fail soft:
    redirect("/login");
  }

  if (!me) {
    console.warn("[account] no user row for", r.userId);
    redirect("/login");
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Welcome, {me.username ?? "user"}</h1>
      <p>{me.email}</p>
    </main>
  );
}
