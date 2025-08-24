import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"

export function getDb() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL not set")
  return drizzle(neon(url))
}

export const db = getDb()
