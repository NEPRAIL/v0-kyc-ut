import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    // This endpoint provides public bot information (no auth required)
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const hasWebhookSecret = !!process.env.WEBHOOK_SECRET
    const hasAdminId = !!process.env.TELEGRAM_ADMIN_ID

    let botInfo = null
    if (botToken) {
      try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
        const data = await response.json()
        if (data.ok) {
          botInfo = {
            username: data.result.username,
            first_name: data.result.first_name,
            id: data.result.id,
            can_join_groups: data.result.can_join_groups,
            can_read_all_group_messages: data.result.can_read_all_group_messages,
            supports_inline_queries: data.result.supports_inline_queries,
          }
        }
      } catch (error) {
        console.error("[v0] Failed to fetch bot info:", error)
      }
    }

    return NextResponse.json({
      success: true,
      bot: botInfo,
      configuration: {
        has_bot_token: !!botToken,
        has_webhook_secret: hasWebhookSecret,
        has_admin_configured: hasAdminId,
        api_version: "1.0.0",
        features: ["account_linking", "order_management", "status_updates", "notifications", "user_management"],
      },
      endpoints: {
        ping: "/api/bot/ping",
        test: "/api/bot/test",
        status: "/api/bot/status",
        users: "/api/bot/users",
        webhook: "/api/bot/webhook",
        notifications: "/api/bot/notifications",
        telegram_link: "/api/telegram/link",
        telegram_verify: "/api/telegram/verify-code",
        orders: "/api/orders/telegram",
        order_status: "/api/orders/[id]/status",
      },
    })
  } catch (error) {
    console.error("[v0] Bot info error:", error)
    return NextResponse.json({ error: "Failed to get bot information" }, { status: 500 })
  }
}
