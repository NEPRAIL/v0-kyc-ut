"use client"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, User, LogOut, Settings, MessageSquare } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface MobileMenuProps {
  isAuthenticated: boolean
}

export function MobileMenu({ isAuthenticated }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        toast.success("Logged out successfully")
        setIsOpen(false)
        router.refresh()
        router.push("/")
      } else {
        toast.error("Failed to logout")
      }
    } catch (error) {
      console.error("Logout error:", error)
      toast.error("Network error during logout")
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="lg:hidden p-2 transition-all duration-300 hover:scale-110">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] sm:w-[350px] animate-in slide-in-from-right duration-300">
        <nav className="flex flex-col space-y-6 mt-8">
          <Link
            href="/shop"
            className="text-lg font-medium text-foreground hover:text-primary transition-all duration-300 py-2 hover:translate-x-2"
            onClick={() => setIsOpen(false)}
          >
            Marketplace
          </Link>
          <Link
            href="/about"
            className="text-lg font-medium text-foreground hover:text-primary transition-all duration-300 py-2 hover:translate-x-2"
            onClick={() => setIsOpen(false)}
          >
            About
          </Link>
          <Link
            href="/contact"
            className="text-lg font-medium text-foreground hover:text-primary transition-all duration-300 py-2 hover:translate-x-2"
            onClick={() => setIsOpen(false)}
          >
            Contact
          </Link>
          <div className="pt-4 border-t border-border">
            {isAuthenticated ? (
              <>
                <Link
                  href="/account"
                  className="text-lg font-medium text-foreground hover:text-primary transition-all duration-300 py-2 flex items-center hover:translate-x-2"
                  onClick={() => setIsOpen(false)}
                >
                  <User className="w-5 h-5 mr-3" />
                  My Account
                </Link>
                <Link
                  href="/account/settings"
                  className="text-lg font-medium text-foreground hover:text-primary transition-all duration-300 py-2 flex items-center hover:translate-x-2"
                  onClick={() => setIsOpen(false)}
                >
                  <Settings className="w-5 h-5 mr-3" />
                  Settings
                </Link>
                <Link
                  href="/link-telegram"
                  className="text-lg font-medium text-foreground hover:text-primary transition-all duration-300 py-2 flex items-center hover:translate-x-2"
                  onClick={() => setIsOpen(false)}
                >
                  <MessageSquare className="w-5 h-5 mr-3" />
                  Link Telegram
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-lg font-medium text-red-600 hover:text-red-500 transition-all duration-300 py-2 flex items-center hover:translate-x-2 w-full text-left"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="text-lg font-medium text-foreground hover:text-primary transition-all duration-300 py-2 flex items-center hover:translate-x-2"
                onClick={() => setIsOpen(false)}
              >
                <User className="w-5 h-5 mr-3" />
                Sign In
              </Link>
            )}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
