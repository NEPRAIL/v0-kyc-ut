import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set")
}

export const sql = neon(process.env.DATABASE_URL)

// Database query helpers with error handling
export async function executeQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
  try {
    const result = await sql(query, params)
    return result as T[]
  } catch (error) {
    console.error("Database query error:", error)
    throw new Error("Database operation failed")
  }
}

export async function executeQuerySingle<T = any>(query: string, params: any[] = []): Promise<T | null> {
  const result = await executeQuery<T>(query, params)
  return result.length > 0 ? result[0] : null
}

// Transaction helper
export async function withTransaction<T>(
  callback: (sql: typeof import("@neondatabase/serverless").neon) => Promise<T>,
): Promise<T> {
  try {
    await sql("BEGIN")
    const result = await callback(sql)
    await sql("COMMIT")
    return result
  } catch (error) {
    await sql("ROLLBACK")
    throw error
  }
}
