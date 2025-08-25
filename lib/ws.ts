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
