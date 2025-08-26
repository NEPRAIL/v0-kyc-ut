// app/api/admin/products/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Minimal input type + manual validator
type CreateProductInput = {
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  seasonId?: string | null;
  rarityId?: string | null;
  redeemable?: boolean;
  series?: string | null;
};

function validateCreateProduct(data: any):
  | { ok: true; value: CreateProductInput }
  | { ok: false; error: string } {
  if (!data || typeof data !== "object") return { ok: false, error: "Body must be JSON object" };
  if (typeof data.name !== "string" || !data.name.trim()) return { ok: false, error: "name required" };
  if (typeof data.slug !== "string" || !data.slug.trim()) return { ok: false, error: "slug required" };

  return {
    ok: true,
    value: {
      name: data.name.trim(),
      slug: data.slug.trim(),
      description: data.description ?? null,
      imageUrl: data.imageUrl ?? null,
      seasonId: data.seasonId ?? null,
      rarityId: data.rarityId ?? null,
      redeemable: !!data.redeemable,
      series: data.series ?? null,
    },
  };
}

export async function GET(request: NextRequest) {
  // Lazy imports so nothing heavy runs at module load
  const { requireAdmin } = await import("@/lib/auth/middleware");
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { db } = await import("@/lib/db");
  const { products, seasons, rarities } = await import("@/lib/db/schema");
  const { eq, like, sql } = await import("drizzle-orm");

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "10");
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
      season: { id: seasons.id, name: seasons.name },
      rarity: { id: rarities.id, name: rarities.name },
    })
    .from(products)
    .leftJoin(seasons, eq(products.seasonId, seasons.id))
    .leftJoin(rarities, eq(products.rarityId, rarities.id));

  if (search) query = query.where(like(products.name, `%${search}%`));

  const rows = await query.limit(limit).offset(offset).orderBy(products.createdAt);

  let countQuery = db.select({ count: sql<number>`COUNT(*)` }).from(products);
  if (search) countQuery = countQuery.where(like(products.name, `%${search}%`));
  const [{ count }] = await countQuery;

  return NextResponse.json({
    products: rows,
    pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
  });
}

export async function POST(request: NextRequest) {
  const { requireAdmin } = await import("@/lib/auth/middleware");
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { db } = await import("@/lib/db");
  const { products } = await import("@/lib/db/schema");

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const v = validateCreateProduct(body);
  if (!v.ok) return NextResponse.json({ error: "Invalid request data", details: v.error }, { status: 400 });

  const [row] = await db
    .insert(products)
    .values({
      name: v.value.name,
      slug: v.value.slug,
      description: v.value.description,
      imageUrl: v.value.imageUrl,
      seasonId: v.value.seasonId,
      rarityId: v.value.rarityId,
      redeemable: v.value.redeemable ?? false,
      series: v.value.series,
    })
    .returning();

  return NextResponse.json({ product: row });
}
