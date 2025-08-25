"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, Settings, LogOut, MessageSquare } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface UserMenuProps {
  userId: string
}

export function UserMenu({ userId }: UserMenuProps) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        toast.success("Logged out successfully")
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="hidden md:flex text-sm px-3 py-2 transition-all duration-300 hover:scale-105 hover:shadow-md bg-transparent"
        >
          <User className="w-4 h-4 mr-2" />
          Account
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link href="/account" className="flex items-center">
            <User className="w-4 h-4 mr-2" />
            My Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/settings" className="flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/link-telegram" className="flex items-center">
            <MessageSquare className="w-4 h-4 mr-2" />
            Link Telegram
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
