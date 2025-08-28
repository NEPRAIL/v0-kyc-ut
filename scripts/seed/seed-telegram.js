#!/usr/bin/env node
/*
 Seed Neon DB with:
  - a test user
  - a telegram_links row mapping telegram_user_id=99999 to that user
  - a sample order

 Uses the 'postgres' (Postgres.js) client which is already present in node_modules.
 Will read DATABASE_URL from process.env or fallback to parsing .env in repo root.
*/
const fs = require("fs")
const path = require("path")
const crypto = require("crypto")
const postgres = require("postgres")

function ensureEnv(name) {
  if (process.env[name]) return process.env[name]
  const envPath = path.join(process.cwd(), ".env")

  try {
    if (fs.existsSync(envPath)) {
      const stats = fs.statSync(envPath)
      if (!stats.isFile()) {
        console.warn(`.env exists but is not a regular file, skipping...`)
        return process.env[name]
      }

      const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/)
      for (const line of lines) {
        const s = line.trim()
        if (!s || s.startsWith("#") || !s.includes("=")) continue
        const [k, ...rest] = s.split("=")
        const v = rest.join("=").trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "")
        if (!(k in process.env)) process.env[k] = v
      }
    }
  } catch (error) {
    console.warn(`Could not read .env file: ${error.message}`)
  }

  return process.env[name]
}

async function main() {
  const DATABASE_URL = ensureEnv("DATABASE_URL")
  if (!DATABASE_URL) {
    console.error("DATABASE_URL not set")
    process.exit(1)
  }

  // Postgres.js connection; Neon requires TLS. If sslmode is set in URL, Neon enforces TLS.
  const sql = postgres(DATABASE_URL, { prepare: false, idle_timeout: 5 })

  // Generate stable values
  const username = "integration_test_user_" + Math.random().toString(36).slice(2, 8)
  const email = `${username}@example.com`
  const password_hash = "seeded-placeholder-hash"
  const tgid = 99999n // bigint
  const botToken = "mock_bot_token_123:ABC"
  const botTokenHash = crypto.createHash("sha256").update(botToken).digest("hex")
  const orderId = "ord-test-1"
  const items = [{ productId: "SKU-REDWIDGET", qty: 1, price_cents: 4999 }]

  console.log("Seeding Neon database...")
  try {
    // Create user
    const userRows = await sql`
      INSERT INTO users (username, email, password_hash, created_at)
      VALUES (${username}, ${email}, ${password_hash}, now())
      RETURNING id
    `
    const userId = userRows[0].id
    console.log("Inserted user id:", userId)

    // Upsert telegram link (in case rerun)
    await sql`
      INSERT INTO telegram_links (
        telegram_user_id, user_id, telegram_username, linked_via, is_revoked,
        bot_token_hash, bot_token_expires_at, last_seen_at, created_at, updated_at
      ) VALUES (
        ${tgid}, ${userId}, ${username}, 'code', false,
        ${botTokenHash}, now() + interval '7 days', now(), now(), now()
      )
      ON CONFLICT (telegram_user_id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        telegram_username = EXCLUDED.telegram_username,
        linked_via = EXCLUDED.linked_via,
        is_revoked = EXCLUDED.is_revoked,
        bot_token_hash = EXCLUDED.bot_token_hash,
        bot_token_expires_at = EXCLUDED.bot_token_expires_at,
        last_seen_at = EXCLUDED.last_seen_at,
        updated_at = now()
    `
    console.log("Upserted telegram_links for tg id 99999")

    // Upsert order for the user
    await sql`
      INSERT INTO orders (id, user_id, items, total_cents, currency, status, tg_deeplink, created_at)
      VALUES (${orderId}, ${userId}, ${sql.json(items)}, ${4999}, 'USD', 'pending', ${null}, now())
      ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, items = EXCLUDED.items, total_cents = EXCLUDED.total_cents, status = EXCLUDED.status
    `
    console.log("Upserted order id:", orderId)

    // Verify counts
    const tl =
      await sql`SELECT telegram_user_id, user_id, telegram_username FROM telegram_links WHERE telegram_user_id = ${tgid}`
    const ord = await sql`SELECT id, user_id, total_cents, status FROM orders WHERE id = ${orderId}`
    console.log("telegram_links:", tl)
    console.log("order:", ord)

    console.log("\nSeed complete.")
  } catch (err) {
    console.error("Seed failed:", err)
    process.exit(1)
  } finally {
    await sql.end({ timeout: 1 })
  }
}

main()
