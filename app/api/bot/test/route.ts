import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  const adminId = process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_ADMIN_ID

    if (!botToken || !webhookSecret || !adminId) {
      return NextResponse.json(
        {
          connected: false,
          error: "Missing bot configuration",
          missing: {
            botToken: !botToken,
            webhookSecret: !webhookSecret,
            adminId: !adminId,
          },
        },
        { status: 400 },
      )
    }

    // Test bot API connection
    const botResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
    const botData = await botResponse.json()

    if (!botData.ok) {
      return NextResponse.json(
        {
          connected: false,
          error: "Bot token invalid",
          botError: botData.description,
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      connected: true,
      bot: {
        username: botData.result.username,
        firstName: botData.result.first_name,
        id: botData.result.id,
      },
      config: {
  adminId,
        webhookSecret: webhookSecret.substring(0, 8) + "...",
      },
    })
  } catch (error) {
    console.error("[v0] Bot test error:", error)
    return NextResponse.json(
      {
        connected: false,
        error: "Connection failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
