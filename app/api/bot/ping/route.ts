import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Bot ping API called")

    // Check if the request has the webhook secret
    const webhookSecret = request.headers.get("x-webhook-secret")
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET || "kycut_webhook_2024_secure_key_789xyz"

    if (webhookSecret !== expectedSecret) {
      console.log("[v0] Ping failed - invalid webhook secret")
      return NextResponse.json(
        {
          success: false,
          message: "Invalid webhook secret",
        },
        { status: 401 },
      )
    }

    console.log("[v0] Bot ping successful")

    return NextResponse.json({
      success: true,
      message: "Bot connection successful",
      timestamp: new Date().toISOString(),
      server: "KYCut API",
      version: "1.0.0",
      status: "online",
    })
  } catch (error) {
    console.error("[v0] Bot ping error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Server error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Bot ping POST called")

    const body = await request.json()
    console.log("[v0] Ping data:", body)

    return NextResponse.json({
      success: true,
      message: "Ping received",
      echo: body,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Bot ping POST error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Server error",
      },
      { status: 500 },
    )
  }
}
