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
      const opacity = 0.05 + scrollProgress * 0.1 // More visible opacity change

      document.body.style.background = `
        linear-gradient(135deg, 
          hsl(var(--background)) 0%,
          hsla(${hue1}, 70%, 60%, ${opacity}) 25%,
          hsla(${hue2}, 65%, 65%, ${opacity * 0.8}) 50%,
          hsla(${hue1 + 20}, 75%, 70%, ${opacity * 0.6}) 75%,
          hsl(var(--background)) 100%)
      `
    }

    handleScroll()
    let ticking = false

    const throttledScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll()
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener("scroll", throttledScroll, { passive: true })
    return () => window.removeEventListener("scroll", throttledScroll)
  }, [])

  return null
}
