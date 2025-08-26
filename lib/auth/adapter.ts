// lib/auth/adapter.ts
import type { NextRequest } from "next/server"

/**
 * Dynamic import that does NOT get statically resolved by the bundler.
 * This prevents "module not found" at build time for optional paths.
 */
const din = (p: string) => (Function("p", "return import(p)") as any)(p).catch(() => null)

/**
 * Try several modules that *might* export a verifier.
 * Return a function or null.
 */
async function getVerifier() {
  const candidates = ["@/lib/auth-server", "@/lib/security", "@/lib/auth/middleware"]
  for (const p of candidates) {
    const mod = await din(p)
    if (mod?.verifySession) return mod.verifySession
    if (mod?.getSession) return mod.getSession
    if (mod?.requireAuth) return mod.requireAuth
  }
  return null
}

export async function verifySessionFromRequest(req: NextRequest): Promise<any | null> {
  // Prefer cookie "session". Adjust if your cookie name differs.
  const cookie = req.cookies.get("session")?.value ?? null

  const verify = await getVerifier()
  if (!verify) return null

  try {
    // Try both signatures: (cookie, req) or (req)
    const res = (await verify(cookie, req)) ?? (await verify(req)) ?? null
    return res || null
  } catch {
    return null
  }
}
