import { NextRequest, NextResponse } from "next/server";
import { collectBrandPromotions } from "@/scripts/batch/fetch-brand-promotions.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await collectBrandPromotions("vercel_cron");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron/brand-promotions]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "collection failed" }, { status: 500 });
  }
}
