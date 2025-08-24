import type React from "react"
import { requireAuth } from "@/lib/auth/middleware"
import { AccountSidebar } from "@/components/account/account-sidebar"

export const dynamic = "force-dynamic"

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAuth()

  return (
    <div className="min-h-screen bg-background flex">
      <AccountSidebar />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
