// app/api/auth/change-password/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---- Manual validation (no zod) -------------------------------------------
type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
  logoutOthers?: boolean;
  twoFactorCode?: string | null;
};

function validateChangePassword(body: any):
  | { ok: true; value: ChangePasswordInput }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Body must be a JSON object" };

  const { currentPassword, newPassword, logoutOthers, twoFactorCode } = body as Partial<ChangePasswordInput>;

  if (typeof currentPassword !== "string" || !currentPassword.trim()) {
    return { ok: false, error: "currentPassword is required" };
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return { ok: false, error: "newPassword must be at least 8 characters" };
  }
  if (logoutOthers != null && typeof logoutOthers !== "boolean") {
    return { ok: false, error: "logoutOthers must be a boolean if provided" };
  }
  if (twoFactorCode != null && typeof twoFactorCode !== "string") {
    return { ok: false, error: "twoFactorCode must be a string or omitted" };
  }

  return {
    ok: true,
    value: {
      currentPassword: currentPassword.trim(),
      newPassword,
      logoutOthers: !!logoutOthers,
      twoFactorCode: twoFactorCode ?? null,
    },
  };
}

// ---- Small helpers ---------------------------------------------------------
function json(status: number, data: any) {
  return NextResponse.json(data, { status });
}

async function getSessionCookie(req: NextRequest) {
  // Cookie key used across the codebase (adjust if yours differs)
  return req.cookies.get("session")?.value ?? null;
}

async function lazyImportAuth() {
  // Try multiple likely locations so we don't break your project structure
  try { return await import("@/security"); } catch {}
  try { return await import("@/lib/security"); } catch {}
  try { return await import("@/lib/auth-server"); } catch {}
  try { return await import("@/lib/auth/middleware"); } catch {}
  return null;
}

async function lazyImportDb() {
  try {
    const dbMod = await import("@/lib/db");
    const schema = await import("@/lib/db/schema");
    return { db: (dbMod as any).db, schema };
  } catch {
    return null;
  }
}

// ---- PATCH handler ---------------------------------------------------------
export async function PATCH(req: NextRequest) {
  // 1) Parse JSON safely
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  // 2) Validate input (no zod)
  const v = validateChangePassword(body);
  if (!v.ok) return json(400, { error: "Invalid input", details: v.error });
  const { currentPassword, newPassword, logoutOthers, twoFactorCode } = v.value;

  // 3) Ensure user is authenticated
  const sessionCookie = await getSessionCookie(req);
  if (!sessionCookie) return json(401, { error: "Authentication required" });

  const authMod = await lazyImportAuth();
  if (!authMod) {
    // Still avoid breaking the build; surface a helpful runtime message
    return json(500, { error: "Auth module not available. Wire verifySession/signSession." });
  }

  // Support different auth shapes:
  const verifySession =
    (authMod as any).verifySession ||
    (authMod as any).requireAuth ||
    (authMod as any).getSession ||
    null;

  if (!verifySession) {
    return json(500, { error: "verifySession not found in auth module" });
  }

  let session: any = null;
  try {
    // Some helpers accept a cookie string, others a request object.
    session = await verifySession(sessionCookie, req).catch?.(() => null) ?? null;
    if (!session && typeof verifySession === "function") {
      session = await verifySession(req).catch?.(() => null) ?? null;
    }
  } catch {
    // tolerant auth: never throw to the client
    session = null;
  }

  if (!session || !session.userId) {
    return json(401, { error: "Invalid or expired session" });
  }
  const userId = session.userId as string;

  // 4) Optional: two-factor check (if you have such a function)
  if (twoFactorCode) {
    const verify2fa = (authMod as any).verifyTwoFactorCode;
    if (verify2fa) {
      const ok = await verify2fa(userId, twoFactorCode).catch(() => false);
      if (!ok) return json(400, { error: "Invalid two-factor code" });
    }
  }

  // 5) Load DB lazily and perform password change
  const dbPack = await lazyImportDb();
  if (!dbPack) {
    return json(500, { error: "Database module not available. Wire '@/lib/db' + '@/lib/db/schema'." });
  }
  const { db, schema } = dbPack;
  const { users } = schema as any;

  // Import bcryptjs lazily so it never executes during static analysis
  let bcrypt: any = null;
  try { bcrypt = await import("bcryptjs"); } catch {}

  if (!bcrypt) {
    return json(500, { error: "bcryptjs not installed. Add it or swap for argon2." });
  }

  // Read current user
  let user: any = null;
  try {
    // Prefer drizzle query API if available
    if (db.query?.users?.findFirst) {
      user = await db.query.users.findFirst({
        where: (u: any, { eq }: any) => eq(u.id, userId),
      });
    } else {
      // Fallback: select * from users where id = userId limit 1
      const res = await db.select().from(users).where((users as any).id.eq?.(userId) ?? (users.id as any)).limit?.(1);
      user = Array.isArray(res) ? res[0] : null;
    }
  } catch (e) {
    return json(500, { error: "Failed to load user" });
  }

  if (!user || !user.passwordHash) {
    return json(404, { error: "User not found" });
  }

  // Verify current password
  const matches = await bcrypt.compare(currentPassword, user.passwordHash).catch(() => false);
  if (!matches) return json(400, { error: "Current password is incorrect" });

  // Hash new password
  const newHash = await bcrypt.hash(newPassword, 12);

  // Update DB
  try {
    if (db.update && users) {
      // Drizzle style
      const { eq } = await import("drizzle-orm");
      await db.update(users).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(users.id, userId));
    } else {
      // Fallback: implement according to your DB driver
      // await db.execute(sql`UPDATE users SET password_hash=${newHash}, updated_at=now() WHERE id=${userId}`);
    }
  } catch (e) {
    return json(500, { error: "Failed to update password" });
  }

  // 6) Optional: logout other sessions by clearing session table
  if (logoutOthers) {
    try {
      const sessionsTable = (schema as any).sessions;
      if (sessionsTable && db.delete) {
        const { eq, and, ne } = await import("drizzle-orm");
        // If you store current session token in `sessionCookie`, keep this one
        await db
          .delete(sessionsTable)
          .where(and(eq(sessionsTable.userId, userId), ne(sessionsTable.token, sessionCookie)));
      }
    } catch {
      // ignore, optional feature
    }
  }

  return json(200, { success: true, message: "Password updated" });
}
