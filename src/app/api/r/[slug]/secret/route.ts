import type { NextRequest } from "next/server";
import { findReveal } from "@/lib/reveal/store";

/**
 * Entrega o sexo só na hora da revelação. Numa contagem com horário marcado,
 * o servidor segura a resposta até o horário chegar, mesmo que alguém chame a rota antes.
 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/r/[slug]/secret">) {
  const { slug } = await ctx.params;
  const record = await findReveal(slug);
  const headers = { "Cache-Control": "no-store" };

  if (!record) return Response.json({ error: "not_found" }, { status: 404, headers });

  const { revealAt } = record.reveal;
  // Nas demos o horário é recalculado a cada request, então não dá para travar.
  if (!record.demo && revealAt && Date.parse(revealAt) > Date.now()) {
    return Response.json({ error: "locked", revealAt }, { status: 423, headers });
  }

  return Response.json(record.secret, { headers });
}
