import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/auth/adapter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (status: number, data: any) => NextResponse.json(data, { status });
const din = (p: string) =>
  (Function("p", "return import(p)") as any)(p).catch(() => null);

export async function POST(req: NextRequest) {
  // 1) Auth
  const session = await verifySessionFromRequest(req);
  if (!session?.userId) return json(401, { error: "Authentication required" });

  // 2) Parse body (no zod)
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }
  const current = (body?.currentPassword ?? "").toString();
  const next = (body?.newPassword ?? "").toString();
  // Optional TOTP code; accept null cleanly
  const totp = body?.totpCode == null ? null : String(body.totpCode);

  if (!next || next.length < 8) {
    return json(400, { error: "New password must be at least 8 characters" });
  }

  // 3) Load DB & bcrypt dynamically
  const dbMod = await din("@/lib/db");
  const schemaMod = await din("@/lib/db/schema");
  const ormMod = await din("drizzle-orm");
  const bcrypt = await din("bcryptjs");

  const db = dbMod?.db;
  const users = schemaMod?.users;
  const eq = ormMod?.eq;

  if (!(db && users && eq && bcrypt)) {
    // If your DB layer isn’t available in this environment, fail gracefully
    return json(501, { error: "Password change not available on this env" });
  }

  // 4) Fetch user
  const row = await db.query.users.findFirst({
    where: (t: any, { eq: _eq }: any) => (eq || _eq)(t.id, session.userId),
    columns: { passwordHash: true, mfaSecret: true },
  });
  if (!row) return json(404, { error: "User not found" });

  // 5) Check current password
  const ok = await bcrypt.compare(current, row.passwordHash || "");
  if (!ok) return json(401, { error: "Current password is incorrect" });

  // 6) If MFA enabled, require valid code
  if (row.mfaSecret) {
    const otplib = await din("otplib");
    if (!otplib?.authenticator) {
      return json(500, { error: "TOTP library not available" });
    }
    if (!totp || !otplib.authenticator.check(totp, row.mfaSecret)) {
      return json(401, { error: "Invalid or missing TOTP code" });
    }
  }

  // 7) Update password
  const salt = await bcrypt.genSalt(12);
  const newHash = await bcrypt.hash(next, salt);

  await db
    .update(users)
    .set({ passwordHash: newHash })
    .where(eq(users.id, session.userId));

  return json(200, { success: true, message: "Password updated" });
}
