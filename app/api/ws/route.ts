export const runtime = "edge"

import { NextResponse } from "next/server"
import { WebSocketPair } from "next/server"
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
