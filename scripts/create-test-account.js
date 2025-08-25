const crypto = require("crypto")
const https = require("https")

async function createTestAccount() {
  try {
    console.log("[v0] Starting test account creation...")

    // Import Neon client dynamically
    const { neon } = await import("@neondatabase/serverless")
    const bcrypt = await import("bcryptjs")

    // Get database URL from environment
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable not found")
    }

    const sql = neon(databaseUrl)

    // Generate user data
    const userId = crypto.randomUUID()
    const username = "TEST"
    const email = "MAIL@t.com"
    const password = "12345678"

    console.log("[v0] Generated user ID:", userId)

    // Hash password using bcrypt (same as registration)
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(password, saltRounds)
    console.log("[v0] Password hashed successfully")

    // Delete existing test account if it exists
    console.log("[v0] Removing existing test account...")
    await sql`DELETE FROM users WHERE email = ${email} OR username = ${username}`

    // Create new test account
    console.log("[v0] Creating new test account...")
    const result = await sql`
      INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
      VALUES (${userId}, ${username}, ${email}, ${passwordHash}, NOW(), NOW())
      RETURNING id, username, email
    `

    console.log("[v0] Test account created successfully!")
    console.log("[v0] Account details:", result[0])
    console.log("[v0] Login credentials:")
    console.log("  Username/Email: TEST or MAIL@t.com")
    console.log("  Password: 12345678")
    console.log("[v0] You can now test login with these credentials!")
  } catch (error) {
    console.error("[v0] Error creating test account:", error.message)
    console.error("[v0] Full error:", error)
    process.exit(1)
  }
}

// Run the script
createTestAccount()
