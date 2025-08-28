import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"
import { CartSidebar } from "@/components/cart/cart-sidebar"
import { GlobalSearch } from "@/components/search/global-search"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { User } from "lucide-react"
import { cookies } from "next/headers"
import { unstable_noStore as noStore } from "next/cache"
import { verifySession } from "@/lib/security"
import { HeaderClient } from "./header-client"
import { MobileMenu } from "./mobile-menu"
import { UserMenu } from "./user-menu"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function getHeaderSessionUserId(): Promise<string | undefined> {
  noStore()
  const c = await cookies()
  const raw = c.get("session")?.value
  const session = raw ? await verifySession(raw) : null
  return session?.uid || undefined
}

export async function Header() {
  const uid = await getHeaderSessionUserId()
  return <HeaderClient sessionUserId={uid} />
}
