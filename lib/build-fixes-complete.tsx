🔧 v0 PROMPT — “Fix all build blockers & harden API routes”

Goal: Make the app build and run on Vercel without errors/warnings. Address:
\
Replace all Zod .nullable() calls (causing “nullable is not a
function
”)
with z.union([type, z.null()]).
\
Create/align lib/security.ts used by auth/TOTP routes (we currently have imports to
@/security that don’t exist).
\
Standardize requireAdmin() signature and usage (no params), and fix callers.

Remove any client-side use of Node crypto (move to server util
using node: crypto
).
\
Ensure scripts don’t leak env to the client (scripts/comprehensive-test-suite.js).

Fix app/account/settings/page.tsx to use auth.ok instead of auth.success.

Remove any stray extractUsedTable imports.
\
Keep Node runtime
for API routes and bypass
static
analysis
where
needed.
\
0) Pre-flight
\
Search the repo
for these patterns and fix
globally:
\
\.nullable\( → replace
with a union
w/ z.null().
\
from "@/security" → change to from "@/lib/security".

requireAdmin( → should be no arguments call.

extractUsedTable → remove any imports/usage.
node: crypto
".
\
1) Zod: kill .nullable() everywhere

For all API schemas (admin/products, seasons, filters
auth / change - password
auth / totp / setup, auth / totp / verify
and
any
others
), change:
\
// BAD\
description: z.string().nullable().optional(),
imageUrl: z.string().url().nullable().optional(),
seasonId: z.string().uuid().nullable().optional(),

// GOOD
description: z.union([z.string(), z.null()]).optional(),
imageUrl: z.union([z.string().url(), z.null()]).optional(),
seasonId: z.union([z.string().uuid(), z.null()]).optional(),

\
Also ensure you’re
using z
.union
for any nullable arrays
:
\
images: z.union([z.array(z.string().url()), z.null()]).optional(),


Set these exports at the top of any API route that runs on the edge by default:

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

Files
to
patch (at minimum)
:
\
app/api/admin/products/route.ts

app/api/admin/products/[id]/route.ts

app/api/admin/seasons/route.ts

app/api/filters/route.ts

app/api/auth/change-password/route.ts

app/api/auth/totp/setup/route.ts

app/api/auth/totp/verify/route.ts

2) Provide lib/security.ts used by those auth routes
\
Create lib/security.ts
with the minimal
surface
the
routes
call(bcrypt + otplib).If
some
functions
are
already
elsewhere, keep
their
imports
otherwise, implement
them
here:
\
// lib/security.ts\
import { authenticator } from "otplib"
import bcrypt from "bcryptjs"

// Password helpers
export async function hashPassword(plain: string) {
  const rounds = 12
  return bcrypt.hash(plain, rounds)
}
export async function verifyPassword(plain: string, hash: string) {
  try {
    return await bcrypt.compare(plain, hash)
  } catch {
    return false
  }
}

// TOTP helpers
export function issueTotpSecret() {
  return authenticator.generateSecret()
}
export function buildTotpURI({ secret, label, issuer }: { secret: string; label: string; issuer: string }) {
  return authenticator.keyuri(label, issuer, secret)
}
export function verifyTotpToken({ token, secret }: { token: string; secret: string }) {
  return authenticator.check(token, secret)
}

// Optional: no-op hooks (routes may call them; keep API stable)
export async function recordSecurityEvent(_event: {
  userId?: string
  type: string
  ip?: string
  ua?: string
  meta?: Record<string, unknown>
}) {
  /* no-op, or write to DB if available */
}

Then, update
imports in the
routes:
\
\
3) Unify requireAdmin signature & fix callers

lib/auth/middleware.ts (or create it
if missing)
:
\
// lib/auth/middleware.ts
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { verifySessionTolerant } from "@/lib/auth-server" // your existing tolerant verifier

export async function requireAdmin() {
  const cookieStore = await cookies()
  const session = await verifySessionTolerant(cookieStore.get("session")?.value)
  if (!session?.userId || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return { userId: session.userId }
}

\
Call sites (e.g. app/api/admin/products/route.ts):

const { requireAdmin } = await import("@/lib/auth/middleware")
const auth = await requireAdmin()
if (auth instanceof NextResponse) return auth; // if you chose the union style

\
If your requireAdmin just returns
{
  userId
}
or
throws / returns
NextResponse, keep
the
pattern
above
and
do not pass
request
anymore.
\
4) Move Node crypto out of client components

Create lib/node-crypto.ts:

// lib/node-crypto.ts
"use server"
import { createHmac, randomBytes } from "node:crypto"

export function hmacSHA256(secret: string, input: string) {
  return createHmac("sha256", secret).update(input).digest("hex")
}
export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("hex")
}

\
Replace any
"crypto\" inside client components with calls into server actions or this server util.

If you need client-side hashing, use Web Crypto (crypto.subtle) instead.

5) Stop env leakage & fix the test script

Ensure scripts/comprehensive-test-suite.js is not imported by anything under app/ or src/. It should remain runnable by node only.
\
Edit the file to not
;/ .8:;aaacddeeeeefhilllmnnoopprrsstttttuvvy{}

// scripts/comprehensive-test-suite.js
/* eslint-disable */
// Node-only script. Do not import from app/ to avoid bundling into Next.js client.
import "dotenv/config"

const required = ["DATABASE_URL", "TELEGRAM_BOT_TOKEN"] // add server-only keys here
for (const k of required) {
  if (!process.env[k]) console.warn(`[env] Missing ${k}`)
}
// Never reference NEXT_PUBLIC_* here; this script must remain server-only.

\
If there’s any lingering NEXT_PUBLIC_* in this script, remove it. Keep the script outside of Next’s
namespace graph.

6
) Fix Settings page auth shape

Update app/account/settings/page.tsx to use auth.ok:

import { requireAuth } from "@/lib/auth-server"
// ...
export default async function SettingsPage() {
  const auth = await requireAuth()
  if (!auth.ok) {
    // optional: redirect("/login"); otherwise:
    return <div>Authentication required</div>
  }
  // ...render settings using auth.userId/session...
}

7
) Remove stray drizzle HMR
and
remove
any
extractUsedTable (sometimes appears in generated or experimental code). It
’s not needed and breaks HMR/preview.

8) Keep API routes on Node & dynamic

At the top of each problematic route:

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

9
) Validate paths/aliases

Ensure tsconfig.json has:

{
  ;("compilerOptions")
  :
  ;("baseUrl")
  : ".",
    "paths":
  ;("@/*")
  : ["*"]
}

…and that
@/lib/security
and
@/lib/auth
;-server
physically
exist.

10
) Sanity checklist (v0, please confirm after applying)

✅ No occurrences of .nullable( remain in repo.

✅ All
@/security imports replaced with @/lib
;/security, and that file exists with bcrypt/bilopt
helpers
shown
above.

✅ All admin route callers use await requireAdmin() without arguments, and the helper returns either
{
  userId
}
or
NextResponse as implemented.

✅ No client component imports from "crypto" or "node:crypto". Any crypto is done via lib/node-crypto.ts or server actions.

✅ scripts/comprehensive-test-suite.js is not imported by the app, and does not reference any NEXT_PUBLIC_* variables.

✅ app/account/settings/page.tsx checks auth.ok, not auth.success.

✅ No usage of extractUsedTable.

✅ Build passes: pnpm build.

If anything is unclear during the refactor, prefer creating minimal stubs that match the call sites (e.g., recordSecurityEvent) rather than deleting calls — keep the API surface stable, then wire in real DB later.

Please apply all changes and report back the diffs & whether pnpm build now succeeds on Vercel.
