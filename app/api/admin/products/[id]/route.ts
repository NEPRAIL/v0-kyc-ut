import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import { products } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()

    const productId = params.id
    const data = await request.json()
    const { name, slug, description, imageUrl, seasonId, rarityId } = data

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 })
    }

    const [product] = await db
      .update(products)
      .set({
        name,
        slug,
        description: description || null,
        imageUrl: imageUrl || null,
        seasonId: seasonId || null,
        rarityId: rarityId || null,
      })
      .where(eq(products.id, productId))
      .returning()

    return NextResponse.json({ product })
  } catch (error) {
    console.error("Update product error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()

    const productId = params.id

    await db.delete(products).where(eq(products.id, productId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete product error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
