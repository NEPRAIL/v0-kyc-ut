import { Lucia } from "lucia"
import { DrizzleSQLiteAdapter } from "@lucia-auth/adapter-drizzle"
import { db } from "../db"
import { users } from "../db/schema"
import { cookies } from "next/headers"
import { cache } from "react"

const adapter = new DrizzleSQLiteAdapter(db, {
  user: users,
  session: {
    id: "id",
    userId: "user_id",
    expiresAt: "expires_at",
  },
})

export const lucia = new Lucia(adapter, {
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
      totpSecret: attributes.totpSecret,
    }
  },
})

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia
    DatabaseUserAttributes: {
      username: string
      role: "user" | "admin"
      totpSecret: string | null
    }
  }
}

export const validateRequest = cache(async (): Promise<{ user: any; session: any } | { user: null; session: null }> => {
  const sessionId = cookies().get(lucia.sessionCookieName)?.value ?? null
  if (!sessionId) {
    return {
      user: null,
      session: null,
    }
  }

  const result = await lucia.validateSession(sessionId)
  try {
    if (result.session && result.session.fresh) {
      const sessionCookie = lucia.createSessionCookie(result.session.id)
      cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes)
    }
    if (!result.session) {
      const sessionCookie = lucia.createBlankSessionCookie()
      cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes)
    }
  } catch {}
  return result
})
