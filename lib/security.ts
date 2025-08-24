import crypto from "crypto";

// Accept base64 or utf8 secret; require >=32 bytes
function getKey(): Buffer | null {
  const s = process.env.SESSION_SECRET || "";
  if (!s) return null;
  try {
    const b64 = Buffer.from(s, "base64");
    if (b64.length >= 32) return b64;
  } catch {}
  const raw = Buffer.from(s, "utf8");
  return raw.length >= 32 ? raw : null;
}

export async function verifySession(cookieVal: string): Promise<{ uid: string; exp: number } | null> {
  try {
    const [payloadB64u, macB64u] = cookieVal.split(".");
    if (!payloadB64u || !macB64u) return null;

    const key = getKey();
    if (!key) {
      console.error("[security] SESSION_SECRET missing/short");
      return null;
    }

    const payloadJson = Buffer.from(
      payloadB64u.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf8");

    const payload = JSON.parse(payloadJson) as { uid?: string; exp?: number };
    if (!payload?.uid || !payload?.exp) return null;

    const mac = crypto.createHmac("sha256", key).update(payloadB64u).digest();
    const macCheck = Buffer.from(macB64u.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    if (mac.length !== macCheck.length || !crypto.timingSafeEqual(mac, macCheck)) return null;

    if (Math.floor(Date.now() / 1000) > payload.exp) return null;
    return { uid: payload.uid, exp: payload.exp };
  } catch {
    return null; // never throw into Server Components
  }
}
