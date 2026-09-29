"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { MEDIA_RULES, revealInputSchema, type MediaKind } from "@/lib/reveal/schema";
import {
  authorize,
  createReveal,
  createUploadUrl,
  deleteMessage,
  deleteReveal,
  getDashboard,
  isStoreConfigured,
  setMusic,
  setPhotos,
  StoreError,
  updateReveal,
} from "@/lib/reveal/store";
import type { Dashboard } from "@/lib/reveal/types";
import type { ActionResult } from "./public";

/*
 * Ações do dono da revelação. Não há login: quem tem o link secreto de edição
 * (slug + token) pode tudo. Cada ação confere o token antes de qualquer coisa.
 */

function errorMessage(err: unknown) {
  if (err instanceof StoreError) return err.message;
  console.error(err);
  return "Algo deu errado. Tente de novo.";
}

const NOT_ALLOWED = { ok: false, error: "Link de edição inválido ou expirado." } as const;

async function withOwner<T extends object>(
  slug: string,
  token: string,
  run: (id: string) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  if (typeof slug !== "string" || typeof token !== "string" || !token) return NOT_ALLOWED;
  try {
    const id = await authorize(slug, token);
    if (!id) return NOT_ALLOWED;
    return await run(id);
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

function invalid(err: z.ZodError): { ok: false; error: string } {
  return { ok: false, error: err.issues[0]?.message ?? "Confira os campos do formulário." };
}

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

export async function createRevealAction(input: unknown): Promise<ActionResult<{ slug: string; token: string }>> {
  if (!isStoreConfigured()) return { ok: false, error: "A criação está desligada: o Supabase não foi configurado." };
  const parsed = revealInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const { slug, token } = await createReveal(parsed.data, await clientIp());
    return { ok: true, slug, token };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function loadDashboard(slug: string, token: string): Promise<ActionResult<{ dashboard: Dashboard }>> {
  return withOwner<{ dashboard: Dashboard }>(slug, token, async (id) => ({ ok: true, dashboard: await getDashboard(id) }));
}

export async function saveRevealAction(slug: string, token: string, input: unknown): Promise<ActionResult> {
  return withOwner(slug, token, async (id) => {
    const parsed = revealInputSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    await updateReveal(id, parsed.data);
    return { ok: true };
  });
}

export async function deleteRevealAction(slug: string, token: string): Promise<ActionResult> {
  return withOwner(slug, token, async (id) => {
    await deleteReveal(id, slug);
    return { ok: true };
  });
}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
};

/** Devolve uma URL assinada de upload direto para o Storage: o arquivo não passa pelo Next (a Vercel limita o corpo a 4,5 MB). */
export async function requestUpload(
  slug: string,
  token: string,
  kind: MediaKind,
  contentType: string,
  size: number,
): Promise<ActionResult<{ path: string; uploadUrl: string }>> {
  return withOwner<{ path: string; uploadUrl: string }>(slug, token, async () => {
    const rules = MEDIA_RULES[kind];
    if (!rules) return { ok: false, error: "Tipo de arquivo inválido." };
    if (!(rules.types as readonly string[]).includes(contentType)) {
      return { ok: false, error: kind === "photo" ? "Use uma foto JPG, PNG ou WebP." : "Use uma música MP3, M4A, AAC, OGG ou WAV." };
    }
    if (!Number.isFinite(size) || size <= 0 || size > rules.maxBytes) {
      return { ok: false, error: `O arquivo pode ter no máximo ${rules.maxBytes / 1024 / 1024} MB.` };
    }
    const { path, uploadUrl } = await createUploadUrl(slug, kind, EXTENSIONS[contentType]);
    return { ok: true, path, uploadUrl };
  });
}

export async function attachMusic(slug: string, token: string, path: string | null): Promise<ActionResult> {
  return withOwner(slug, token, async (id) => {
    if (path !== null && typeof path !== "string") return { ok: false, error: "Arquivo inválido." };
    await setMusic(id, slug, path);
    return { ok: true };
  });
}

export async function setPhotosAction(slug: string, token: string, paths: string[]): Promise<ActionResult> {
  return withOwner(slug, token, async (id) => {
    if (!Array.isArray(paths) || paths.some((p) => typeof p !== "string")) return { ok: false, error: "Fotos inválidas." };
    await setPhotos(id, slug, paths);
    return { ok: true };
  });
}

export async function removeMessageAction(slug: string, token: string, messageId: string): Promise<ActionResult> {
  return withOwner(slug, token, async (id) => {
    if (!z.uuid().safeParse(messageId).success) return { ok: false, error: "Recado inválido." };
    await deleteMessage(id, messageId);
    return { ok: true };
  });
}
