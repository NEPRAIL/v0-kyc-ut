// app/api/admin/products/[id]/route.ts
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import { products } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

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

const ParamsSchema = z.object({
  id: z.string().uuid(),
})

const UpdateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.union([z.string(), z.null()]).optional(),
  imageUrl: z.union([z.string().url(), z.null()]).optional(),
  seasonId: z.union([z.string().uuid(), z.null()]).optional(),
  rarityId: z.union([z.string().uuid(), z.null()]).optional(),
  redeemable: z.boolean().optional(),
  series: z.union([z.string(), z.null()]).optional(),
})

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params
  const id = params?.id
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  // we don’t need the request object here because GET might be public; pass if required:
  // const auth = await requireAdmin(_req); if (auth instanceof NextResponse) return auth;

  const row = await db.query.products.findFirst({ where: eq(products.id, id) })
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ product: row })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params

  try {
    const { id } = ParamsSchema.parse(params)
    const auth = await requireAdmin()
    if (auth !== true) return auth

    const body = UpdateProductSchema.parse(await req.json())

    const v = validateUpdate(body)
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

    const [row] = await db.update(products).set(v.value).where(eq(products.id, id)).returning()
    return NextResponse.json({ product: row })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params
  const id = params?.id
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const auth = await requireAdmin()
  if (auth !== true) return auth

  const { db } = await import("@/lib/db")
  const { products } = await import("@/lib/db/schema")
  const { eq } = await import("drizzle-orm")

  await db.delete(products).where(eq(products.id, id))
  return NextResponse.json({ success: true })
}
