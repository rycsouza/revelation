import type { NextRequest } from "next/server";
import { getReveal } from "@/lib/reveal/queries";
import { fetchMediaObject } from "@/lib/reveal/store";
import { parseMediaFile, storagePath } from "@/lib/security/media-path";

/*
 * Fotos e música de uma revelação, servidas pelo próprio site a partir do bucket PRIVADO.
 * Só entrega arquivo que está ligado a uma revelação existente e não vencida
 * (arquivo solto, de outra revelação ou já removido responde 404).
 */

const NOT_FOUND = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(req: NextRequest, ctx: RouteContext<"/m/[slug]/[file]">) {
  const { slug, file } = await ctx.params;
  const media = parseMediaFile(file);
  const path = storagePath(slug, file);
  if (!media || !path) return NOT_FOUND();

  const record = await getReveal(slug);
  const attached = record && (record.photoPaths.includes(path) || record.musicPath === path);
  if (!attached) return NOT_FOUND();

  const upstream = await fetchMediaObject(slug, file, req.headers.get("range"));
  if (!upstream?.body) return NOT_FOUND();

  const headers = new Headers({
    // Tipo vem da allowlist pela extensão gerada no servidor, nunca do upload.
    "Content-Type": media.mime,
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": "inline",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Accept-Ranges": "bytes",
    // Nomes de arquivo são únicos e nunca mudam: navegador guarda 1 dia; a CDN, 1 hora
    // (limita quanto tempo um arquivo apagado ainda pode sair do cache da CDN).
    "Cache-Control":
      upstream.status === 206 ? "private, max-age=86400" : "public, max-age=86400, s-maxage=3600, stale-while-revalidate=600",
  });
  for (const name of ["content-length", "content-range", "etag", "last-modified"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
