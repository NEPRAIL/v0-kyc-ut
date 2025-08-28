"use server"

import { createHmac, createHash, randomBytes } from "node:crypto"

// This file contains the corrected version of the async crypto functions that were causing MIME type errors

export async function generateSessionToken(): Promise<string> {
  const token = randomBytes(32).toString("hex")
  return token
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  return createHash("sha256")
    .update(password + salt)
    .digest("hex")
}

export async function createSignature(data: string, secret: string): Promise<string> {
  return createHmac("sha256", secret).update(data).digest("hex")
}

export async function verifySignature(data: string, signature: string, secret: string): Promise<boolean> {
  const expectedSignature = await createSignature(data, secret)
  return signature === expectedSignature
}

export async function generateSalt(): Promise<string> {
  return randomBytes(16).toString("hex")
}

export async function createOrderSignature(orderId: string, amount: number, secret: string): Promise<string> {
  const data = `${orderId}:${amount}`
  return createSignature(data, secret)
}

export async function verifyOrderSignature(
  orderId: string,
  amount: number,
  signature: string,
  secret: string,
): Promise<boolean> {
  return verifySignature(`${orderId}:${amount}`, signature, secret)
}

export async function createTelegramHash(data: Record<string, string>, botToken: string): Promise<string> {
  const secret = createHash("sha256").update(botToken).digest()
  const checkString = Object.keys(data)
    .filter((key) => key !== "hash")
    .sort()
    .map((key) => `${key}=${data[key]}`)
    .join("\n")

  return createHmac("sha256", secret).update(checkString).digest("hex")
}

export async function verifyTelegramData(data: Record<string, string>, botToken: string): Promise<boolean> {
  const { hash, ...authData } = data
  if (!hash) return false

  const expectedHash = await createTelegramHash(authData, botToken)
  return hash === expectedHash
}
