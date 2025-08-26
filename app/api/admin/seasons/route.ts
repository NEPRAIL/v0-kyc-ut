// app/api/admin/seasons/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// manual input + validator (no zod)
type CreateSeasonInput = { name: string };

function validateCreateSeason(data: any):
  | { ok: true; value: CreateSeasonInput }
  | { ok: false; error: string } {
  if (!data || typeof data !== "object") return { ok: false, error: "Body must be JSON object" };
  if (typeof data.name !== "string" || !data.name.trim()) return { ok: false, error: "name required" };
  return { ok: true, value: { name: data.name.trim() } };
}

export async function GET(request: NextRequest) {
  // auth first (lazy import)
  const { requireAdmin } = await import("@/lib/auth/middleware");
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { db } = await import("@/lib/db");
  const { seasons } = await import("@/lib/db/schema");
  const { like, sql } = await import("drizzle-orm");

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "10");
  const offset = (page - 1) * limit;

  let query = db
    .select({
      id: seasons.id,
      name: seasons.name,
    })
    .from(seasons);

  if (search) query = query.where(like(seasons.name, `%${search}%`));

  const rows = await query.limit(limit).offset(offset);

  let countQuery = db.select({ count: sql<number>`COUNT(*)` }).from(seasons);
  if (search) countQuery = countQuery.where(like(seasons.name, `%${search}%`));
  const [{ count }] = await countQuery;

  return NextResponse.json({
    seasons: rows,
    pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
  });
}

export async function POST(request: NextRequest) {
  const { requireAdmin } = await import("@/lib/auth/middleware");
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const v = validateCreateSeason(body);
  if (!v.ok) return NextResponse.json({ error: "Invalid request data", details: v.error }, { status: 400 });

  const { db } = await import("@/lib/db");
  const { seasons } = await import("@/lib/db/schema");

  const [row] = await db.insert(seasons).values({ name: v.value.name }).returning();
  return NextResponse.json({ season: row });
}
