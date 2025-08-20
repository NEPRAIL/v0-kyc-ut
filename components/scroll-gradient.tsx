"use client"

import { useEffect } from "react"

export function ScrollGradient() {
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      const scrollProgress = Math.min(scrolled / maxScroll, 1)

      const hue1 = 250 + scrollProgress * 30 // Purple to blue shift
      const hue2 = 270 + scrollProgress * 40 // Purple to magenta shift
      const opacity = 0.03 + scrollProgress * 0.07 // Subtle opacity change

      document.body.style.background = `
        linear-gradient(135deg, 
          hsl(var(--background)) 0%,
          hsla(${hue1}, 70%, 60%, ${opacity}) 30%,
          hsla(${hue2}, 65%, 65%, ${opacity * 0.8}) 60%,
          hsl(var(--background)) 100%)
      `
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return null
}
