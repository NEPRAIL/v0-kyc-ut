import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// BTCPay integration has been removed. This endpoint is deprecated.
export async function POST() {
  return NextResponse.json({ error: "BTCPay integration removed" }, { status: 410 })
}
