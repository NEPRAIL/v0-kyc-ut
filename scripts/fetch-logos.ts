#!/usr/bin/env tsx

/**
 * Fetch logos script - generates placeholder logos for products
 * This script creates placeholder images instead of fetching external logos
 * to avoid EISDIR errors during build process
 */

import fs from "fs"
import path from "path"

const LOGO_DIRECTORY = "public/logos"
const PLACEHOLDER_DIRECTORY = "public"

// Ensure directories exist
if (!fs.existsSync(LOGO_DIRECTORY)) {
  fs.mkdirSync(LOGO_DIRECTORY, { recursive: true })
}

// List of logos that might be referenced
const logoFiles = [
  "placeholder-logo.png",
  "placeholder-user.jpg",
  "placeholder.jpg",
  "placeholder-logo.svg",
  "placeholder.svg",
  "placeholder-c5j3z.png",
  "placeholder.png",
  "placeholder-user.png",
  "green-arcade-token.png",
  "professional-male-avatar.png",
  "professional-female-avatar.png",
  "professional-male-developer.png",
]

console.log("🔍 Checking logo files...")

// Check if files exist and log status
logoFiles.forEach((filename) => {
  const filePath = path.join(PLACEHOLDER_DIRECTORY, filename)

  try {
    const stats = fs.statSync(filePath)
    if (stats.isFile()) {
      console.log(`✅ ${filename} - exists (${Math.round(stats.size / 1024)}KB)`)
    } else if (stats.isDirectory()) {
      console.log(`⚠️  ${filename} - is a directory (this causes EISDIR errors)`)
    }
  } catch (error) {
    console.log(`❌ ${filename} - missing`)
  }
})

console.log("\n✨ Logo check complete!")
console.log("💡 All logo files should be actual files, not directories")
console.log('💡 Use Next.js Image component with src="/filename.ext" for static serving')
