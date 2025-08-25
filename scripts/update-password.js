// scripts/update-password.js
// Usage examples:
//   node scripts/update-password.js --username=TEST --password=StrongPass123
//   node scripts/update-password.js --email=usr@mail.com --hash=$2b$12$....
// Requires: DATABASE_URL env. Uses bcryptjs and pg.

const { Client } = require("pg")
const bcrypt = require("bcryptjs")

function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((p) => {
      const [k, ...rest] = p.replace(/^--/, "").split("=")
      return [k, rest.join("=") || ""]
    }),
  )
  return args
}

async function main() {
  const { username, email, password, hash } = parseArgs()
  if (!username && !email) {
    console.error("[update-password] Provide --username or --email")
    process.exit(1)
  }
  if (!password && !hash) {
    console.error("[update-password] Provide --password or --hash")
    process.exit(1)
  }
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error("[update-password] DATABASE_URL is not set")
    process.exit(1)
  }

  let finalHash = hash || null
  if (password) {
    if (password.length < 8) {
      console.error("[update-password] Password must be at least 8 characters")
      process.exit(1)
    }
    finalHash = await bcrypt.hash(password, 12)
  }
  if (typeof finalHash !== "string" || !finalHash.startsWith("$2")) {
    console.error("[update-password] Provided hash is not a bcrypt hash ($2...)")
    process.exit(1)
  }

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await client.connect()

  try {
    const identSql = username
      ? { where: "username = $2", val: username }
      : { where: "lower(email) = lower($2)", val: email }

    const q = `
      UPDATE public.users
      SET password_hash = $1, updated_at = now()
      WHERE ${identSql.where}
      RETURNING id, username, email;
    `
    const { rows } = await client.query(q, [finalHash, identSql.val])
    if (!rows.length) {
      console.error("[update-password] No matching user found")
      process.exit(2)
    }
    const u = rows[0]
    console.log("[update-password] SUCCESS →", { id: u.id, username: u.username, email: u.email })
  } catch (e) {
    console.error("[update-password] ERROR", e)
    process.exit(3)
  } finally {
    await client.end()
  }
}

main()
