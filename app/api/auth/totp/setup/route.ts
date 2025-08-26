// app/api/auth/totp/setup/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// small helpers
const json = (status: number, data: any) => NextResponse.json(data, { status });

async function getSessionCookie(req: NextRequest) {
  return req.cookies.get("session")?.value ?? null; // adjust if your cookie key differs
}

async function lazyImportAuth() {
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

// GET: begin setup (issue a secret + otpauth URL)
export async function GET(req: NextRequest) {
  // 1) auth
  const cookie = await getSessionCookie(req);
  if (!cookie) return json(401, { error: "Authentication required" });

  const auth = await lazyImportAuth();
  if (!auth) return json(500, { error: "Auth module not available" });

  const verifySession =
    (auth as any).verifySession ||
    (auth as any).requireAuth ||
    (auth as any).getSession ||
    null;

  if (!verifySession) return json(500, { error: "verifySession not found" });

  let session: any = null;
  try {
    session = await verifySession(cookie, req).catch?.(() => null) ?? null;
    if (!session && typeof verifySession === "function") {
      session = await verifySession(req).catch?.(() => null) ?? null;
    }
  } catch {
    session = null;
  }
  if (!session?.userId) return json(401, { error: "Invalid or expired session" });

  // 2) generate TOTP secret
  let otplib: any;
  try {
    otplib = await import("otplib"); // or 'speakeasy' if you prefer
  } catch {
    return json(500, { error: "Missing dependency: otplib" });
  }

  const { authenticator } = otplib;
  const secret = authenticator.generateSecret();
  const issuer = process.env.NEXT_PUBLIC_SITE_NAME || "KYCut";
  const accountName = session.email || session.username || session.userId;
  const otpauth = authenticator.keyuri(accountName, issuer, secret);

  // 3) store a temp secret server-side (best effort)
  const dbPack = await lazyImportDb();
  if (dbPack) {
    const { db, schema } = dbPack;
    const { users } = schema as any;
    try {
      // Try to persist a temp secret if your schema supports it; otherwise ignore.
      if (db.update && users?.mfaTempSecret) {
        const { eq } = await import("drizzle-orm");
        await db.update(users).set({ mfaTempSecret: secret }).where(eq(users.id, session.userId));
      }
    } catch {
      // ignore if your schema doesn’t have that column
    }
  }

  return json(200, { success: true, secret, otpauth });
}

// POST: verify a code and persist permanent secret
export async function POST(req: NextRequest) {
  // 1) auth
  const cookie = await getSessionCookie(req);
  if (!cookie) return json(401, { error: "Authentication required" });

  const auth = await lazyImportAuth();
  if (!auth) return json(500, { error: "Auth module not available" });

  const verifySession =
    (auth as any).verifySession ||
    (auth as any).requireAuth ||
    (auth as any).getSession ||
    null;

  if (!verifySession) return json(500, { error: "verifySession not found" });

  let session: any = null;
  try {
    session = await verifySession(cookie, req).catch?.(() => null) ?? null;
    if (!session && typeof verifySession === "function") {
      session = await verifySession(req).catch?.(() => null) ?? null;
    }
  } catch {
    session = null;
  }
  if (!session?.userId) return json(401, { error: "Invalid or expired session" });

  // 2) parse JSON (no zod)
  let body: any;
  try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }
  const code = (body?.code ?? "").toString().trim();
  const secretFromClient = body?.secret ? String(body.secret) : null;
  if (!code) return json(400, { error: "code is required" });

  // 3) load secret (prefer server-side temp secret if present)
  let secret: string | null = secretFromClient;

  const dbPack = await lazyImportDb();
  if (dbPack) {
    const { db, schema } = dbPack;
    const { users } = schema as any;
    try {
      if (db.query?.users?.findFirst) {
        const u = await db.query.users.findFirst({
          where: (t: any, { eq }: any) => eq(t.id, session.userId),
          columns: { mfaTempSecret: true, mfaSecret: true },
        });
        secret = (u?.mfaTempSecret || u?.mfaSecret || secret) ?? null;
      }
    } catch {
      // ignore
    }
  }

  if (!secret) return json(400, { error: "Missing TOTP secret" });

  // 4) verify code
  let otplib: any;
  try { otplib = await import("otplib"); } catch {
    return json(500, { error: "Missing dependency: otplib" });
  }
  const isValid = otplib.authenticator.check(code, secret);
  if (!isValid) return json(400, { error: "Invalid code" });

  // 5) persist as permanent secret and clear temp if schema supports it
  if (dbPack) {
    const { db, schema } = dbPack;
    const { users } = schema as any;
    try {
      if (db.update && users) {
        const { eq } = await import("drizzle-orm");
        const update: any = {};
        if (users.mfaSecret) update.mfaSecret = secret;
        if (users.mfaTempSecret) update.mfaTempSecret = null;
        if (Object.keys(update).length) {
          await db.update(users).set(update).where(eq(users.id, session.userId));
        }
      }
    } catch {
      // ignore
    }
  }

  return json(200, { success: true, message: "Two-factor enabled" });
}
