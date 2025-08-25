import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { orders } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const url = new URL(req.url)
    const secret = url.searchParams.get("secret")
    if (!secret || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) return NextResponse.json({ ok: true }) // silently ignore

    const send = (payload: any) =>
      fetch(`https://api.telegram.org/bot${token}/${payload.method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.body),
      })

    const message = body.message || body.edited_message
    if (!message) return NextResponse.json({ ok: true })

    const chatId = message.chat.id
    const text: string = message.text || ""

    if (text.startsWith("/start")) {
      const [, param] = text.split(" ")
      if (param && param.startsWith("order_")) {
        const orderId = param.slice("order_".length)

        const db = getDb()
        const ord = (await db.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0]

        if (!ord) {
          await send({ method: "sendMessage", body: { chat_id: chatId, text: "Order not found." } })
          return NextResponse.json({ ok: true })
        }

        // Show minimal order summary
        const sum = (ord.totalCents / 100).toFixed(2) + " " + ord.currency
        await send({
          method: "sendMessage",
          body: {
            chat_id: chatId,
            text: `Order ${orderId}\nTotal: ${sum}\nStatus: ${ord.status}\n\n(Use /pay ${orderId} to proceed)`,
          },
        })
      }
    } else if (text.startsWith("/pay")) {
      // Stub: Here you could call sendInvoice, open a payment URL, etc.
      const [, orderId] = text.split(" ")
      await send({
        method: "sendMessage",
        body: { chat_id: chatId, text: `Payment flow coming soon for ${orderId}.` },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[telegram webhook] error", e)
    return NextResponse.json({ ok: true })
  }
}
