import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { isRevealSlug } from "@/lib/security/media-path";
import { demoMemory, getDemoReveal, isDemoSlug } from "./demo";
import { fetchReveal, fetchWall, isStoreConfigured, type RevealRecord, type Wall } from "./store";

/*
 * Leituras públicas com cache no servidor (Data Cache do Next, compartilhado entre visitantes).
 * A família inteira abrindo o mesmo link vira UMA consulta ao banco por hora, e toda escrita
 * invalida na hora a tag certa (updateTag nas server actions), então ninguém vê dado velho depois de uma mudança.
 */

export const revealTag = (slug: string) => `reveal:${slug}`;
export const wallTag = (slug: string) => `wall:${slug}`;

/** Revelação pelo slug. Inclui o segredo: nunca passe o registro inteiro para um Client Component. */
export const getReveal = cache(async (slug: string): Promise<RevealRecord | null> => {
  if (isDemoSlug(slug)) return getDemoReveal(slug);
  // Slug fora do formato nem chega ao banco (robôs testando URLs não custam consulta).
  if (!isRevealSlug(slug) || !isStoreConfigured()) return null;
  const record = await unstable_cache(() => fetchReveal(slug), ["reveal", slug], {
    tags: [revealTag(slug)],
    revalidate: 3600,
  })();
  // A validade é conferida fora do cache: uma revelação vencida some mesmo com o cache ainda quente.
  if (!record || (record.expiresAt && Date.parse(record.expiresAt) < Date.now())) return null;
  return record;
});

/** Placar e recados. Cache curto, invalidado a cada palpite ou recado novo. */
export async function getWall(record: RevealRecord): Promise<Wall> {
  if (record.demo) {
    return {
      score: record.reveal.guessEnabled ? demoMemory.score(record.slug) : null,
      messages: demoMemory.messages(record.slug),
    };
  }
  return unstable_cache(() => fetchWall(record.id, record.reveal.guessEnabled), ["wall", record.id], {
    tags: [wallTag(record.slug)],
    revalidate: 60,
  })();
}

/** Contagem com horário marcado ainda não chegou: o segredo e o mural ficam trancados. */
export function isLocked(record: RevealRecord, now = Date.now()) {
  const { revealAt } = record.reveal;
  return !record.demo && Boolean(revealAt) && Date.parse(revealAt!) > now;
}
