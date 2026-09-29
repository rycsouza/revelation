import type { NextRequest } from "next/server";
import { cleanupExpired, isStoreConfigured } from "@/lib/reveal/store";

/**
 * Apaga revelações vencidas (e fotos/músicas). A Vercel chama todo dia (vercel.json)
 * mandando `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isStoreConfigured()) return Response.json({ deleted: 0 });
  const deleted = await cleanupExpired();
  return Response.json({ deleted });
}
