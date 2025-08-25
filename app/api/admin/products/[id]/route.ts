// app/api/admin/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";          // keep on Node runtime
export const dynamic = "force-dynamic";   // avoid static analysis caching

const Params = z.object({ id: z.string().min(1) });

const UpdateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.union([z.string(), z.null()]).optional(),   // ✅ no .nullable()
  price: z.coerce.number().nonnegative().optional(),
  images: z.union([z.array(z.string().url()), z.null()]).optional(),
  thumbnail: z.union([z.string().url(), z.null()]).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  sku: z.union([z.string(), z.null()]).optional(),
  categoryId: z.union([z.string(), z.null()]).optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { id } = Params.parse(ctx.params);
    const payload = UpdateProductSchema.parse(await req.json());

    // TODO: put your DB update here (drizzle/sql etc.)
    // await db.update(products).set(payload).where(eq(products.id, id));

    return NextResponse.json({ success: true, id, data: payload });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Invalid input or server error",
        details: err?.issues ?? (process.env.NODE_ENV !== "production" ? String(err) : undefined),
      },
      { status: 400 }
    );
  }
}

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { id } = Params.parse(ctx.params);
    // const product = await db.query.products.findFirst({ where: eq(products.id, id) });
    const product = null; // replace with real fetch
    return NextResponse.json({ success: true, id, product });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed", details: String(err) }, { status: 400 });
  }
}
