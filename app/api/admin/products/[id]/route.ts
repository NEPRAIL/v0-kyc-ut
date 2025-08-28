import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import { products } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const updateProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.union([z.string(), z.null()]).optional(),
  imageUrl: z.union([z.string().url(), z.null()]).optional(),
  seasonId: z.union([z.string().uuid(), z.null()]).optional(),
  rarityId: z.union([z.string().uuid(), z.null()]).optional(),
  // legacy fields removed from schema; keep input tolerant but ignore
  redeemable: z.boolean().optional(),
  series: z.union([z.string(), z.null()]).optional(),
})

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const productId = params.id // products.id is UUID (string)
    const body = await request.json()
    const data = updateProductSchema.parse(body)

    const [product] = await db
      .update(products)
      .set({
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        seasonId: data.seasonId || null,
        rarityId: data.rarityId || null,
      })
      .where(eq(products.id, productId))
      .returning()

    return NextResponse.json({ product })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 })
    }
    console.error("Update product error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

  const productId = params.id

    await db.delete(products).where(eq(products.id, productId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete product error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
