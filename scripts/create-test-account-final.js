const bcrypt = require("bcryptjs")
const { neon } = require("@neondatabase/serverless")

async function createTestAccount() {
  console.log("[v0] Creating test account with correct UUID types...")

  const connectionString =
    "postgresql://neondb_owner:npg_x1jwcekNpil3@ep-late-voice-adcx1xl3-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
  const sql = neon(connectionString)

  try {
    // Delete existing test account
    await sql`DELETE FROM users WHERE email = 'mail@t.com' OR username = 'TEST'`
    console.log("[v0] Cleaned up existing test accounts")

    // Create test account with proper UUID
    const passwordHash = await bcrypt.hash("12345678", 12)
    console.log("[v0] Generated password hash:", passwordHash.substring(0, 20) + "...")

    const result = await sql`
      INSERT INTO users (
        id, username, email, password_hash, email_verified, 
        failed_login_attempts, two_factor_enabled, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), 'TEST', 'mail@t.com', ${passwordHash}, true,
        0, false, NOW(), NOW()
      ) RETURNING id, username, email
    `

    console.log("[v0] ✅ Test account created successfully:", result[0])

    // Verify password hash works
    const isValid = await bcrypt.compare("12345678", passwordHash)
    console.log("[v0] Password verification test:", isValid ? "✅ PASS" : "❌ FAIL")

    // Test database lookup
    const user = await sql`SELECT id, username, email, password_hash FROM users WHERE email = 'mail@t.com'`
    console.log("[v0] Database lookup test:", user.length > 0 ? "✅ FOUND" : "❌ NOT FOUND")

    if (user.length > 0) {
      const dbPasswordValid = await bcrypt.compare("12345678", user[0].password_hash)
      console.log("[v0] Database password test:", dbPasswordValid ? "✅ VALID" : "❌ INVALID")
    }

    console.log("[v0] 🎉 Test account ready for login!")
    console.log("[v0] Credentials: username=TEST, email=mail@t.com, password=12345678")
  } catch (error) {
    console.error("[v0] ❌ Error creating test account:", error)
  }
}

createTestAccount()
