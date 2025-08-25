const path = require("path")
const dotenv = require("dotenv")

// Load .env file with explicit path
const envPath = path.resolve(__dirname, "..", ".env")
console.log("[v0] Loading .env from:", envPath)
const result = dotenv.config({ path: envPath, debug: true })

if (result.error) {
  console.log("[v0] Dotenv error:", result.error.message)
  // Fallback: try loading from current directory
  dotenv.config({ debug: true })
}

console.log(
  "[v0] Available env vars:",
  Object.keys(process.env).filter(
    (key) => key.includes("DATABASE") || key.includes("POSTGRES") || key.includes("SESSION"),
  ),
)

const { neon } = require("@neondatabase/serverless")
const bcrypt = require("bcryptjs")
const crypto = require("crypto")

async function verifyDatabase() {
  console.log("[v0] Starting database verification...")

  const databaseUrl =
    "postgresql://neondb_owner:npg_x1jwcekNpil3@ep-late-voice-adcx1xl3-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

  console.log("[v0] Using direct database connection...")
  console.log("[v0] Using URL starting with:", databaseUrl.substring(0, 30) + "...")

  try {
    const sql = neon(databaseUrl)

    console.log("[v0] Testing database connection...")
    const connectionTest = await sql`SELECT 1 as test`
    console.log("[v0] ✅ Database connection successful")

    // Check if users table exists
    console.log("[v0] Checking if users table exists...")
    const tableCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `

    if (tableCheck.length === 0) {
      console.log("[v0] ❌ Users table does not exist!")
      return
    }

    console.log("[v0] ✅ Users table exists")

    // Check table structure
    console.log("[v0] Checking users table structure...")
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY ordinal_position
    `

    console.log("[v0] Users table columns:", columns)

    // Count total users
    const userCount = await sql`SELECT COUNT(*) as count FROM users`
    console.log(`[v0] Total users in database: ${userCount[0].count}`)

    // Look for test account by email
    console.log("[v0] Looking for test account by email...")
    const userByEmail = await sql`
      SELECT id, username, email, password_hash, created_at 
      FROM users 
      WHERE LOWER(email) = LOWER(${"MAIL@t.com"})
    `

    if (userByEmail.length > 0) {
      const user = userByEmail[0]
      console.log("[v0] ✅ Found test user by email:", {
        id: user.id,
        username: user.username,
        email: user.email,
        hasPasswordHash: !!user.password_hash,
        passwordHashLength: user.password_hash?.length,
        createdAt: user.created_at,
      })

      // Test password verification
      console.log("[v0] Testing password verification...")
      const testPassword = "12345678"
      const isValid = await bcrypt.compare(testPassword, user.password_hash)
      console.log(`[v0] Password verification result: ${isValid ? "✅ VALID" : "❌ INVALID"}`)

      if (!isValid) {
        console.log("[v0] Password hash in database:", user.password_hash)
        console.log("[v0] Generating new hash for comparison...")
        const newHash = await bcrypt.hash(testPassword, 12)
        console.log("[v0] New hash:", newHash)
        const newHashValid = await bcrypt.compare(testPassword, newHash)
        console.log(`[v0] New hash verification: ${newHashValid ? "✅ VALID" : "❌ INVALID"}`)
      }
    } else {
      console.log("[v0] ❌ No test user found by email")
    }

    // Look for test account by username
    console.log("[v0] Looking for test account by username...")
    const userByUsername = await sql`
      SELECT id, username, email, password_hash, created_at 
      FROM users 
      WHERE LOWER(username) = LOWER(${"TEST"})
    `

    if (userByUsername.length > 0) {
      const user = userByUsername[0]
      console.log("[v0] ✅ Found test user by username:", {
        id: user.id,
        username: user.username,
        email: user.email,
        hasPasswordHash: !!user.password_hash,
        passwordHashLength: user.password_hash?.length,
        createdAt: user.created_at,
      })
    } else {
      console.log("[v0] ❌ No test user found by username")
    }

    // Show all users (limited info for security)
    console.log("[v0] All users in database:")
    const allUsers = await sql`
      SELECT id, username, email, created_at 
      FROM users 
      ORDER BY created_at DESC
    `

    allUsers.forEach((user, index) => {
      console.log(`[v0] User ${index + 1}:`, {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.created_at,
      })
    })

    // If no test user exists, create one
    if (userByEmail.length === 0 && userByUsername.length === 0) {
      console.log("[v0] Creating test user...")
      const testPassword = "12345678"
      const passwordHash = await bcrypt.hash(testPassword, 12)

      const userId = crypto.randomUUID()

      await sql`
        INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
        VALUES (${userId}, ${"TEST"}, ${"MAIL@t.com"}, ${passwordHash}, NOW(), NOW())
      `

      console.log("[v0] ✅ Test user created successfully")
      console.log("[v0] Test credentials: username=TEST, email=MAIL@t.com, password=12345678")

      console.log("[v0] Verifying newly created user...")
      const newUser = await sql`
        SELECT id, username, email, password_hash 
        FROM users 
        WHERE id = ${userId}
      `

      if (newUser.length > 0) {
        const testValid = await bcrypt.compare(testPassword, newUser[0].password_hash)
        console.log(`[v0] New user password verification: ${testValid ? "✅ VALID" : "❌ INVALID"}`)
      }
    }
  } catch (error) {
    console.error("[v0] Database verification error:", error)
    console.error("[v0] Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack?.split("\n").slice(0, 3),
    })
  }
}

verifyDatabase().catch(console.error)
