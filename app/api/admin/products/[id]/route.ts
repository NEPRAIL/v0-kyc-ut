// app/api/admin/products/[id]/route.ts
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type UpdatePayload = {
  name?: string
  description?: string | null
  imageUrl?: string | null
  seasonId?: string | null
  rarityId?: string | null
  redeemable?: boolean
  series?: string | null
}

function validateUpdate(b: any): { ok: true; value: UpdatePayload } | { ok: false; error: string } {
  if (!b || typeof b !== "object") return { ok: false, error: "Body must be JSON object" }
  const v: UpdatePayload = {}
  if ("name" in b) v.name = typeof b.name === "string" && b.name.trim() ? b.name.trim() : undefined
  if ("description" in b) v.description = b.description ?? null
  if ("imageUrl" in b) v.imageUrl = b.imageUrl ?? null
  if ("seasonId" in b) v.seasonId = b.seasonId ?? null
  if ("rarityId" in b) v.rarityId = b.rarityId ?? null
  if ("redeemable" in b) v.redeemable = !!b.redeemable
  if ("series" in b) v.series = b.series ?? null
  return { ok: true, value: v }
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params
  const id = params?.id
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const { requireAdmin } = await import("@/lib/auth/middleware")
  // we don’t need the request object here because GET might be public; pass if required:
  // const auth = await requireAdmin(_req); if (auth instanceof NextResponse) return auth;

  const { db } = await import("@/lib/db")
  const { products } = await import("@/lib/db/schema")
  const { eq } = await import("drizzle-orm")

  const row = await db.query.products.findFirst({ where: eq(products.id, id) })
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ product: row })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params
  const id = params?.id
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const { requireAdmin } = await import("@/lib/auth/middleware")
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const v = validateUpdate(body)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

  const { db } = await import("@/lib/db")
  const { products } = await import("@/lib/db/schema")
  const { eq } = await import("drizzle-orm")

  const [row] = await db.update(products).set(v.value).where(eq(products.id, id)).returning()
  return NextResponse.json({ product: row })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params
  const id = params?.id
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const { requireAdmin } = await import("@/lib/auth/middleware")
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  const { db } = await import("@/lib/db")
  const { products } = await import("@/lib/db/schema")
  const { eq } = await import("drizzle-orm")

  await db.delete(products).where(eq(products.id, id))
  return NextResponse.json({ success: true })
}
