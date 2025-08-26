import { requireAuthSoft } from "@/lib/auth-server"
import LinkTelegramCard from "@/components/LinkTelegramCard"
import RealtimeIndicator from "@/components/RealtimeIndicator"
import { db } from "@/lib/db"
import { orders } from "@/drizzle/schema"
import { eq } from "drizzle-orm"

export default async function AccountPage() {
  const r = await requireAuthSoft()
  if (!r) {
    // soft redirect
    return (
      <div className="max-w-xl mx-auto pt-10">
        <h1 className="text-2xl font-semibold">Sign in required</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please sign in to view your account.</p>
      </div>
    )
  }
  const { user } = r
  const myOrders = await db.select().from(orders).where(eq(orders.userId, user.id))

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Account</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {user.username} ({user.email})
          </p>
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
  )
}
