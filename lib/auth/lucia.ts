import { Lucia } from "lucia"
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle"
import { getDb } from "../db"
import { users, sessions } from "../db/schema"
import { cookies } from "next/headers"
import { cache } from "react"

let lucia: Lucia | null = null

function createLucia() {
  try {
    console.log("[v0] Creating Lucia auth adapter...")
    const db = getDb()
    const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users)

    const luciaInstance = new Lucia(adapter, {
      sessionCookie: {
        expires: false,
        attributes: {
          secure: process.env.NODE_ENV === "production",
        },
      },
      getUserAttributes: (attributes) => {
        return {
          username: attributes.username,
          role: attributes.role,
          telegramUserId: attributes.telegramUserId,
          telegramUsername: attributes.telegramUsername,
        }
      },
    })

    console.log("[v0] Lucia auth adapter created successfully")
    return luciaInstance
  } catch (error) {
    const errorMsg = `Lucia adapter creation failed: ${error instanceof Error ? error.message : "Unknown error"}`
    console.error("[v0]", errorMsg)
    throw new Error(errorMsg)
  }
}

function getLucia() {
  if (!lucia) {
    lucia = createLucia()
  }
  return lucia
}

export { getLucia as lucia }

declare module "lucia" {
  interface Register {
    Lucia: typeof getLucia
    DatabaseUserAttributes: {
      username: string
      role: "user" | "admin"
      telegramUserId: string | null
      telegramUsername: string | null
    }
  }
}

export const validateRequest = cache(async (): Promise<{ user: any; session: any } | { user: null; session: null }> => {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(getLucia().sessionCookieName)?.value ?? null
  if (!sessionId) {
    return {
      user: null,
      session: null,
    }
  }

  const result = await getLucia().validateSession(sessionId)
  try {
    if (result.session && result.session.fresh) {
      const sessionCookie = getLucia().createSessionCookie(result.session.id)
      cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes)
    }
    if (!result.session) {
      const sessionCookie = getLucia().createBlankSessionCookie()
      cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes)
    }
  } catch {}
  return result
})
