import crypto from "crypto"

const sha256 = (x: Buffer | string) => crypto.createHash("sha256").update(x).digest()

export function verifyTelegramAuth(initData: URLSearchParams, botToken: string) {
  const dataCheckString = Array.from(initData.entries())
    .filter(([k]) => k !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n")

  const secretKey = sha256(botToken)
  const hmac = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex")
  const givenHash = initData.get("hash")
  return hmac === givenHash
}
