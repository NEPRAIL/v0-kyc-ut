"use client"

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
import { MobileMenu } from "./mobile-menu"
import { UserMenu } from "./user-menu"

export function HeaderClient({ sessionUserId }: { sessionUserId?: string }) {
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-nav transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-7 h-7 sm:w-8 sm:h-8 relative transition-all duration-300 group-hover:scale-110">
              <svg viewBox="0 0 32 32" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 8 C4 6.895 4.895 6 6 6 L16 6 L6 26 C4.895 26 4 25.105 4 24 Z" fill="url(#gradient1)" className="drop-shadow-sm" />
                <path d="M26 6 C27.105 6 28 6.895 28 8 L28 24 C28 25.105 27.105 26 26 26 L16 26 L26 6 Z" fill="url(#gradient2)" className="drop-shadow-sm" />
                <path d="M16 6 L16 26" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3,2" className="text-primary opacity-70" />
                <circle cx="8" cy="12" r="2.5" fill="currentColor" className="text-background opacity-90" />
                <path d="M5 20 C5 17.5 6.5 16 8 16 C9.5 16 11 17.5 11 20" fill="currentColor" className="text-background opacity-90" />
                <rect x="18" y="10" width="8" height="1.5" rx="0.75" fill="currentColor" className="text-background opacity-80" />
                <rect x="18" y="13" width="6" height="1" rx="0.5" fill="currentColor" className="text-background opacity-70" />
                <rect x="18" y="15.5" width="7" height="1" rx="0.5" fill="currentColor" className="text-background opacity-70" />
                <rect x="18" y="18" width="5" height="1" rx="0.5" fill="currentColor" className="text-background opacity-60" />
                <defs>
                  <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--primary)" />
                    <stop offset="100%" stopColor="var(--accent)" />
                  </linearGradient>
                  <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--accent)" />
                    <stop offset="100%" stopColor="var(--primary)" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="text-lg sm:text-2xl font-bold text-foreground transition-all duration-300 group-hover:scale-105">
              KYCut
            </span>
          </Link>

          <NavigationMenu className="hidden lg:flex">
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link href="/shop" legacyBehavior passHref>
                  <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-foreground transition-all duration-300 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50">
                    Marketplace
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link href="/about" legacyBehavior passHref>
                  <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-foreground transition-all duration-300 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50">
                    About
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link href="/contact" legacyBehavior passHref>
                  <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-foreground transition-all duration-300 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50">
                    Contact
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <GlobalSearch />
            <ThemeToggle />
            <CartSidebar />

            {sessionUserId ? (
              <UserMenu userId={sessionUserId} />
            ) : (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="hidden md:flex text-sm px-3 py-2 transition-all duration-300 hover:scale-105 hover:shadow-md bg-transparent"
              >
                <Link href="/login">
                  <User className="w-4 h-4 mr-2" />
                  Sign In
                </Link>
              </Button>
            )}

            <MobileMenu isAuthenticated={!!sessionUserId} />
          </div>
        </div>
      </div>
    </header>
  )
}
