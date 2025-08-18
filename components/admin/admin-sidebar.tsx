"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Package, Calendar, Star, Palette, DollarSign, BarChart3, Settings } from "lucide-react"

const navigation = [
  { name: "Overview", href: "/admin", icon: BarChart3 },
  { name: "Products", href: "/admin/products", icon: Package },
  { name: "Seasons", href: "/admin/seasons", icon: Calendar },
  { name: "Rarities", href: "/admin/rarities", icon: Star },
  { name: "Variants", href: "/admin/variants", icon: Palette },
  { name: "Listings", href: "/admin/listings", icon: DollarSign },
  { name: "Settings", href: "/admin/settings", icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-card border-r border-border">
      <div className="p-6">
        <h2 className="text-lg font-semibold">Admin Panel</h2>
      </div>
      <nav className="px-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <item.icon className="mr-3 h-4 w-4" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
