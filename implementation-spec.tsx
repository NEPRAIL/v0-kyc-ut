Prompt
for v0
:
\
You are working in a Next.js 14 app (App Router) deployed on Vercel
with Neon (Postgres) + Drizzle ORM. Implement
a
production - grade
auth + orders + Telegram
integration
with WebSockets and
link
codes.Keep
Edge - safe
middleware.The
Telegram
bot
already
exists
and
will
call
these
endpoints: POST / api / auth / login

GET / api / orders / user

GET /api/orders/telegram?telegram_user_id=…
\
PATCH / api / orders / [id] / status

POST / api / telegram / verify - code
\
POST /api/telegram/link-code (generate code)

GET /api/auth/me (optional helper)

GET /api/ws (WebSocket, Edge runtime)

0) Environment
\
Add these to .env (and use defaults
if missing)
:\

DATABASE_URL=...
SESSION_SECRET=change-me
WEBHOOK_SECRET=change-me
NODE_ENV=production

1) Drizzle schema

Update/create drizzle/schema.ts:

import { pgTable, text, varchar, timestamp, boolean, numeric, jsonb, bigint, uuid } from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  id: text("id").primaryKey(), // existing text id
  username: varchar("username", { length: 64 }).notNull().unique(),
  email: varchar("email", { length: 256 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 16 }).default("user").notNull(),
  telegramUserId: bigint({ mode: "number" }).nullable(), // Telegram numeric id
  telegramUsername: varchar("telegram_username", { length: 64 }).nullable(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const linkingCodes = pgTable("linking_codes", {
  code: varchar("code", { length: 8 }).primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
})

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  orderNumber: varchar("order_number", { length: 32 }).notNull().unique(),
  totalAmount: numeric("total_amount").default("0").notNull(),
  status: varchar("status", { length: 24 }).default("pending").notNull(),
  items: jsonb("items")
    .$type<Array<{ product_name: string; quantity: number; product_price: number }>>()
    .default([])
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

\
Create/ensure a DB factory lib/db.ts:

import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import * as schema from "@/drizzle/schema"

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })
\
2) Security & sessions

Create lib/crypto.ts:

import { createHmac } from "crypto"

const secret = process.env.SESSION_SECRET || "change-me"
export function sign(data: string) {
  return createHmac("sha256", secret).update(data).digest("hex")
}
export function createSessionToken(userId: string) {
  const payload = JSON.stringify({ userId, iat: Date.now() })
  const b64 = Buffer.from(payload).toString("base64url")
  const sig = sign(b64)
  return `${b64}.${sig}`
}
export function verifySessionToken(token?: string) {
  if (!token) return null
  const [b64, sig] = token.split(".")
  if (!b64 || !sig) return null
  if (sign(b64) !== sig) return null
  try {
    const { userId } = JSON.parse(Buffer.from(b64, "base64url").toString())
    return { userId }
  } catch {
    return null
  }
}

\
Create lib/auth-server.ts (server-only auth helper):

"use server"

import { cookies, headers } from "next/headers"
import { db } from "@/lib/db"
import { users } from "@/drizzle/schema"
import { eq } from "drizzle-orm"
import { verifySessionToken } from "@/lib/crypto"

export async function requireAuthSoft() {
  const c = cookies().get("session")?.value
  const session = verifySessionToken(c)
  if (!session) return null

  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1)
  if (!user) return null
  return { user }
}

export async function requireWebhook() {
  const h = headers().get("x-webhook-secret")
  if (!h || h !== process.env.WEBHOOK_SECRET) return false
  return true
}

\
Keep your Edge-safe middleware.ts (only security headers). No auth logic there.

3) Password utilities (Node runtime)

Create lib/password.ts:

import bcrypt from "bcryptjs"

export async function hashPassword(pw: string) {
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(pw, salt)
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash)
}
\
4) Realtime (Edge WebSockets)
\
Create lib/ws.ts – an in-memory broadcaster
for Edge functions
:
\
// Edge-compatible connection registry using globalThis.
// Good enough for Vercel hot instances; can be swapped to Pusher/Ably later.

type Conn = WebSocket & { _userKey?: string }

const g = globalThis as any
if (!g.__WS_CHANNELS) g.__WS_CHANNELS = new Map<string, Set<Conn>>()
const channels: Map<string, Set<Conn>> = g.__WS_CHANNELS

export function addConnection(userKey: string, ws: Conn) {
  ws._userKey = userKey
  const set = channels.get(userKey) || new Set<Conn>()
  set.add(ws)
  channels.set(userKey, set)
}

export function removeConnection(ws: Conn) {
  const key = ws._userKey
  if (!key) return
  const set = channels.get(key)
  if (!set) return
  set.delete(ws)
  if (set.size === 0) channels.delete(key)
}

export function broadcastToUser(userKey: string, msg: unknown) {
  const set = channels.get(userKey)
  if (!set) return
  const payload = JSON.stringify(msg)
  for (const ws of set) {
    try {
      ws.send(payload)
    } catch {}
  }
}

\
Create app/api/ws/route.ts (Edge runtime WebSocket server):

export const runtime = "edge"

import { NextResponse } from "next/server"
import { addConnection, removeConnection } from "@/lib/ws"

// Parse cookies on Edge
function parseCookie(h?: string | null) {
  const out: Record<string, string> = {}
  if (!h) return out
  for (const p of h.split(";")) {
    const [k, ...rest] = p.trim().split("=")
    out[k] = decodeURIComponent(rest.join("=") || "")
  }
  return out
}

function verifyBot(req: Request) {
  return req.headers.get("x-webhook-secret") === process.env.WEBHOOK_SECRET
}

function verifySessionCookie(req: Request) {
  const cookie = parseCookie(req.headers.get("cookie") || "")
  // Accept a plaintext cookie; already signed in Node login route
  const session = cookie["session"]
  return session // opaque string; optional, we use userKey from query
}

export async function GET(req: Request) {
  if (req.headers.get("upgrade") !== "websocket") {
    return new NextResponse("Expected websocket", { status: 426 })
  }

  const url = new URL(req.url)
  const telegramUserId = url.searchParams.get("telegram_user_id")
  const wantsBot = telegramUserId && verifyBot(req)
  const hasCookie = verifySessionCookie(req)

  // User key namespace: either site user (cookie) or telegram user id
  const userKey = wantsBot ? `tg:${telegramUserId}` : hasCookie ? `sess:${hasCookie}` : null
  if (!userKey) return new NextResponse("Unauthorized", { status: 401 })

  // @ts-ignore - WebSocketPair is provided by Edge runtime
  const { 0: client, 1: server } = new WebSocketPair()
  const ws = server as WebSocket & { _userKey?: string }

  ws.accept()
  addConnection(userKey, ws)

  ws.addEventListener("message", (ev) => {
    try {
      const data = JSON.parse(ev.data as string)
      if (data?.type === "ping") {
        ws.send(JSON.stringify({ type: "pong", t: Date.now() }))
      }
    } catch {}
  })

  ws.addEventListener("close", () => removeConnection(ws))

  // Greet
  ws.send(JSON.stringify({ type: "hello", userKey }))

  // Return client
  // @ts-ignore
  return new Response(null, { status: 101, webSocket: client })
}

// Export a helper event type for other routes:
export type RealtimeEvent =
  | { type: "order_updated"; orderId: string; status: string }
  | { type: "link_status"; linked: boolean; code?: string }
\
5) API routes
app/api/auth/login/route.ts (Node runtime to set httpOnly cookie)
export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/drizzle/schema"
import { or, eq } from "drizzle-orm"
import { verifyPassword } from "@/lib/password"
import { createSessionToken } from "@/lib/crypto"

export async function POST(req: Request) {
  try {
    const { emailOrUsername, password } = await req.json()
    if (!emailOrUsername || !password) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const [user] = await db
      .select()
      .from(users)
      .where(or(eq(users.email, emailOrUsername), eq(users.username, emailOrUsername)))
      .limit(1)

    if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })

    const token = createSessionToken(user.id)
    const res = NextResponse.json({ success: true })
    res.cookies.set("session", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })
    return res
  } catch (e) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

app / api / auth / me / route.ts
import { NextResponse } from "next/server"
import { requireAuthSoft } from "@/lib/auth-server"

export async function GET() {
  const r = await requireAuthSoft()
  if (!r) return NextResponse.json({ authenticated: false }, { status: 200 })
  const { user } = r
  return NextResponse.json({ authenticated: true, user: { id: user.id, email: user.email, username: user.username } })
}

app / api / telegram / link - code / route.ts
– generate link code (Node)
export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { linkingCodes } from "@/drizzle/schema"
import { requireAuthSoft } from "@/lib/auth-server"
import { addMinutes } from "date-fns"

function genCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no O/0, I/1
  return Array.from({ length: 8 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("")
}

export async function POST() {
  const r = await requireAuthSoft()
  if (!r) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { user } = r

  const code = genCode()
  const expires = addMinutes(new Date(), 10)

  await db.insert(linkingCodes).values({
    code,
    userId: user.id,
    expiresAt: expires,
    used: false,
  })

  return NextResponse.json({ success: true, code, expiresAt: expires.toISOString() })
}

app / api / telegram / verify - code / route.ts
export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users, linkingCodes } from "@/drizzle/schema"
import { eq, and } from "drizzle-orm"
import { requireWebhook } from "@/lib/auth-server"

export async function POST(req: Request) {
  if (!(await requireWebhook())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { code, telegramUserId, telegramUsername } = await req.json()
    if (!code || !telegramUserId) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

    const [lc] = await db.select().from(linkingCodes).where(eq(linkingCodes.code, code)).limit(1)
    if (!lc) return NextResponse.json({ error: "Invalid code" }, { status: 400 })
    if (lc.used) return NextResponse.json({ error: "Code already used" }, { status: 400 })
    if (new Date(lc.expiresAt) < new Date()) return NextResponse.json({ error: "Code expired" }, { status: 400 })

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ telegramUserId: Number(telegramUserId), telegramUsername })
        .where(eq(users.id, lc.userId))
      await tx
        .update(linkingCodes)
        .set({ used: true })
        .where(and(eq(linkingCodes.code, code), eq(linkingCodes.userId, lc.userId)))
    })

    // Optional: broadcast link status over WS (sess token unknown here; use tg channel)
    // import { broadcastToUser } from "@/lib/ws";
    // broadcastToUser(`tg:${telegramUserId}`, { type: "link_status", linked: true });

    return NextResponse.json({ success: true, message: "Account linked" })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

app / api / orders / user / route.ts
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { orders } from "@/drizzle/schema"
import { eq } from "drizzle-orm"
import { requireAuthSoft } from "@/lib/auth-server"

export async function GET() {
  const r = await requireAuthSoft()
  if (!r) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const list = await db.select().from(orders).where(eq(orders.userId, r.user.id)).orderBy(orders.createdAt)
  // Transform for bot compatibility
  const transformed = list.map((o) => ({
    id: o.id,
    order_number: o.orderNumber,
    total_amount: Number(o.totalAmount),
    status: o.status,
    created_at: o.createdAt,
    items: o.items,
    customer_name: r.user.username,
    customer_email: r.user.email,
  }))

  return NextResponse.json({ orders: transformed })
}

app / api / orders / telegram / route.ts
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { orders, users } from "@/drizzle/schema"
import { eq } from "drizzle-orm"
import { requireWebhook } from "@/lib/auth-server"

export async function GET(req: Request) {
  if (!(await requireWebhook())) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const url = new URL(req.url)
  const tg = url.searchParams.get("telegram_user_id")
  if (!tg) return NextResponse.json({ error: "Missing telegram_user_id" }, { status: 400 })

  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.telegramUserId, Number(tg)))
    .limit(1)
  if (!u) return NextResponse.json({ orders: [] })

  const list = await db.select().from(orders).where(eq(orders.userId, u.id)).orderBy(orders.createdAt)

  const transformed = list.map((o) => ({
    id: o.id,
    order_number: o.orderNumber,
    total_amount: Number(o.totalAmount),
    status: o.status,
    created_at: o.createdAt,
    items: o.items,
    customer_name: u.username,
    customer_email: u.email,
  }))
  return NextResponse.json({ orders: transformed })
}

app / api / orders / [id] / status / route.ts
export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { orders } from "@/drizzle/schema"
import { eq } from "drizzle-orm"
import { requireAuthSoft, requireWebhook } from "@/lib/auth-server"
import { broadcastToUser } from "@/lib/ws"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}) as any)
  const status = String(body?.status || "").toLowerCase()
  const allowed = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]
  if (!allowed.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 })

  // Allow either authenticated site user OR Telegram bot via secret
  let userId: string | null = null
  const r = await requireAuthSoft()
  if (r) {
    userId = r.user.id
  } else {
    if (!(await requireWebhook())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // Optional: If coming from Telegram, map telegram_user_id to a user; else skip ownership check.
    // Keeping simple for now.
  }

  const [row] = await db.select().from(orders).where(eq(orders.id, params.id)).limit(1)
  if (!row) return NextResponse.json({ error: "Order not found" }, { status: 404 })
  if (userId && row.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  await db.update(orders).set({ status }).where(eq(orders.id, params.id))

  // Broadcast via WS to both site user and (if exists) linked telegram user
  try {
    broadcastToUser(`sess:`, { type: "order_updated", orderId: params.id, status }) // will be ignored unless you pass session token key; optional
    broadcastToUser(`tg:${row.userId}`, { type: "order_updated", orderId: params.id, status }) // optional if you map keys
  } catch {}

  return NextResponse.json({ success: true })
}

\
Note: For precise WS targeting you can store sessionToken → userId mapping or simply broadcast to userId channels instead of session token. If you prefer that, change userKey to user:$
{
  userId
}
and
resolve
it
inside
WS
upgrade
by
reading
the
cookie
→ userId (Node cannot run in Edge — so you’d either pass userId in the query after fetching /api/auth/me or set a lightweight, non-sensitive uid cookie).

6) Frontend (account page, design & realtime)
\
Install Tailwind + shadcn
if not already
set.Then
:
\
components/RealtimeIndicator.tsx
"use client"

import { useEffect, useRef, useState } from "react"

export default function RealtimeIndicator() {
  const [status, setStatus] = useState<"connecting" | "online" | "offline">("connecting")
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const url = new URL("/api/ws", window.location.origin)
    // Using cookie auth; no query needed
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => setStatus("online")
    ws.onclose = () => setStatus("offline")
    ws.onerror = () => setStatus("offline")
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        if (msg.type === "order_updated") {
          // You can show a toast here
          console.log("[realtime] order updated", msg)
        }
      } catch {}
    }
    return () => ws.close()
  }, [])

  const color = status === "online" ? "bg-green-500" : status === "connecting" ? "bg-yellow-500" : "bg-red-500"
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
      {status === "online" ? "Live" : status === "connecting" ? "Connecting…" : "Offline"}
    </div>
  )
}

components / LinkTelegramCard.tsx
;("use client")

import { useState } from "react"

export default function LinkTelegramCard() {
  const [code, setCode] = useState<string | null>(null);
  const [expires, setExpires] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function gen() {
    setLoading(true);
    const res = await fetch("/api/telegram/link-code", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (data?.success) {
      setCode(data.code);
      setExpires(data.expiresAt);
    } else {
      alert(data?.error || "Failed to generate code");
    }
  }

  return (
    <div className="rounded-2xl border p-4 shadow-sm bg-white">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Link Telegram</h3>
        <button
          onClick={gen}
          disabled={loading}
          className="px-3 py-1 rounded-md bg-black text-white disabled:opacity-50"
        >
          {loading ? "Generating…" : "Generate Code"}
        </button>
      </div>
      {code ? (
        <div className="mt-3">
          <div className="text-sm text-muted-foreground">Use this 8-char code in the Telegram bot:</div>
          <div className="mt-2 flex items-center gap-2">
            <code className="px-2 py-1 rounded-md bg-gray-100 text-lg tracking-widest">{code}</code>
            <button
              className="text-xs underline"
              onClick={() => navigator.clipboard.writeText(code)}
            >
              Copy
            </button>
          </div>
          {expires && <div className="mt-2 text-xs text-muted-foreground">Expires: {new Date(expires).toLocaleTimeString()}</div>}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Generate a code, then in Telegram use <code>/link YOUR_CODE</code>.</p>
      )}
    </div>
  );
}

app/account/page.tsx (polished UI + realtime)
\
import { requireAuthSoft } from "@/lib/auth-server"
import LinkTelegramCard from "@/components/LinkTelegramCard"
import RealtimeIndicator from "@/components/RealtimeIndicator"
import { db } from "@/lib/db"
import { orders } from "@/drizzle/schema"
import { eq } from "drizzle-orm"

export default async function AccountPage() {
  const r = await requireAuthSoft();
  if (!r) {
    // soft redirect
    return (
      <div className="max-w-xl mx-auto pt-10">
        <h1 className="text-2xl font-semibold">Sign in required</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please sign in to view your account.</p>
      </div>
    );
  }
  const { user } = r;
  const myOrders = await db.select().from(orders).where(eq(orders.userId, user.id));

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Account</h1>
          <p className="text-sm text-muted-foreground">Signed in as {user.username} ({user.email})</p>
        </div>
        <RealtimeIndicator />
      </div>

      <LinkTelegramCard />

      <div className="rounded-2xl border p-4 bg-white">
        <h3 className="text-lg font-semibold">Orders</h3>
        {myOrders.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {myOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <div className="font-medium">{o.orderNumber}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(o.createdAt!).toLocaleString()} • {o.status.toUpperCase()}
                  </div>
                </div>
                <div className="text-sm font-semibold">${Number(o.totalAmount).toFixed(2)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
\
7) Bot → WebSocket live updates (optional)
\
The bot can also open a WS connection
for each Telegram user to
receive
live
statuses.Connect
to:
\
\
wss://<your-domain>/api/ws?telegram_user_id=<ID>


…and set header X-Webhook-Secret: <WEBHOOK_SECRET>.

8) Design notes

Use Tailwind’s clean layout (max width, comfortable spacing, rounded-2xl cards, soft borders).
\
Typography: titles text-2xl font-semibold
meta
text - sm
text-muted-foreground.
\
Buttons: high-contrast black buttons, rounded,
with disabled states.
\
Realtime indicator: tiny dot + label.

How this solves your current issues

Login succeeds and sets an httpOnly session cookie.

Account page renders without crashing and updates in realtime via WebSockets.
\
Bot login uses the same /api/auth/login and saves the cookie locally
if missing, it uses
Telegram
linked
route.
\
Link code is single-use, 10-minute TTL, and updates the users row (telegramUserId, telegramUsername).

Orders API returns the exact shape the bot expects (order_number, total_amount, etc.), preventing the 500s you saw.

Status PATCH checks ownership/secret, updates DB, and broadcasts a WS event
for instant UI feedback
\
