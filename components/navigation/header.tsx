"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, ShoppingCart, User, Search, Zap } from "lucide-react"
import { useState } from "react"

export function Header() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-nav transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <span className="text-lg sm:text-2xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent transition-all duration-300 group-hover:scale-105">
              KYCut
            </span>
          </Link>

          {/* Desktop Navigation */}
          <NavigationMenu className="hidden lg:flex">
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link href="/shop" legacyBehavior passHref>
                  <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background/20 backdrop-blur-sm px-4 py-2 text-sm font-medium transition-all duration-300 hover:bg-accent/30 hover:text-accent-foreground hover:scale-105 focus:bg-accent/30 focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50">
                    Marketplace
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger className="transition-all duration-300 hover:scale-105 bg-background/20 backdrop-blur-sm hover:bg-accent/30">
                  Categories
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid gap-3 p-6 w-[400px] animate-in fade-in-0 zoom-in-95 bg-background/95 backdrop-blur-xl border border-white/10">
                    <Link
                      href="/shop?category=neo-banks"
                      className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-all duration-300 hover:bg-accent/20 hover:text-accent-foreground hover:scale-105 focus:bg-accent/20 focus:text-accent-foreground"
                    >
                      <div className="text-sm font-medium leading-none">Neo-Banks 🏪</div>
                      <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                        Modern digital banking solutions with KYC completed
                      </p>
                    </Link>
                    <Link
                      href="/shop?category=business-banks"
                      className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-all duration-300 hover:bg-accent/20 hover:text-accent-foreground hover:scale-105 focus:bg-accent/20 focus:text-accent-foreground"
                    >
                      <div className="text-sm font-medium leading-none">Business Banks 👤</div>
                      <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                        Professional business banking accounts ready to use
                      </p>
                    </Link>
                    <Link
                      href="/shop?category=crypto-exchanges"
                      className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-all duration-300 hover:bg-accent/20 hover:text-accent-foreground hover:scale-105 focus:bg-accent/20 focus:text-accent-foreground"
                    >
                      <div className="text-sm font-medium leading-none">Crypto Exchanges 🪙</div>
                      <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                        Pre-verified cryptocurrency trading accounts
                      </p>
                    </Link>
                    <Link
                      href="/shop?category=custom-name-banks"
                      className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-all duration-300 hover:bg-accent/20 hover:text-accent-foreground hover:scale-105 focus:bg-accent/20 focus:text-accent-foreground"
                    >
                      <div className="text-sm font-medium leading-none">Custom Name Banks 📊</div>
                      <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                        Personalized banking solutions with custom naming
                      </p>
                    </Link>
                    <Link
                      href="/shop?category=spain-banks"
                      className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-all duration-300 hover:bg-accent/20 hover:text-accent-foreground hover:scale-105 focus:bg-accent/20 focus:text-accent-foreground"
                    >
                      <div className="text-sm font-medium leading-none">Spain Banks 🇪🇸</div>
                      <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                        Spanish banking institutions with full verification
                      </p>
                    </Link>
                    <Link
                      href="/shop?category=italy-banks"
                      className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-all duration-300 hover:bg-accent/20 hover:text-accent-foreground hover:scale-105 focus:bg-accent/20 focus:text-accent-foreground"
                    >
                      <div className="text-sm font-medium leading-none">Italy Banks 🇮🇹</div>
                      <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                        Italian banking solutions with completed KYC
                      </p>
                    </Link>
                    <Link
                      href="/shop?category=germany-banks"
                      className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-all duration-300 hover:bg-accent/20 hover:text-accent-foreground hover:scale-105 focus:bg-accent/20 focus:text-accent-foreground"
                    >
                      <div className="text-sm font-medium leading-none">Germany Banks 🇩🇪</div>
                      <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                        German banking accounts with premium verification
                      </p>
                    </Link>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link href="/about" legacyBehavior passHref>
                  <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background/20 backdrop-blur-sm px-4 py-2 text-sm font-medium transition-all duration-300 hover:bg-accent/30 hover:text-accent-foreground hover:scale-105 focus:bg-accent/30 focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50">
                    About
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link href="/contact" legacyBehavior passHref>
                  <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background/20 backdrop-blur-sm px-4 py-2 text-sm font-medium transition-all duration-300 hover:bg-accent/30 hover:text-accent-foreground hover:scale-105 focus:bg-accent/30 focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50">
                    Contact
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* Right side actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:flex p-2 transition-all duration-300 hover:scale-110 hover:bg-accent/20 backdrop-blur-sm"
            >
              <Search className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="relative p-2 transition-all duration-300 hover:scale-110 hover:bg-accent/20 backdrop-blur-sm"
            >
              <ShoppingCart className="w-4 h-4" />
              <Badge className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-xs bg-secondary animate-pulse">
                0
              </Badge>
            </Button>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="hidden md:flex bg-transparent backdrop-blur-sm text-sm px-3 py-2 transition-all duration-300 hover:scale-105 hover:shadow-md hover:bg-accent/20 border-white/20"
            >
              <Link href="/login">
                <User className="w-4 h-4 mr-2" />
                Sign In
              </Link>
            </Button>

            {/* Mobile menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden p-2 transition-all duration-300 hover:scale-110 hover:bg-accent/20 backdrop-blur-sm"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[280px] sm:w-[350px] animate-in slide-in-from-right duration-300 bg-background/95 backdrop-blur-xl border-l border-white/10"
              >
                <nav className="flex flex-col space-y-6 mt-8">
                  <Link
                    href="/shop"
                    className="text-lg font-medium hover:text-primary transition-all duration-300 py-2 hover:translate-x-2"
                    onClick={() => setIsOpen(false)}
                  >
                    Marketplace
                  </Link>
                  <Link
                    href="/about"
                    className="text-lg font-medium hover:text-primary transition-all duration-300 py-2 hover:translate-x-2"
                    onClick={() => setIsOpen(false)}
                  >
                    About
                  </Link>
                  <Link
                    href="/contact"
                    className="text-lg font-medium hover:text-primary transition-all duration-300 py-2 hover:translate-x-2"
                    onClick={() => setIsOpen(false)}
                  >
                    Contact
                  </Link>
                  <div className="pt-4 border-t border-border">
                    <Link
                      href="/login"
                      className="text-lg font-medium hover:text-primary transition-all duration-300 py-2 flex items-center hover:translate-x-2"
                      onClick={() => setIsOpen(false)}
                    >
                      <User className="w-5 h-5 mr-3" />
                      Sign In
                    </Link>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
