import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { telegramLinks, users } from "@/lib/db/schema"
import { eq, and, desc, like, or } from "drizzle-orm"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    // Verify webhook secret for admin access
    const webhookSecret = request.headers.get("x-webhook-secret")
    const expectedSecret = process.env.WEBHOOK_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET

    if (!expectedSecret || webhookSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50"), 100)
    const offset = Number.parseInt(searchParams.get("offset") || "0")
    const activeOnly = searchParams.get("active_only") === "true"

    const db = getDb()

    // Build query conditions
    const whereConditions: any[] = []

    if (activeOnly) {
      whereConditions.push(eq(telegramLinks.isRevoked, false))
    }

    if (search) {
      whereConditions.push(
        or(
          like(telegramLinks.telegramUsername, `%${search}%`),
          like(users.username, `%${search}%`),
          like(users.email, `%${search}%`),
        ),
      )
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined

    // Get linked users with their Telegram info
    const linkedUsers = await db
      .select({
        telegramUserId: telegramLinks.telegramUserId,
        telegramUsername: telegramLinks.telegramUsername,
        linkedVia: telegramLinks.linkedVia,
        isRevoked: telegramLinks.isRevoked,
        lastSeenAt: telegramLinks.lastSeenAt,
        createdAt: telegramLinks.createdAt,
        user: {
          id: users.id,
          username: users.username,
          email: users.email,
          createdAt: users.createdAt,
        },
      })
      .from(telegramLinks)
      .leftJoin(users, eq(telegramLinks.userId, users.id))
      .where(whereClause)
      .orderBy(desc(telegramLinks.lastSeenAt))
      .limit(limit)
      .offset(offset)

    return NextResponse.json({
      success: true,
      users: linkedUsers.map((link) => ({
        telegram_user_id: link.telegramUserId,
        telegram_username: link.telegramUsername,
        linked_via: link.linkedVia,
        is_active: !link.isRevoked,
        last_seen_at: link.lastSeenAt,
        linked_at: link.createdAt,
        website_user: link.user
          ? {
              id: link.user.id,
              username: link.user.username,
              email: link.user.email,
              created_at: link.user.createdAt,
            }
          : null,
      })),
      pagination: {
        limit,
        offset,
        search,
        active_only: activeOnly,
      },
    })
  } catch (error) {
    console.error("[v0] Bot users error:", error)
    return NextResponse.json({ error: "Failed to fetch bot users" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret for admin access
    const webhookSecret = request.headers.get("x-webhook-secret")
    const expectedSecret = process.env.WEBHOOK_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET

    if (!expectedSecret || webhookSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { telegramUserId, action } = await request.json()

    if (!telegramUserId || !action) {
      return NextResponse.json({ error: "Telegram user ID and action required" }, { status: 400 })
    }

    const db = getDb()

    switch (action) {
      case "revoke":
        await db
          .update(telegramLinks)
          .set({ isRevoked: true, updatedAt: new Date() })
          .where(eq(telegramLinks.telegramUserId, telegramUserId))
        break

      case "restore":
        await db
          .update(telegramLinks)
          .set({ isRevoked: false, updatedAt: new Date() })
          .where(eq(telegramLinks.telegramUserId, telegramUserId))
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    console.log(`[v0] Bot user ${telegramUserId} ${action}d successfully`)

    return NextResponse.json({
      success: true,
      message: `User ${action}d successfully`,
      telegram_user_id: telegramUserId,
      action,
    })
  } catch (error) {
    console.error("[v0] Bot user action error:", error)
    return NextResponse.json({ error: "Failed to perform user action" }, { status: 500 })
  }
}
