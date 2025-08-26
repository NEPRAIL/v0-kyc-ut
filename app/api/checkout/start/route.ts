import { NextResponse } from "next/server"
import { z } from "zod"
import { getDb } from "@/lib/db"
import { orders } from "@/lib/db/schema"
import { requireAuth } from "@/lib/auth-server"
import { randomBytes } from "node:crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const itemSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().positive().max(999),
  price_cents: z.number().int().nonnegative(), // from your catalog/pricing
  name: z.string().min(1),
})

const schema = z.object({
  items: z.array(itemSchema).min(1),
  currency: z.string().min(3).max(4).default("USD"),
})

export async function POST(req: Request) {
  try {
    const auth = await requireAuth()
    if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", code: "VALIDATION_ERROR", issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const { items, currency } = parsed.data
    const totalCents = items.reduce((s, it) => s + it.price_cents * it.qty, 0)

    const id = "ord_" + randomBytes(12).toString("hex")
    const site = process.env.SITE_URL?.replace(/\/+$/, "") || ""
    const botUser = process.env.TELEGRAM_BOT_USERNAME || ""
    const deepLink = botUser ? `https://t.me/${botUser}?start=order_${id}` : null

    const db = getDb()
    await db.insert(orders).values({
      id,
      userId: auth.userId,
      items: items as any,
      totalCents,
      currency,
      status: "pending",
      tgDeeplink: deepLink || null,
    })

    // If Telegram admin chat configured, log order there
    try {
      const token = process.env.TELEGRAM_BOT_TOKEN
      const adminChat = process.env.TELEGRAM_ADMIN_CHAT_ID
      if (token && adminChat) {
        const text =
          `🧾 New order *${id}*\n` +
          `User: ${auth.userId}\n` +
          `Total: ${(totalCents / 100).toFixed(2)} ${currency}\n` +
          `Items:\n` +
          items.map((i) => `• ${i.name} x${i.qty} — ${(i.price_cents / 100).toFixed(2)}`).join("\n") +
          (deepLink ? `\n\nOpen: ${deepLink}` : "")

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: adminChat, text, parse_mode: "Markdown" }),
        })
      }
    } catch (e) {
      console.error("[checkout] telegram log failed", e)
      // don't fail user on logging error
    }

    return NextResponse.json(
      { success: true, orderId: id, tgDeepLink: deepLink, totalCents, currency },
      { status: 201 },
    )
  } catch (e) {
    console.error("[checkout] error", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
