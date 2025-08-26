import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/auth/adapter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (status: number, data: any) => NextResponse.json(data, { status });

// Small helper to import otplib only when needed.
// If it's not installed, we fail gracefully at runtime (not build time).
const din = (p: string) =>
  (Function("p", "return import(p)") as any)(p).catch(() => null);

export async function POST(req: NextRequest) {
  // 1) Auth guard
  const session = await verifySessionFromRequest(req);
  if (!session?.userId) {
    return json(401, { error: "Authentication required" });
  }

  // 2) Parse JSON manually (no zod / no .nullable())
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const code = (body?.code ?? "").toString().trim();
  // secret may come from client or be stored server-side; accept null cleanly
  const clientSecret =
    body?.secret == null ? null : String(body.secret);

  if (!code) return json(400, { error: "code is required" });

  // 3) Load secret from DB if available; fallback to clientSecret
  let secret: string | null = clientSecret;

  try {
    const dbMod = await din("@/lib/db");
    const schemaMod = await din("@/lib/db/schema");
    const eqMod = await din("drizzle-orm");

    const db = dbMod?.db;
    const users = schemaMod?.users;
    const eq = eqMod?.eq;

    if (db && users && eq) {
      const u = await db.query.users.findFirst({
        where: (t: any, { eq: _eq }: any) =>
          (eq || _eq)(t.id, session.userId),
        columns: { mfaSecret: true, mfaTempSecret: true },
      });
      // Prefer temp secret while setting up; else permanent secret; else client
      secret = (u?.mfaTempSecret || u?.mfaSecret || secret) ?? null;
    }
  } catch {
    // ignore DB errors (keep secret as-is)
  }

  if (!secret) return json(400, { error: "Missing TOTP secret" });

  // 4) Verify TOTP
  const otplib = await din("otplib");
  if (!otplib?.authenticator) {
    return json(500, { error: "TOTP library not available" });
  }
  const ok = otplib.authenticator.check(code, secret);
  if (!ok) return json(400, { error: "Invalid code" });

  // 5) Persist permanent secret if we can (and clear temp)
  try {
    const dbMod = await din("@/lib/db");
    const schemaMod = await din("@/lib/db/schema");
    const eqMod = await din("drizzle-orm");

    const db = dbMod?.db;
    const users = schemaMod?.users;
    const eq = eqMod?.eq;

    if (db && users && eq && db.update) {
      const update: any = {};
      if (users.mfaSecret) update.mfaSecret = secret;
      if (users.mfaTempSecret) update.mfaTempSecret = null;

      if (Object.keys(update).length) {
        await db.update(users).set(update).where(eq(users.id, session.userId));
      }
    }
  } catch {
    // ignore persistence errors; verification still succeeded
  }

  return json(200, { success: true, message: "Two-factor verified" });
}
