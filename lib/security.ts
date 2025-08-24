import crypto from "crypto";

// auto-detects base64 vs utf8 secret
function getKey() {
  const s = process.env.SESSION_SECRET || "";
  if (!s) return null;
  try {
    // try base64
    const k = Buffer.from(s, "base64");
    if (k.length >= 32) return k;
  } catch {}
  const k2 = Buffer.from(s, "utf8");
  return k2.length >= 32 ? k2 : null;
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

    const payloadJson = Buffer.from(payloadB64u.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
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
