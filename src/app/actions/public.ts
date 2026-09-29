"use server";

import { guessInputSchema, messageInputSchema } from "@/lib/reveal/schema";
import { addGuess, addMessage, findReveal, getScore, listMessages, StoreError } from "@/lib/reveal/store";
import type { Score, WallMessage } from "@/lib/reveal/types";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function errorMessage(err: unknown) {
  if (err instanceof StoreError) return err.message;
  console.error(err);
  return "Algo deu errado. Tente de novo.";
}

/** Recados só aparecem depois da revelação: alguém pode ter escrito "é menina!!". */
async function unlockedRecord(slug: string) {
  const record = await findReveal(slug);
  if (!record) return null;
  const { revealAt } = record.reveal;
  if (!record.demo && revealAt && Date.parse(revealAt) > Date.now()) return null;
  return record;
}

export async function submitGuess(input: unknown): Promise<ActionResult> {
  const parsed = guessInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Palpite inválido." };
  try {
    const record = await findReveal(parsed.data.slug);
    if (!record?.reveal.guessEnabled) return { ok: false, error: "Revelação não encontrada." };
    await addGuess(record, parsed.data);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function loadWall(slug: string): Promise<ActionResult<{ score: Score; messages: WallMessage[] }>> {
  try {
    const record = await unlockedRecord(slug);
    if (!record) return { ok: false, error: "Ainda não dá para ver o mural." };
    const [score, messages] = await Promise.all([getScore(record), listMessages(record)]);
    return { ok: true, score, messages };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function postMessage(input: unknown): Promise<ActionResult<{ messages: WallMessage[] }>> {
  const parsed = messageInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Recado inválido." };
  try {
    const record = await unlockedRecord(parsed.data.slug);
    if (!record) return { ok: false, error: "Ainda não dá para deixar recado." };
    await addMessage(record, parsed.data);
    return { ok: true, messages: await listMessages(record) };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
