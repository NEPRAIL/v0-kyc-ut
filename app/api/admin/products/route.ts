// app/api/admin/products/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.union([z.string(), z.null()]).optional(),
  imageUrl: z.union([z.string().url(), z.null()]).optional(),
  seasonId: z.union([z.string().uuid(), z.null()]).optional(),
  rarityId: z.union([z.string().uuid(), z.null()]).optional(),
  redeemable: z.boolean().optional(),
  series: z.union([z.string(), z.null()]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    // ⬇️ Lazy imports prevent build-time evaluation of other modules
    const [{ requireAdmin }, { db }, { products, seasons, rarities }, { eq, like, sql }] =
      await Promise.all([
        import("@/lib/auth/middleware"),
        import("@/lib/db"),
        import("@/lib/db/schema"),
        import("drizzle-orm"),
      ]);

    await requireAdmin(request); // pass request

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    let query = db
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        description: products.description,
        imageUrl: products.imageUrl,
        redeemable: products.redeemable,
        series: products.series,
        createdAt: products.createdAt,
        season: {
          id: seasons.id,
          name: seasons.name,
        },
        rarity: {
          id: rarities.id,
          name: rarities.name,
        },
      })
      .from(products)
      .leftJoin(seasons, eq(products.seasonId, seasons.id))
      .leftJoin(rarities, eq(products.rarityId, rarities.id));

    if (search) {
      query = query.where(like(products.name, `%${search}%`));
    }

    const results = await query.limit(limit).offset(offset).orderBy(products.createdAt);

    // total count
    let countQuery = db.select({ count: sql<number>`COUNT(*)` }).from(products);
    if (search) {
      countQuery = countQuery.where(like(products.name, `%${search}%`));
    }
    const [{ count }] = await countQuery;

    return NextResponse.json({
      products: results,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Admin products GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const [{ requireAdmin }, { db }, { products }] = await Promise.all([
      import("@/lib/auth/middleware"),
      import("@/lib/db"),
      import("@/lib/db/schema"),
    ]);

    await requireAdmin(request); // pass request

    const body = await request.json();
    const data = CreateProductSchema.parse(body);

    const [created] = await db
      .insert(products)
      .values({
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        imageUrl: data.imageUrl ?? null,
        seasonId: data.seasonId ?? null,
        rarityId: data.rarityId ?? null,
        redeemable: data.redeemable ?? false,
        series: data.series ?? null,
      })
      .returning();

    return NextResponse.json({ product: created });
  } catch (error: any) {
    console.error("Create product error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
