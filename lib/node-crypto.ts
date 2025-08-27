"use server"
import { createHmac, randomBytes } from "node:crypto"

export async function hmacSHA256(secret: string, input: string) {
  return createHmac("sha256", secret).update(input).digest("hex")
}

export async function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("hex")
}
