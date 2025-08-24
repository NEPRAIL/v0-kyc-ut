"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

type Theme = "skyfort" | "landary" | "digibooth" | "ambinet" | "cyberpunk" | "forest" | "liquid-glass"

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  themes: { value: Theme; label: string; description: string }[]
  isLoaded: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("skyfort")
  const [isLoaded, setIsLoaded] = useState(false)

  const themes = [
    { value: "skyfort" as Theme, label: "SkyFort", description: "Professional blue cloud theme" },
    { value: "landary" as Theme, label: "Landary", description: "Purple to pink gradient theme" },
    { value: "digibooth" as Theme, label: "DigiBooth", description: "Dark red gradient theme" },
    { value: "ambinet" as Theme, label: "Ambinet", description: "Dark red to orange theme" },
    { value: "liquid-glass" as Theme, label: "Liquid Glass", description: "Glassmorphism with translucent effects" },
    { value: "forest" as Theme, label: "Forest", description: "Natural green theme" },
  ]

  const setTheme = (newTheme: Theme) => {
    console.log("[v0] Setting theme to:", newTheme)
    setThemeState(newTheme)
    if (typeof window !== "undefined") {
      localStorage.setItem("kycut-theme", newTheme)
      document.documentElement.setAttribute("data-theme", newTheme)
      document.body.setAttribute("data-theme", newTheme)
      document.documentElement.className = `theme-${newTheme}`
      console.log("[v0] Theme applied to document:", document.documentElement.getAttribute("data-theme"))
      requestAnimationFrame(() => {
        document.body.style.display = "none"
        document.body.offsetHeight
        document.body.style.display = ""
      })
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("kycut-theme") as Theme
      console.log("[v0] Loaded saved theme:", savedTheme)
      if (savedTheme && themes.some((t) => t.value === savedTheme)) {
        setThemeState(savedTheme)
        document.documentElement.setAttribute("data-theme", savedTheme)
        document.body.setAttribute("data-theme", savedTheme)
        document.documentElement.className = `theme-${savedTheme}`
      } else {
        document.documentElement.setAttribute("data-theme", "skyfort")
        document.body.setAttribute("data-theme", "skyfort")
        document.documentElement.className = "theme-skyfort"
      }
      setIsLoaded(true)
    }
  }, [])

  return <ThemeContext.Provider value={{ theme, setTheme, themes, isLoaded }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
