"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  return (
    <button
      onClick={async () => {
        if (loading) return
        setLoading(true)
        await fetch("/api/auth/logout", { method: "POST" })
        router.refresh()
        router.push("/login")
      }}
      className="px-3 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
      disabled={loading}
    >
      {loading ? "Logging out…" : "Log out"}
    </button>
  )
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text)}
      className="px-3 py-2 rounded-xl bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
    >
      {label}
    </button>
  )
}

export function OpenTelegramButton({ deepLink }: { deepLink: string }) {
  return (
    <a
      href={deepLink}
      target="_blank"
      rel="noopener noreferrer"
      className="px-3 py-2 rounded-xl bg-sky-600 text-white hover:bg-sky-700 inline-flex items-center gap-2"
    >
      Open in Telegram
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h6m0 0v6m0-6L10 20" />
      </svg>
    </a>
  )
}
