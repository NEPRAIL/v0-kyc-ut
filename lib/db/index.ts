import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"

import * as schema from "./schema"

let db: any = null

function createDatabase() {
  try {
    if (!process.env.DATABASE_URL) {
      console.warn("[v0] DATABASE_URL environment variable is not set")
      return null
    }

    const sql = neon(process.env.DATABASE_URL)
    return drizzle(sql, { schema })
  } catch (error) {
    console.error("[v0] Database connection failed:", error)
    return null
  }
}

function getDb() {
  if (!db) {
    db = createDatabase()
  }
  return db
}

export { getDb as db }
export * from "./schema"
