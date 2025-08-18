import { validateRequest } from "./lucia"
import { redirect } from "next/navigation"

export async function requireAuth() {
  const { user, session } = await validateRequest()
  if (!user || !session) {
    redirect("/login")
  }
  return { user, session }
}

export async function requireAdmin() {
  const { user, session } = await requireAuth()
  if (user.role !== "admin") {
    redirect("/shop")
  }
  return { user, session }
}

export async function getOptionalAuth() {
  return await validateRequest()
}
