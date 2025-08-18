import { getUserById } from "@/lib/db/simple"
import { cookies } from "next/headers"

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get("user-id")?.value

    if (!userId) return null

    return await getUserById(userId)
  } catch {
    return null
  }
}

export async function setUserSession(userId: string) {
  const cookieStore = await cookies()
  cookieStore.set("user-id", userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function clearUserSession() {
  const cookieStore = await cookies()
  cookieStore.delete("user-id")
}
