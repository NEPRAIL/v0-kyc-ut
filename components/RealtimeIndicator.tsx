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
