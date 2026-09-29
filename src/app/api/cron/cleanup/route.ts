import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { serverEnv } from "@/lib/env";
import { revealTag, wallTag } from "@/lib/reveal/queries";
import { safeEqual } from "@/lib/reveal/ids";
import { cleanupExpired, isStoreConfigured } from "@/lib/reveal/store";
import { logError, logSecurity } from "@/lib/security/log";

/**
 * Apaga revelações vencidas (com fotos e músicas) e contadores de limite antigos.
 * A Vercel chama uma vez por dia (vercel.json) mandando `Authorization: Bearer $CRON_SECRET`.
 * É GET porque é assim que o cron da Vercel chama; o efeito só acontece com o segredo certo.
 */
export async function GET(req: NextRequest) {
  const secret = serverEnv().cronSecret;
  const header = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(header, `Bearer ${secret}`)) {
    logSecurity("cron_denied");
    return Response.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  if (!isStoreConfigured()) return Response.json({ deleted: 0 });
  try {
    const slugs = await cleanupExpired();
    for (const slug of slugs) {
      revalidateTag(revealTag(slug), { expire: 0 });
      revalidateTag(wallTag(slug), { expire: 0 });
    }
    return Response.json({ deleted: slugs.length }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    logError("cron:cleanup", err);
    return Response.json({ error: "cleanup_failed" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
