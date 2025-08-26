import { requireAuth } from "@/lib/auth/middleware"
import { NextResponse } from "next/server"

export default async function SettingsPage() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse || !("ok" in auth) || !auth.ok) {
    return null // redirected or unauthorized
  }
  const { userId } = auth
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-semibold">Account Settings</h1>
      <p className="mt-2 text-sm text-muted-foreground">User ID: {userId}</p>
    </div>
  )
}
