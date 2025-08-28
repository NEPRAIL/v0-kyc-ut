import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL)

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c == "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + "kycut_salt_2024") // Simple salt
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

async function createAdminUser() {
  try {
    // Generate admin user details
    const adminId = generateUUID()
    const adminEmail = "admin@kycut.com"
    const adminUsername = "KYCutADMIN"
    const adminPassword = "admin123!" // You should change this after first login

    const passwordHash = await hashPassword(adminPassword)

    console.log("[v0] Creating admin user...")
    console.log("[v0] Admin ID:", adminId)
    console.log("[v0] Admin Email:", adminEmail)
    console.log("[v0] Admin Username:", adminUsername)
    console.log("[v0] Admin Password:", adminPassword, "(CHANGE THIS AFTER FIRST LOGIN!)")

    console.log("[v0] Checking for existing admin accounts to remove...")
    const existingAdmins = await sql`
      SELECT id, email, username FROM users 
      WHERE email = ${adminEmail} OR username = 'admin' OR username = ${adminUsername}
    `

    if (existingAdmins.length > 0) {
      console.log("[v0] Found existing admin accounts, removing them...")
      for (const admin of existingAdmins) {
        console.log("[v0] Removing user:", admin.username, "(" + admin.email + ")")
        await sql`DELETE FROM users WHERE id = ${admin.id}`
      }
      console.log("[v0] ✅ Removed", existingAdmins.length, "existing admin account(s)")
    }

    // Create the admin user
    const result = await sql`
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
        ${adminId},
        ${adminEmail},
        ${adminUsername},
        ${passwordHash},
        true,
        NOW(),
        NOW(),
        0,
        false
      )
      RETURNING id, email, username, created_at
    `

    console.log("[v0] ✅ Admin user created successfully!")
    console.log("[v0] User Details:", result[0])
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
