// lib/auth-server.ts
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/security'; // your existing server-only util

export async function requireAuth() {
  const cookie = cookies().get('session')?.value;
  if (!cookie) return { ok: false as const, status: 401 as const };

  try {
    const session = await verifySession(cookie);
    if (!session?.uid) return { ok: false as const, status: 401 as const };
    return { ok: true as const, userId: session.uid, session };
  } catch (e) {
    console.error('[requireAuth] verifySession failed', e);
    return { ok: false as const, status: 401 as const };
  }
}
