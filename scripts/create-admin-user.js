const bcrypt = require("bcryptjs")
const { Client } = require("pg")

async function createAdminUser() {
  console.log("[v0] Creating admin user...")

  const client = new Client({
    connectionString:
      "postgresql://neondb_owner:npg_x1jwcekNpil3@ep-late-voice-adcx1xl3-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require",
  })

  try {
    await client.connect()
    console.log("[v0] Connected to database")

    const adminId = require("crypto").randomUUID()
    const adminEmail = "admin@kycut.com"
    const adminUsername = "KYCutADMIN"
    const adminPassword = "admin123!" // You should change this after first login

    console.log("[v0] Admin ID:", adminId)
    console.log("[v0] Admin Email:", adminEmail)
    console.log("[v0] Admin Username:", adminUsername)
    console.log("[v0] Admin Password:", adminPassword, "(CHANGE THIS AFTER FIRST LOGIN!)")

    console.log("[v0] Checking for existing admin accounts to remove...")
    const existingAdmins = await client.query(
      "SELECT id, email, username FROM users WHERE email = $1 OR username = 'admin' OR username = $2",
      [adminEmail, adminUsername],
    )

    if (existingAdmins.rows.length > 0) {
      console.log("[v0] Found existing admin accounts, removing them...")
      for (const admin of existingAdmins.rows) {
        console.log("[v0] Removing user:", admin.username, "(" + admin.email + ")")
        await client.query("DELETE FROM users WHERE id = $1", [admin.id])
      }
      console.log("[v0] ✅ Removed", existingAdmins.rows.length, "existing admin account(s)")
    }

    console.log("[v0] Hashing password with bcrypt...")
    const passwordHash = await bcrypt.hash(adminPassword, 12)
    console.log("[v0] Password hash created (bcrypt format):", passwordHash.substring(0, 10) + "...")

    // Create the admin user
    const result = await client.query(
      `
      INSERT INTO users (
        id,
        email,
        username,
        password_hash,
        email_verified,
        created_at,
        updated_at,
        failed_login_attempts,
        two_factor_enabled
      ) VALUES (
        $1, $2, $3, $4, $5, NOW(), NOW(), 0, false
      )
      RETURNING id, email, username, created_at
    `,
      [adminId, adminEmail, adminUsername, passwordHash, true],
    )

    console.log("[v0] Verifying password hash...")
    const isValid = await bcrypt.compare(adminPassword, passwordHash)
    console.log("[v0] Password hash verification:", isValid)

    console.log("[v0] ✅ Admin user created successfully!")
    console.log("[v0] User Details:", result.rows[0])
    console.log("[v0] ")
    console.log("[v0] 🔑 IMPORTANT: Add this to your environment variables:")
    console.log("[v0] ADMIN_USER_ID=" + adminId)
    console.log("[v0] ")
    console.log("[v0] 🔐 Login credentials:")
    console.log("[v0] Email: " + adminEmail)
    console.log("[v0] Username: " + adminUsername)
    console.log("[v0] Password: " + adminPassword)
    console.log("[v0] ")
    console.log("[v0] ⚠️  SECURITY: Change the password after first login!")

    return adminId
  } catch (error) {
    console.error("[v0] Error creating admin user:", error)
    throw error
  } finally {
    await client.end()
  }
}

// Run the function
createAdminUser()
  .then((adminId) => {
    console.log("[v0] Script completed. Admin User ID:", adminId)
  })
  .catch((error) => {
    console.error("[v0] Script failed:", error)
  })
