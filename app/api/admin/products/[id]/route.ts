import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import { products } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"

const updateProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.union([z.string(), z.null()]).optional(),
  imageUrl: z.union([z.string().url(), z.null()]).optional(),
  seasonId: z.union([z.string().uuid(), z.null()]).optional(),
  rarityId: z.union([z.string().uuid(), z.null()]).optional(),
  redeemable: z.boolean().optional(),
  series: z.union([z.string(), z.null()]).optional(),
})

const paramsSchema = z.object({
  id: z.string().uuid(),
})

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()

    const validatedParams = paramsSchema.parse(params)
    const data = await request.json()
    const validatedData = updateProductSchema.parse(data)

    const { name, slug, description, imageUrl, seasonId, rarityId, redeemable, series } = validatedData

    const [product] = await db
      .update(products)
      .set({
        name,
        slug,
        description: description || null,
        imageUrl: imageUrl || null,
        seasonId: seasonId || null,
        rarityId: rarityId || null,
        redeemable: redeemable || false,
        series: series || null,
      })
      .where(eq(products.id, validatedParams.id))
      .returning()

    return NextResponse.json({ product })
  } catch (error) {
    console.error("Update product error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data", details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()

    const validatedParams = paramsSchema.parse(params)

    await db.delete(products).where(eq(products.id, validatedParams.id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete product error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data", details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
