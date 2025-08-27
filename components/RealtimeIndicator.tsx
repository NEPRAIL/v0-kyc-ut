"use client"

import { useEffect, useRef, useState } from "react"

export default function RealtimeIndicator() {
  const [status, setStatus] = useState<"connecting" | "online" | "offline" | "error">("connecting")
  const [lastMessage, setLastMessage] = useState<string | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const maxReconnectAttempts = 5
  const reconnectDelay = 3000

  const connect = () => {
    try {
      const url = new URL("/api/ws", window.location.origin)
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        console.log("[realtime] Connected to WebSocket")
        setStatus("online")
        setReconnectAttempts(0)

        // Send ping to maintain connection
        ws.send(JSON.stringify({ type: "ping" }))
      }

      ws.onclose = (event) => {
        console.log("[realtime] WebSocket closed:", event.code, event.reason)
        setStatus("offline")

        // Attempt reconnection if not manually closed
        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
          setReconnectAttempts((prev) => prev + 1)
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`[realtime] Reconnecting... (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`)
            connect()
          }, reconnectDelay)
        }
      }

      ws.onerror = (error) => {
        console.error("[realtime] WebSocket error:", error)
        setStatus("error")
      }

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          console.log("[realtime] Received message:", msg)

          if (msg.type === "order_updated") {
            setLastMessage(`Order ${msg.orderId} updated to ${msg.status}`)
            // You can show a toast notification here
            console.log("[realtime] Order updated:", msg)
          } else if (msg.type === "pong") {
            // Handle ping/pong for connection health
            console.log("[realtime] Pong received")
          } else if (msg.type === "hello") {
            console.log("[realtime] Hello from server:", msg.userKey)
          }
        } catch (error) {
          console.error("[realtime] Failed to parse message:", error)
        }
      }
    } catch (error) {
      console.error("[realtime] Failed to create WebSocket:", error)
      setStatus("error")
    }
  }

  useEffect(() => {
    connect()

    // Cleanup function
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounting")
      }
    }
  }, [])

  const getStatusConfig = () => {
    switch (status) {
      case "online":
        return { color: "bg-green-500", text: "Live", pulse: false }
      case "connecting":
        return { color: "bg-yellow-500", text: "Connecting…", pulse: true }
      case "offline":
        return {
          color: "bg-red-500",
          text: reconnectAttempts > 0 ? `Reconnecting (${reconnectAttempts}/${maxReconnectAttempts})` : "Offline",
          pulse: reconnectAttempts > 0,
        }
      case "error":
        return { color: "bg-red-600", text: "Error", pulse: false }
      default:
        return { color: "bg-gray-500", text: "Unknown", pulse: false }
    }
  }

  const { color, text, pulse } = getStatusConfig()

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span
        className={`inline-block w-2 h-2 rounded-full ${color} ${pulse ? "animate-pulse" : ""}`}
        title={lastMessage || `WebSocket status: ${status}`}
      />
      <span className="select-none">{text}</span>
      {lastMessage && status === "online" && (
        <span className="text-xs opacity-75 max-w-32 truncate" title={lastMessage}>
          {lastMessage}
        </span>
      )}
    </div>
  )
}
