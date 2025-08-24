import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"

import * as schema from "./schema"

let db: any = null
let connectionError: string | null = null

function createDatabase() {
  try {
    if (!process.env.DATABASE_URL) {
      const error = "DATABASE_URL environment variable is not set"
      console.error("[v0]", error)
      connectionError = error
      return null
    }

    console.log("[v0] Creating database connection...")
    const sql = neon(process.env.DATABASE_URL)
    const dbInstance = drizzle(sql, { schema })
    console.log("[v0] Database connection created successfully")
    connectionError = null
    return dbInstance
  } catch (error) {
    const errorMsg = `Database connection failed: ${error instanceof Error ? error.message : "Unknown error"}`
    console.error("[v0]", errorMsg)
    connectionError = errorMsg
    return null
  }
}

function getDb() {
  if (!db && !connectionError) {
    db = createDatabase()
  }

  if (connectionError) {
    throw new Error(connectionError)
  }

  if (!db) {
    throw new Error("Database connection could not be established")
  }

  return db
}

export { getDb, getDb as db }
export * from "./schema"
