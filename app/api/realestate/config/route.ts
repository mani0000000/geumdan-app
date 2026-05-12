import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const hasApiKey = !!(process.env.MOLIT_API_KEY || process.env.DATA_GO_KR_API_KEY);
  return NextResponse.json({ hasApiKey });
}
