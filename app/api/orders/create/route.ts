import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/middleware"
import { bitcoinAddressManager } from "@/lib/bitcoin/address-manager"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth(request)
    const { items }: { items: CartItem[] } = await request.json()

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
    }

    // Calculate total amount
    const totalUSD = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    // Convert USD to satoshis
    const totalSatoshis = await bitcoinAddressManager.usdToSatoshis(totalUSD)

    // Create order for each item (KYC accounts are typically individual purchases)
    const orders = []

    for (const item of items) {
      const itemTotalUSD = item.price * item.quantity
      const itemSatoshis = await bitcoinAddressManager.usdToSatoshis(itemTotalUSD)

      // Create order record
      const orderResult = await sql`
        INSERT INTO orders (user_id, product_id, product_name, amount_usd, amount_btc, expires_at)
        VALUES (${user.id}, ${item.id}, ${item.name}, ${itemTotalUSD}, ${itemSatoshis}, ${new Date(Date.now() + 30 * 60 * 1000)})
        RETURNING *
      `

      const order = orderResult[0]

      // Generate Bitcoin address for this order
      const bitcoinAddress = await bitcoinAddressManager.generateAddressForOrder(order.id, itemSatoshis)

      // Update order with Bitcoin address
      await sql`
        UPDATE orders 
        SET bitcoin_address_id = ${bitcoinAddress.id}
        WHERE id = ${order.id}
      `

      orders.push({
        ...order,
        bitcoin_address: bitcoinAddress.address,
        bitcoin_amount: itemSatoshis,
      })
    }

    return NextResponse.json({
      success: true,
      orders,
      message: "Orders created successfully",
    })
  } catch (error) {
    console.error("Order creation error:", error)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}
