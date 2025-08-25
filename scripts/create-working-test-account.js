const bcrypt = require("bcryptjs")
const { neon } = require("@neondatabase/serverless")
const crypto = require("crypto")

async function createTestAccount() {
  console.log("[v0] Creating test account with correct UUID format...")

  const databaseUrl =
    process.env.DATABASE_URL ||
    "postgresql://neondb_owner:npg_x1jwcekNpil3@ep-late-voice-adcx1xl3-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
  const sql = neon(databaseUrl)

  try {
    // Generate UUID for user ID
    const userId = crypto.randomUUID()
    console.log("[v0] Generated user ID:", userId)

    // Hash password
    const password = "12345678"
    const passwordHash = await bcrypt.hash(password, 12)
    console.log("[v0] Password hashed successfully")

    // Delete existing test account if it exists
    await sql`DELETE FROM users WHERE username = 'TEST' OR email = 'MAIL@t.com'`
    console.log("[v0] Cleaned up existing test accounts")

    // Create test account with UUID
    const result = await sql`
      INSERT INTO users (id, username, email, password_hash, email_verified, created_at, updated_at)
      VALUES (${userId}, 'TEST', 'mail@t.com', ${passwordHash}, true, NOW(), NOW())
      RETURNING id, username, email
    `

    console.log("[v0] ✅ Test account created successfully:", result[0])

    // Verify password works
    const testUser = await sql`SELECT * FROM users WHERE username = 'TEST'`
    if (testUser.length > 0) {
      const isValid = await bcrypt.compare(password, testUser[0].password_hash)
      console.log("[v0] Password verification test:", isValid ? "✅ PASS" : "❌ FAIL")
    }

    console.log("[v0] 🎉 Test account ready!")
    console.log("[v0] Login credentials:")
    console.log("[v0]   Username: TEST")
    console.log("[v0]   Email: mail@t.com")
    console.log("[v0]   Password: 12345678")
  } catch (error) {
    console.error("[v0] ❌ Error creating test account:", error)
  }
}

createTestAccount()
