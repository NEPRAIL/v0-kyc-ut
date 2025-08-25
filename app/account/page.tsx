export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { unstable_noStore as noStore } from "next/cache"
import { requireAuth } from "@/lib/auth-server"
import { loadUserSafe, loadTelegramLinkSafe, loadRecentOrdersSafe } from "@/lib/user"
import { LogoutButton, CopyButton, OpenTelegramButton } from "./ClientActions"
import Link from "next/link"

function currency(cents: number, code: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: code }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${code}`
  }
}

export default async function AccountPage() {
  noStore()

  const auth = await requireAuth()
  if (!auth.ok) {
    // redirect here would be fine too; simple message avoids throwing
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold">Please sign in</h1>
        <p className="mt-2">
          <Link href="/login" className="underline">
            Go to login
          </Link>
        </p>
      </main>
    )
  }

  const [me, tg, recent] = await Promise.all([
    loadUserSafe(auth.userId),
    loadTelegramLinkSafe(auth.userId),
    loadRecentOrdersSafe(auth.userId, 10),
  ])

  const botUsername = process.env.TELEGRAM_BOT_USERNAME || ""
  const tgDeepLink = botUsername ? `https://t.me/${botUsername}?start=hello_${auth.userId}` : ""

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Top card: profile & session */}
      <section className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600" />
            <div>
              <h1 className="text-xl font-semibold">
                {me?.username ?? "User"}
                {!me && <span className="text-sm text-zinc-400"> (profile row not found)</span>}
              </h1>
              <p className="text-sm text-zinc-400">{me?.email ?? "—"}</p>
            </div>
          </div>
          <LogoutButton />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="px-2 py-1 rounded-lg bg-zinc-800 text-zinc-200">Session ID: {auth.session?.uid}</span>
          <CopyButton text={String(auth.session?.uid ?? "")} label="Copy Session ID" />
          {me?.id && <CopyButton text={me.id} label="Copy User ID" />}
        </div>
      </section>

      {/* Grid: Security + Telegram + Orders */}
      <section className="grid md:grid-cols-3 gap-6">
        {/* Security */}
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-5">
          <h2 className="text-lg font-semibold mb-2">Security</h2>
          <ul className="text-sm text-zinc-300 space-y-2">
            <li>Cookie: httpOnly, SameSite=Lax, Secure in prod</li>
            <li>HMAC session with exp; invalid cookies = logged out</li>
            <li>Rotate SESSION_SECRET to invalidate all sessions</li>
          </ul>
          <div className="mt-4 text-sm text-zinc-400">
            Having trouble?{" "}
            <Link href="/logout" className="underline">
              Log out
            </Link>{" "}
            and back in.
          </div>
        </div>

        {/* Telegram */}
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-5">
          <h2 className="text-lg font-semibold mb-2">Telegram</h2>
          {tg ? (
            <div className="space-y-2 text-sm">
              <p className="text-zinc-300">
                Linked as <span className="font-medium">@{tg.telegramUsername ?? tg.telegramUserId}</span>
              </p>
              {tgDeepLink && <OpenTelegramButton deepLink={tgDeepLink} />}
              <p className="text-zinc-400">Orders will also be forwarded to your bot.</p>
              <div className="text-xs text-zinc-500 mt-2">You can unlink by contacting support (UI coming soon).</div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <p className="text-zinc-300">Not linked yet.</p>
              <Link
                href="/link-telegram"
                className="px-3 py-2 rounded-xl bg-sky-600 text-white hover:bg-sky-700 inline-block"
              >
                Link Telegram
              </Link>
              {tgDeepLink && (
                <p className="text-xs text-zinc-500">
                  Tip: you can also open{" "}
                  <a className="underline" href={tgDeepLink} target="_blank" rel="noreferrer">
                    the bot
                  </a>{" "}
                  and /start.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Orders summary */}
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-5">
          <h2 className="text-lg font-semibold mb-2">Orders</h2>
          <p className="text-sm text-zinc-400 mb-3">Latest {Math.min(recent.length, 10)} orders</p>
          <div className="space-y-2">
            {recent.length === 0 && <p className="text-sm text-zinc-500">No orders yet.</p>}
            {recent.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-4 rounded-xl bg-zinc-800/60 px-3 py-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{o.id}</div>
                  <div className="text-xs text-zinc-400">
                    {o.createdAt ? new Date(o.createdAt as any).toLocaleString() : "—"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm">{currency(o.totalCents, o.currency)}</div>
                  <div className="text-xs uppercase tracking-wide text-zinc-400">{o.status}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-zinc-500">For details, open your Telegram bot thread.</div>
        </div>
      </section>

      {/* Danger zone (soft) */}
      <section className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-5">
        <h2 className="text-lg font-semibold mb-2">Danger Zone</h2>
        <p className="text-sm text-zinc-400">
          Delete account UI will be added later. Contact support to request deletion.
        </p>
      </section>
    </main>
  )
}
