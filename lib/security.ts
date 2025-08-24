import crypto from 'crypto';

const b64u = (buf: Buffer) =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

export async function verifySession(cookieVal: string): Promise<{ uid: string; exp: number } | null> {
  try {
    // cookie format: base64url(payload).base64url(mac)
    const [payloadB64u, macB64u] = cookieVal.split('.');
    if (!payloadB64u || !macB64u) return null;

    const secret = process.env.SESSION_SECRET;
    if (!secret) {
      console.error('[security] SESSION_SECRET missing');
      return null;
    }

    const payloadJson = Buffer.from(payloadB64u.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson) as { uid?: string; exp?: number };
    if (!payload?.uid || !payload?.exp) return null;

    // HMAC
    const mac = crypto.createHmac('sha256', Buffer.from(secret, 'base64')).update(payloadB64u).digest();
    const macCheck = Buffer.from(macB64u.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

    if (mac.length !== macCheck.length || !crypto.timingSafeEqual(mac, macCheck)) return null;
    if (Date.now() / 1000 > payload.exp) return null; // expired

    return { uid: payload.uid, exp: payload.exp };
  } catch {
    return null; // never throw
  }
}
