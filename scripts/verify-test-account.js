const crypto = require("crypto")

async function verifyTestAccount() {
  try {
    console.log("[v0] Verifying test account and database structure...")

    // Debug environment variables
    console.log("[v0] Available environment variables:")
    console.log("  DATABASE_URL:", process.env.DATABASE_URL ? "✓ Found" : "✗ Missing")
    console.log("  POSTGRES_URL:", process.env.POSTGRES_URL ? "✓ Found" : "✗ Missing")
    console.log("  NEON_PROJECT_ID:", process.env.NEON_PROJECT_ID ? "✓ Found" : "✗ Missing")

    // Import Neon client dynamically
    const { neon } = await import("@neondatabase/serverless")

    // Try multiple environment variable names
    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL
    if (!databaseUrl) {
      console.error("[v0] No database URL found in environment variables")
      console.error(
        "[v0] Available env vars:",
        Object.keys(process.env).filter((key) => key.includes("DATABASE") || key.includes("POSTGRES")),
      )
      throw new Error("Database URL environment variable not found")
    }

    console.log("[v0] Using database URL:", databaseUrl.substring(0, 20) + "...")
    const sql = neon(databaseUrl)

    // Check database structure
    console.log("[v0] Checking users table structure...")
    const tableInfo = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `
    console.log("[v0] Users table columns:", tableInfo)

    // Check if test account exists
    console.log("[v0] Checking for test account...")
    const testUsers = await sql`
      SELECT id, username, email, password_hash, created_at 
      FROM users 
      WHERE email = 'MAIL@t.com' OR username = 'TEST'
    `

    if (testUsers.length === 0) {
      console.log("[v0] No test account found. Creating it now...")

      // Create test account
      const bcrypt = await import("bcryptjs")
      const userId = crypto.randomUUID()
      const username = "TEST"
      const email = "MAIL@t.com"
      const password = "12345678"

      const saltRounds = 12
      const passwordHash = await bcrypt.hash(password, saltRounds)

      const result = await sql`
        INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
        VALUES (${userId}, ${username}, ${email}, ${passwordHash}, NOW(), NOW())
        RETURNING id, username, email
      `

      console.log("[v0] Test account created:", result[0])
    } else {
      console.log(
        "[v0] Test account found:",
        testUsers.map((u) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          hasPassword: !!u.password_hash,
          passwordHashLength: u.password_hash?.length || 0,
          created: u.created_at,
        })),
      )
    }

    // Test password verification
    console.log("[v0] Testing password verification...")
    const user = await sql`SELECT * FROM users WHERE email = 'MAIL@t.com' LIMIT 1`
    if (user.length > 0) {
      const bcrypt = await import("bcryptjs")
      const isValid = await bcrypt.compare("12345678", user[0].password_hash)
      console.log("[v0] Password verification test:", isValid ? "PASS" : "FAIL")

      if (!isValid) {
        console.log("[v0] Password hash in DB:", user[0].password_hash.substring(0, 20) + "...")
        // Try to rehash and update
        const newHash = await bcrypt.hash("12345678", 12)
        await sql`UPDATE users SET password_hash = ${newHash} WHERE email = 'MAIL@t.com'`
        console.log("[v0] Updated password hash for test account")
      }
    }

    console.log("[v0] Verification complete!")
    console.log("[v0] Login credentials:")
    console.log("  Username: TEST")
    console.log("  Email: MAIL@t.com")
    console.log("  Password: 12345678")
  } catch (error) {
    console.error("[v0] Error verifying test account:", error.message)
    console.error("[v0] Full error:", error)
  }
}

// Run the script
verifyTestAccount()
