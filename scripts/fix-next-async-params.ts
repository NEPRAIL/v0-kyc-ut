// scripts/fix-next-async-params.ts
/* eslint-disable no-console */
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const APP_DIR = path.join(ROOT, "app")

function isValidFile(filePath: string): boolean {
  try {
    const stats = fs.statSync(filePath)
    return stats.isFile()
  } catch {
    return false
  }
}

function isValidDirectory(dirPath: string): boolean {
  try {
    const stats = fs.statSync(dirPath)
    return stats.isDirectory()
  } catch {
    return false
  }
}

function listTsxFiles(dir: string, out: string[] = []) {
  if (!isValidDirectory(dir)) return out

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const p = path.join(dir, entry.name)

      // Skip hidden files and directories
      if (entry.name.startsWith(".")) continue

      if (entry.isDirectory()) {
        listTsxFiles(p, out)
      } else if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
        out.push(p)
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dir}:`, error.message)
  }

  return out
}

function patchFile(p: string) {
  if (!isValidFile(p)) {
    console.warn(`Skipping ${p}: not a valid file`)
    return
  }

  let src
  try {
    src = fs.readFileSync(p, "utf8")
  } catch (error) {
    console.warn(`Could not read file ${p}:`, error.message)
    return
  }

  let changed = false

  // If file references params.* add async + await
  if (src.includes("params.") || src.includes(" searchParams.")) {
    // Ensure default export function is async
    src = src.replace(
      /export default function (\w+)\s*$$\s*\{([^}]*)\}\s*:\s*([^)]+)$$\s*\{/,
      (m, name, props, typeAnn) => {
        changed = true
        return `export default async function ${name}({${props}}: ${typeAnn}) {`
      },
    )

    // Add Promise type to params/searchParams if not present
    src = src.replace(/type\s+(\w+)\s*=\s*\{\s*params:\s*\{([^}]*)\}\s*;?\s*\}/, (m, typeName, inner) => {
      changed = true
      return `type ${typeName} = { params: Promise<{ ${inner} }> }`
    })

    // Generic props type fallback (if above pattern didn't match)
    if (/function\s+\w+\s*\(\s*\{\s*params\s*:/.test(src) && !/Promise<\{/.test(src)) {
      src = src.replace(/(\{\s*params\s*:\s*)(\{[^}]*\})/, (_m, a, b) => {
        changed = true
        return `${a}Promise<${b}>`
      })
    }

    // Await params usage
    if (src.includes("params.")) {
      // Insert resolver near top of functions using params
      src = src.replace(/(\{[^}]*\}\s*:\s*[^)]+\)\s*\{\s*)/, (m) => {
        if (m.includes("async")) return m // already async, handled above
        return m // we made async earlier
      })
      // Replace direct params.id usages with destructuring after await
      // Simple heuristic: inject once per file if params. is present
      if (!src.includes("const __resolvedParams__")) {
        src = src.replace(
          /(\n)/,
          `\n// v0 codemod: resolve async params\nconst __resolvedParams__ = typeof (params as any)?.then === "function" ? await (params as Promise<Record<string,string>>) : (params as Record<string,string>);\n`,
        )
      }
      src = src.replace(/params\.(\w+)/g, "__resolvedParams__.$1")
      changed = true
    }

    // generateMetadata variants
    src = src.replace(
      /export function generateMetadata\s*$$\s*\{\s*params([^}]*)\}\s*:\s*([^)]+)$$\s*\{/,
      (m, rest, typeAnn) => {
        changed = true
        return `export async function generateMetadata({ params${rest}}: ${typeAnn}) {`
      },
    )
    if (src.includes("generateMetadata") && src.includes("params.")) {
      if (!src.includes("__metaResolvedParams__")) {
        src = src.replace(
          /export async function generateMetadata[^{]+\{/,
          (m) =>
            `${m}\n  const __metaResolvedParams__ = typeof (params as any)?.then === "function" ? await (params as Promise<Record<string,string>>) : (params as Record<string,string>);\n`,
        )
      }
      src = src.replace(/params\.(\w+)/g, "__metaResolvedParams__.$1")
    }
  }

  if (changed) {
    try {
      fs.writeFileSync(p, src, "utf8")
      console.log(`patched: ${path.relative(ROOT, p)}`)
    } catch (error) {
      console.error(`Could not write file ${p}:`, error.message)
    }
  }
}

function run() {
  if (!isValidDirectory(APP_DIR)) {
    console.warn(`App directory ${APP_DIR} does not exist or is not a directory, skipping...`)
    return
  }

  const files = listTsxFiles(APP_DIR)
  for (const f of files) patchFile(f)
  console.log("Done.")
}

run()
