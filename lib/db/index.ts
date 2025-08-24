import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"

import * as schema from "./schema"

let db: any = null

function createDatabase() {
  try {
    if (!process.env.DATABASE_URL) {
      console.error("[v0] DATABASE_URL environment variable is not set - database operations will fail")
      throw new Error("DATABASE_URL is required")
    }

    const sql = neon(process.env.DATABASE_URL)
    return drizzle(sql, { schema })
  } catch (error) {
    console.error("[v0] Database connection failed:", error)
    throw error
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
