"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useTheme } from "@/contexts/theme-context"
import { Palette, Check } from "lucide-react"

export function ThemeToggle() {
  const { theme, setTheme, themes, isLoaded } = useTheme()

  if (!isLoaded) {
    return (
      <Button variant="ghost" size="sm" className="p-2 opacity-50" disabled>
        <Palette className="w-4 h-4" />
        <span className="sr-only">Loading theme</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="p-2 transition-all duration-300 hover:scale-110">
          <Palette className="w-4 h-4" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {themes.map((themeOption) => (
          <DropdownMenuItem
            key={themeOption.value}
            onClick={() => setTheme(themeOption.value)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex flex-col">
              <span className="font-medium">{themeOption.label}</span>
              <span className="text-xs text-muted-foreground">{themeOption.description}</span>
            </div>
            {theme === themeOption.value && <Check className="w-4 h-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
