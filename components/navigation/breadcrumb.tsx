"use client"

import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { usePathname } from "next/navigation"
import { productCategories } from "@/lib/data/products"

interface BreadcrumbItem {
  label: string
  href: string
  current?: boolean
}

export function Breadcrumb() {
  const pathname = usePathname()

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split("/").filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = [{ label: "Home", href: "/" }]

    if (segments.length === 0) return breadcrumbs

    // Handle shop page
    if (segments[0] === "shop") {
      breadcrumbs.push({ label: "Marketplace", href: "/shop" })

      // Check for category in URL params
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search)
        const category = urlParams.get("category")
        if (category && category !== "all") {
          const categoryInfo = productCategories.find((cat) => cat.id === category)
          if (categoryInfo) {
            breadcrumbs.push({
              label: categoryInfo.name,
              href: `/shop?category=${category}`,
              current: true,
            })
          }
        } else {
          breadcrumbs[breadcrumbs.length - 1].current = true
        }
      }
    }

    // Handle product page
    if (segments[0] === "product" && segments[1]) {
      breadcrumbs.push({ label: "Marketplace", href: "/shop" })
      breadcrumbs.push({
        label: "Product Details",
        href: `/product/${segments[1]}`,
        current: true,
      })
    }

    // Handle other pages
    if (segments[0] === "about") {
      breadcrumbs.push({ label: "About", href: "/about", current: true })
    }

    if (segments[0] === "contact") {
      breadcrumbs.push({ label: "Contact", href: "/contact", current: true })
    }

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  if (breadcrumbs.length <= 1) return null

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-6">
      {breadcrumbs.map((item, index) => (
        <div key={item.href} className="flex items-center">
          {index > 0 && <ChevronRight className="w-4 h-4 mx-2" />}

          {index === 0 && <Home className="w-4 h-4 mr-2" />}

          {item.current ? (
            <span className="text-foreground font-medium">{item.label}</span>
          ) : (
            <Link href={item.href} className="hover:text-foreground transition-colors duration-200">
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}
