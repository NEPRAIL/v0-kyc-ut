import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { HeaderClient } from "@/components/navigation/header-client"
import { getHeaderSessionUserId } from "@/components/navigation/header"
import { CartProvider } from "@/contexts/cart-context"
import { ThemeProvider } from "@/contexts/theme-context"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "KYCut - Crypto-only Marketplace",
  description: "Secure crypto-only marketplace for digital collectibles",
  generator: "v0.app",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const uid = await getHeaderSessionUserId()
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <head>
        <style>{`
html {
  font-family: ${inter.style.fontFamily};
  --font-sans: ${inter.style.fontFamily};
}
        `}</style>
      </head>
      <body>
    <ThemeProvider>
          <CartProvider>
      <HeaderClient sessionUserId={uid} />
            {children}
            <Toaster />
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
