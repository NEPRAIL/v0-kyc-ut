import "server-only"
import { createHash, createHmac } from "node:crypto"

const sha256 = (x: string) => createHash("sha256").update(x).digest()

export function verifyTelegramAuth(initData: URLSearchParams, botToken: string) {
  const dataCheckString = Array.from(initData.entries())
    .filter(([k]) => k !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n")

  const secretKey = new Uint8Array(sha256(botToken))
  const hmac = createHmac("sha256", secretKey as unknown as import("crypto").BinaryLike).update(dataCheckString).digest("hex")
  const givenHash = initData.get("hash")
  return hmac === givenHash
}
