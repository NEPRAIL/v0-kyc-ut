const bcrypt = require("bcryptjs")
;(async () => {
  const pwd = process.argv[2] || "12345678" // Default to test password

  console.log(`[v0] Hashing password: "${pwd}"`)
  const hash = await bcrypt.hash(pwd, 12)
  console.log(`[v0] Generated hash: ${hash}`)

  const isValid = await bcrypt.compare(pwd, hash)
  console.log(`[v0] Hash verification: ${isValid ? "SUCCESS" : "FAILED"}`)
})()
