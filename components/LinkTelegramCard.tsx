"use client"

import { useState } from "react"

export default function LinkTelegramCard() {
  const [code, setCode] = useState<string | null>(null)
  const [expires, setExpires] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function gen() {
    setLoading(true)
    const res = await fetch("/api/telegram/link-code", { method: "POST" })
    const data = await res.json()
    setLoading(false)
    if (data?.success) {
      setCode(data.code)
      setExpires(data.expiresAt)
    } else {
      alert(data?.error || "Failed to generate code")
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
            <button className="text-xs underline" onClick={() => navigator.clipboard.writeText(code)}>
              Copy
            </button>
          </div>
          {expires && (
            <div className="mt-2 text-xs text-muted-foreground">Expires: {new Date(expires).toLocaleTimeString()}</div>
          )}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Generate a code, then in Telegram use <code>/link YOUR_CODE</code>.
        </p>
      )}
    </div>
  )
}
