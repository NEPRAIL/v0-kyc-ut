import { cookies } from "next/headers";
import { verifySession } from "@/lib/security";

export async function requireAuth() {
  const raw = cookies().get("session")?.value;
  if (!raw) return { ok: false as const, status: 401 as const };
  const session = await verifySession(raw);
  if (!session?.uid) return { ok: false as const, status: 401 as const };
  return { ok: true as const, userId: session.uid, session };
}
