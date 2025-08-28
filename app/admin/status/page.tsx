export const dynamic = "force-dynamic"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AdminStatusPage() {
  let health: any = null
  let bot: any = null
  try {
    const [healthRes, botRes] = await Promise.all([
      fetch(`/api/health`, { cache: "no-store" }),
      fetch(`/api/bot/status`, {
        headers: { "x-webhook-secret": process.env.WEBHOOK_SECRET || "" },
        cache: "no-store",
      }),
    ])
    health = await healthRes.json().catch(() => null)
    bot = botRes.ok ? await botRes.json().catch(() => null) : null
  } catch {}

  const rows = [
    { name: "Database", ok: !!health?.checks?.database },
    { name: "Telegram Bot", ok: !!bot?.bot?.connected, note: bot?.bot?.username ? `@${bot.bot.username}` : undefined },
    { name: "Environment", ok: !!health?.checks?.environment },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Status</h1>
        <p className="text-muted-foreground">Live status of critical integrations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((r) => (
            <div key={r.name} className="flex items-center justify-between">
              <span className="text-sm">{r.name}</span>
              <div className="flex items-center gap-2">
                {r.note ? <span className="text-xs text-muted-foreground">{r.note}</span> : null}
                <span className={`text-sm ${r.ok ? "text-green-500" : "text-red-500"}`}>
                  {r.ok ? "Connected" : "Not Connected"}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
