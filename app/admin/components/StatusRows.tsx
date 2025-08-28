"use client"

import { useEffect, useState } from "react"

export function StatusRows() {
  const [health, setHealth] = useState<any>(null)
  const [bot, setBot] = useState<any>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const [h, b] = await Promise.all([
          fetch(`/api/health`, { cache: "no-store" })
            .then((r) => r.json())
            .catch(() => null),
          fetch(`/api/bot/status`, {
            headers: {
              "x-admin-request": "true",
            },
            cache: "no-store",
          })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ])
        if (!cancelled) {
          setHealth(h)
          setBot(b)
        }
      } catch {}
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  const dbOk = !!health?.checks?.database
  const tgOk = !!bot?.bot?.connected
  const envOk = !!health?.checks?.environment

  const Row = ({ name, ok, note }: { name: string; ok: boolean; note?: string }) => (
    <div className="flex items-center justify-between">
      <span>{name}</span>
      <span className={ok ? "text-green-500" : "text-red-500"}>{ok ? "Connected" : "Not Connected"}</span>
      {note ? <span className="ml-2 text-muted-foreground">{note}</span> : null}
    </div>
  )

  return (
    <div className="space-y-2">
      <Row name="Database" ok={dbOk} />
      <Row name="Telegram Bot" ok={tgOk} note={bot?.bot?.username ? `@${bot.bot.username}` : undefined} />
      <Row name="Environment" ok={envOk} />
    </div>
  )
}
