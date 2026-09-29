"use server";

import { updateTag } from "next/cache";
import { guessInputSchema, messageInputSchema, slugSchema } from "@/lib/reveal/schema";
import { getReveal, getWall, isLocked, wallTag } from "@/lib/reveal/queries";
import { demoMemory } from "@/lib/reveal/demo";
import { insertGuess, insertMessage, StoreError, type Wall } from "@/lib/reveal/store";
import type { RevealSecret } from "@/lib/reveal/types";
import { logError } from "@/lib/security/log";
import { hitRateLimit } from "@/lib/security/rate-limit";
import { clientIpHash } from "@/lib/security/request";

/*
 * Ações públicas (convidados). Não há login: o slug aleatório é o "segredo" de quem tem o link.
 * Tudo validado por schema, com limite por IP e sem devolver nada além do necessário.
 */

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const NOT_FOUND = { ok: false, error: "Revelação não encontrada." } as const;
const TOO_MANY = { ok: false, error: "Muitas tentativas. Espere um pouco e tente de novo." } as const;

function failure(err: unknown, context: string): { ok: false; error: string } {
  if (err instanceof StoreError) return { ok: false, error: err.message };
  logError(context, err);
  return { ok: false, error: "Algo deu errado. Tente de novo." };
}

/**
 * O momento da revelação: devolve o sexo (e o mural) só quando pode.
 * Na contagem com horário marcado, o servidor segura a resposta até a hora chegar.
 */
export async function revealAction(
  slug: unknown,
): Promise<ActionResult<{ secret: RevealSecret; wall: Wall }> | { ok: false; error: string; locked: true }> {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return NOT_FOUND;
  try {
    const record = await getReveal(parsed.data);
    if (!record) return NOT_FOUND;
    if (isLocked(record)) return { ok: false, error: "Ainda não é a hora.", locked: true };
    return { ok: true, secret: record.secret, wall: await getWall(record) };
  } catch (err) {
    return failure(err, "action:reveal");
  }
}

export async function loadWall(slug: unknown): Promise<ActionResult<{ wall: Wall }>> {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return NOT_FOUND;
  try {
    const record = await getReveal(parsed.data);
    // Recados só aparecem depois da revelação: alguém pode ter escrito "é menina!!".
    if (!record || isLocked(record)) return NOT_FOUND;
    return { ok: true, wall: await getWall(record) };
  } catch (err) {
    return failure(err, "action:load_wall");
  }
}

export async function submitGuess(input: unknown): Promise<ActionResult> {
  const parsed = guessInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Palpite inválido." };
  try {
    const record = await getReveal(parsed.data.slug);
    if (!record?.reveal.guessEnabled) return NOT_FOUND;
    if (record.demo) {
      demoMemory.addGuess(record.slug, parsed.data.deviceId, parsed.data.guess);
      return { ok: true };
    }
    // O ID do aparelho é do cliente (dá para inventar vários): o limite por IP segura quem tentar inflar o placar.
    if (!(await hitRateLimit("guess", record.slug, await clientIpHash()))) return TOO_MANY;
    await insertGuess(record, parsed.data);
    updateTag(wallTag(record.slug));
    return { ok: true };
  } catch (err) {
    return failure(err, "action:guess");
  }
}

export async function postMessage(input: unknown): Promise<ActionResult<{ wall: Wall }>> {
  const parsed = messageInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Recado inválido." };
  try {
    const record = await getReveal(parsed.data.slug);
    if (!record || isLocked(record)) return NOT_FOUND;
    if (record.demo) {
      demoMemory.addMessage(record.slug, parsed.data.author, parsed.data.body);
    } else {
      if (!(await hitRateLimit("message", record.slug, await clientIpHash()))) return TOO_MANY;
      await insertMessage(record, parsed.data);
      updateTag(wallTag(record.slug));
    }
    return { ok: true, wall: await getWall(record) };
  } catch (err) {
    return failure(err, "action:message");
  }
}
