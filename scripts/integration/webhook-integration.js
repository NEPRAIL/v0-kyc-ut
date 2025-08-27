import "dotenv/config"
import { neon } from "@neondatabase/serverless"
import { randomUUID } from "node:crypto"

const BASE_URL = process.env.WEBSITE_URL || "https://kycut.com"
const sql = neon(process.env.DATABASE_URL)

async function run() {
  console.log("[INTTEST] Starting webhook integration test...")

  if (!process.env.DATABASE_URL) {
    console.error("[INTTEST] DATABASE_URL is not set in environment")
    process.exit(1)
  }

  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error("[INTTEST] TELEGRAM_WEBHOOK_SECRET or WEBHOOK_SECRET is not set")
    process.exit(1)
  }

  // Prepare test data
  const testUserId = randomUUID()
  const testTgId = 999999999999n // large test Telegram ID
  const initialUsername = "inttest_old"
  const newUsername = "inttest_new"

  try {
    // Insert a minimal user required by telegram_links FK
    console.log(`[INTTEST] Inserting test user ${testUserId}`)
    await sql`
      INSERT INTO users (id, username, email, password_hash)
      VALUES (${testUserId}, ${`intuser_${testUserId.substring(0, 8)}`}, ${`${testUserId}@example.test`}, ${"testhash"})
      ON CONFLICT (id) DO NOTHING
    `

    // Insert telegram_links row referencing the user
    console.log(`[INTTEST] Inserting telegram_links row for TG ID ${testTgId}`)
    await sql`
      INSERT INTO telegram_links (telegram_user_id, user_id, telegram_username, linked_via, is_revoked, created_at, updated_at)
      VALUES (${testTgId}, ${testUserId}, ${initialUsername}, 'test', false, NOW(), NOW())
      ON CONFLICT (telegram_user_id) DO UPDATE SET telegram_username = EXCLUDED.telegram_username
    `

    // 1) Test update_username action
    console.log("[INTTEST] Posting update_username webhook")
    const res1 = await fetch(`${BASE_URL}/api/bot/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": webhookSecret,
      },
      body: JSON.stringify({ telegram_user_id: Number(testTgId), action: "update_username", data: { username: newUsername } }),
    })

    const body1 = await res1.json().catch(() => ({}))
    console.log("[INTTEST] Webhook response:", res1.status, body1)
    if (!res1.ok) throw new Error(`Webhook update_username returned ${res1.status}`)

    // Validate DB change
    const rowsAfterName = await sql`
      SELECT telegram_username FROM telegram_links WHERE telegram_user_id = ${testTgId}
    `
    const dbName = rowsAfterName?.[0]?.telegram_username
    if (dbName !== newUsername) throw new Error(`Expected telegram_username='${newUsername}', got '${dbName}'`)
    console.log("[INTTEST] update_username validated in DB")

    // 2) Test update_activity action (last_seen_at should be updated)
    console.log("[INTTEST] Posting update_activity webhook")
    // capture previous value
    const before = await sql`
      SELECT last_seen_at FROM telegram_links WHERE telegram_user_id = ${testTgId}
    `
    const beforeTs = before?.[0]?.last_seen_at

    const res2 = await fetch(`${BASE_URL}/api/bot/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": webhookSecret,
      },
      body: JSON.stringify({ telegram_user_id: Number(testTgId), action: "update_activity" }),
    })

    const body2 = await res2.json().catch(() => ({}))
    console.log("[INTTEST] Webhook response:", res2.status, body2)
    if (!res2.ok) throw new Error(`Webhook update_activity returned ${res2.status}`)

    const after = await sql`
      SELECT last_seen_at FROM telegram_links WHERE telegram_user_id = ${testTgId}
    `
    const afterTs = after?.[0]?.last_seen_at
    if (!afterTs) throw new Error("last_seen_at not present after update_activity")
    if (beforeTs && new Date(afterTs) <= new Date(beforeTs)) throw new Error("last_seen_at was not updated to a later timestamp")
    console.log("[INTTEST] update_activity validated in DB")

    // 3) Test log_command webhook (should return 200)
    console.log("[INTTEST] Posting log_command webhook")
    const resLog = await fetch(`${BASE_URL}/api/bot/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": webhookSecret,
      },
      body: JSON.stringify({ telegram_user_id: Number(testTgId), action: "log_command", data: { command: "/ping" } }),
    })
    if (!resLog.ok) throw new Error(`Webhook log_command returned ${resLog.status}`)
    console.log("[INTTEST] log_command webhook OK")

    // 4) Test update_username with missing data -> server returns 200 but should noop
    console.log("[INTTEST] Posting update_username with missing data (expect 200 and no change)")
    const resMissing = await fetch(`${BASE_URL}/api/bot/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": webhookSecret,
      },
      body: JSON.stringify({ telegram_user_id: Number(testTgId), action: "update_username" }),
    })
    if (resMissing.status !== 200) throw new Error(`Expected 200 for missing data (noop), got ${resMissing.status}`)
    // Validate username unchanged
    const nameAfterMissing = await sql`
      SELECT telegram_username FROM telegram_links WHERE telegram_user_id = ${testTgId}
    `
    const nameAfter = nameAfterMissing?.[0]?.telegram_username
    if (nameAfter !== newUsername) throw new Error(`Expected username to remain '${newUsername}', got '${nameAfter}'`)
    console.log("[INTTEST] update_username missing data returned 200 and username unchanged")

    // 5) Test invalid webhook secret -> should return 401
    console.log("[INTTEST] Posting webhook with invalid secret (expect 401)")
    const resInvalid = await fetch(`${BASE_URL}/api/bot/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": "invalid_secret",
      },
      body: JSON.stringify({ telegram_user_id: Number(testTgId), action: "update_activity" }),
    })
    if (resInvalid.status !== 401) throw new Error(`Expected 401 for invalid secret, got ${resInvalid.status}`)
    console.log("[INTTEST] invalid secret returned 401 as expected")

    // 6) Test /api/telegram/link flow by inserting a linking code and calling link endpoint using webhook secret
    console.log("[INTTEST] Inserting a linking code and calling /api/telegram/link")
    const linkCode = `INT${Math.random().toString(36).substring(2, 10).toUpperCase()}`
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
    await sql`
      INSERT INTO telegram_linking_codes (code, user_id, expires_at, created_at)
      VALUES (${linkCode}, ${testUserId}, ${expiresAt}, NOW())
      ON CONFLICT (code) DO UPDATE SET user_id = EXCLUDED.user_id, expires_at = EXCLUDED.expires_at
    `

    // Debug: read back the linking code row
    const codeRow = await sql`
      SELECT code, user_id, expires_at, used_at FROM telegram_linking_codes WHERE code = ${linkCode}
    `
    console.log("[INTTEST] linking code row:", codeRow[0])

    const resLink = await fetch(`${BASE_URL}/api/telegram/link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": webhookSecret,
      },
      body: JSON.stringify({ code: linkCode, telegramUserId: Number(testTgId), telegramUsername: "intlink_user" }),
    })

    const linkBody = await resLink.json().catch(() => ({}))
    console.log("[INTTEST] /api/telegram/link response:", resLink.status, linkBody)
    if (!resLink.ok) throw new Error(`/api/telegram/link returned ${resLink.status}`)
    if (!linkBody.botToken) throw new Error("/api/telegram/link did not return botToken")
    if (!linkBody.userId) throw new Error("/api/telegram/link did not return userId")

    // Verify telegram_links row exists
    const linkRow = await sql`
      SELECT telegram_user_id, user_id, bot_token_hash FROM telegram_links WHERE telegram_user_id = ${testTgId}
    `
    if (!linkRow || !linkRow[0]) throw new Error("telegram_links row not created by /api/telegram/link")
    if (!linkRow[0].bot_token_hash) throw new Error("bot_token_hash not set in telegram_links")
    console.log("[INTTEST] /api/telegram/link created telegram_links and bot token hash")

    console.log("[INTTEST] Integration test succeeded")
    process.exit(0)
  } catch (error) {
    console.error("[INTTEST] Integration test failed:", error)
    process.exit(1)
  } finally {
    // Cleanup: remove test rows
    try {
      console.log("[INTTEST] Cleaning up test data")
      await sql`DELETE FROM telegram_links WHERE telegram_user_id = ${testTgId}`
      await sql`DELETE FROM users WHERE id = ${testUserId}`
    } catch (e) {
      console.warn("[INTTEST] Cleanup warning:", e)
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run()
}
