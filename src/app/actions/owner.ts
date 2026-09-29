"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { clearOwnerCookie, currentOwnerId, ownerToken, setOwnerCookie } from "@/lib/owner-session";
import { revealTag, wallTag } from "@/lib/reveal/queries";
import { ownerLinkSchema, photoPathSchema, revealInputSchema } from "@/lib/reveal/schema";
import {
  addPhoto,
  authorizeOwner,
  createReveal,
  deleteMessage,
  deleteReveal,
  isStoreConfigured,
  removeMusic,
  removePhoto,
  reorderPhotos,
  setMusic,
  StoreError,
  updateReveal,
} from "@/lib/reveal/store";
import { logError, logSecurity } from "@/lib/security/log";
import { isRevealSlug, mediaUrl } from "@/lib/security/media-path";
import { hitRateLimit } from "@/lib/security/rate-limit";
import { clientIpHash } from "@/lib/security/request";
import { checkMusic, processPhoto, readUpload, UploadRejected } from "@/lib/security/uploads";
import type { ActionResult } from "./public";

/*
 * Ações do dono. Não há conta: quem tem o link secreto de edição vira dono NESTE navegador
 * (cookie HttpOnly com o token). Cada ação:
 *   1. valida o slug pelo formato;
 *   2. confere o token do cookie contra o hash no banco (currentOwnerId);
 *   3. opera SOMENTE pelo id retornado dessa checagem (nunca por id vindo do cliente).
 * CSRF: server actions só aceitam POST com Origin igual ao host, e o cookie é SameSite=Lax.
 */

const NOT_ALLOWED = { ok: false, error: "Você não tem acesso a esta revelação neste aparelho." } as const;
const TOO_MANY = { ok: false, error: "Muitas tentativas. Espere um pouco e tente de novo." } as const;

function failure(err: unknown, context: string): { ok: false; error: string } {
  if (err instanceof StoreError || err instanceof UploadRejected) return { ok: false, error: err.message };
  logError(context, err);
  return { ok: false, error: "Algo deu errado. Tente de novo." };
}

async function withOwner<T extends object>(
  slug: unknown,
  context: string,
  run: (id: string, slug: string) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  if (!isRevealSlug(slug)) return NOT_ALLOWED;
  try {
    const id = await currentOwnerId(slug);
    if (!id) {
      logSecurity("owner_denied", { slug, context });
      return NOT_ALLOWED;
    }
    return await run(id, slug);
  } catch (err) {
    return failure(err, `action:${context}`);
  }
}

function invalid(err: z.ZodError): { ok: false; error: string } {
  return { ok: false, error: err.issues[0]?.message ?? "Confira os campos do formulário." };
}

/** Limpa o cache público da revelação e atualiza o painel (SSR) na mesma resposta. */
function changed(slug: string, { wall = false } = {}) {
  updateTag(revealTag(slug));
  if (wall) updateTag(wallTag(slug));
  refresh();
}

/* ---------- Criar e abrir ---------- */

export async function createRevealAction(input: unknown): Promise<ActionResult<{ slug: string }>> {
  if (!isStoreConfigured()) return { ok: false, error: "A criação está desligada no momento." };
  const parsed = revealInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const ipHash = await clientIpHash();
    if (!(await hitRateLimit("create", ipHash))) return TOO_MANY;
    const { slug, token, expiresAt } = await createReveal(parsed.data);
    // O token não volta para o JavaScript: fica só no cookie HttpOnly.
    await setOwnerCookie(slug, token, expiresAt);
    logSecurity("reveal_created", { slug, ipHash });
    return { ok: true, slug };
  } catch (err) {
    return failure(err, "action:create");
  }
}

/** Troca o link de edição (slug + token do #) por uma sessão neste navegador. */
export async function openPanelAction(input: unknown): Promise<ActionResult> {
  const parsed = ownerLinkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Link de edição inválido." };
  try {
    const ipHash = await clientIpHash();
    if (!(await hitRateLimit("panel", ipHash))) return TOO_MANY;
    const id = await authorizeOwner(parsed.data.slug, parsed.data.token);
    if (!id) {
      logSecurity("panel_link_rejected", { slug: parsed.data.slug, ipHash });
      return { ok: false, error: "Link de edição inválido ou expirado." };
    }
    await setOwnerCookie(parsed.data.slug, parsed.data.token, null);
    logSecurity("panel_opened", { slug: parsed.data.slug, ipHash });
    return { ok: true };
  } catch (err) {
    return failure(err, "action:open_panel");
  }
}

/** Mostra o link de edição só quando o dono pede (ele não vai no HTML do painel). */
export async function editLinkAction(slug: unknown): Promise<ActionResult<{ token: string }>> {
  return withOwner<{ token: string }>(slug, "edit_link", async (_id, s) => {
    const token = await ownerToken(s);
    return token ? { ok: true, token } : NOT_ALLOWED;
  });
}

export async function forgetDeviceAction(slug: unknown): Promise<ActionResult> {
  if (!isRevealSlug(slug)) return NOT_ALLOWED;
  await clearOwnerCookie(slug);
  refresh();
  return { ok: true };
}

/* ---------- Editar e apagar ---------- */

export async function saveRevealAction(slug: unknown, input: unknown): Promise<ActionResult> {
  return withOwner(slug, "save", async (id, s) => {
    const parsed = revealInputSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { expiresAt } = await updateReveal(id, parsed.data);
    // A validade pode ter mudado com a data prevista: o cookie acompanha.
    const token = await ownerToken(s);
    if (token) await setOwnerCookie(s, token, expiresAt);
    changed(s, { wall: true });
    return { ok: true };
  });
}

export async function deleteRevealAction(slug: unknown): Promise<ActionResult> {
  return withOwner(slug, "delete", async (id, s) => {
    await deleteReveal(id, s);
    await clearOwnerCookie(s);
    logSecurity("reveal_deleted", { slug: s });
    updateTag(revealTag(s));
    updateTag(wallTag(s));
    return { ok: true };
  });
}

export async function removeMessageAction(slug: unknown, messageId: unknown): Promise<ActionResult> {
  return withOwner(slug, "remove_message", async (id, s) => {
    const parsedId = z.uuid().safeParse(messageId);
    if (!parsedId.success) return { ok: false, error: "Recado inválido." };
    await deleteMessage(id, parsedId.data);
    changed(s, { wall: true });
    return { ok: true };
  });
}

/* ---------- Fotos e música (passam pelo servidor, nunca direto para o Storage) ---------- */

export async function uploadPhotoAction(slug: unknown, form: unknown): Promise<ActionResult<{ path: string; url: string }>> {
  return withOwner<{ path: string; url: string }>(slug, "upload_photo", async (id, s) => {
    if (!(await hitRateLimit("upload", s))) return TOO_MANY;
    try {
      const { data, file } = await processPhoto(await readUpload(form));
      const path = await addPhoto(id, s, data, file);
      changed(s);
      return { ok: true, path, url: mediaUrl(path)! };
    } catch (err) {
      if (err instanceof UploadRejected) logSecurity("upload_rejected", { slug: s, kind: "photo", reason: err.message });
      throw err;
    }
  });
}

export async function removePhotoAction(slug: unknown, path: unknown): Promise<ActionResult> {
  return withOwner(slug, "remove_photo", async (id, s) => {
    const parsed = photoPathSchema.safeParse(path);
    if (!parsed.success || !parsed.data.startsWith(`${s}/`)) return { ok: false, error: "Foto inválida." };
    await removePhoto(id, parsed.data);
    changed(s);
    return { ok: true };
  });
}

export async function reorderPhotosAction(slug: unknown, paths: unknown): Promise<ActionResult> {
  return withOwner(slug, "reorder_photos", async (id, s) => {
    const parsed = z.array(photoPathSchema).max(3).safeParse(paths);
    if (!parsed.success) return { ok: false, error: "Fotos inválidas." };
    await reorderPhotos(id, parsed.data);
    changed(s);
    return { ok: true };
  });
}

export async function setMusicAction(slug: unknown, form: unknown): Promise<ActionResult> {
  return withOwner<object>(slug, "set_music", async (id, s) => {
    if (!(await hitRateLimit("upload", s))) return TOO_MANY;
    try {
      const bytes = await readUpload(form);
      await setMusic(id, s, bytes, checkMusic(bytes));
      changed(s);
      return { ok: true };
    } catch (err) {
      if (err instanceof UploadRejected) logSecurity("upload_rejected", { slug: s, kind: "music", reason: err.message });
      throw err;
    }
  });
}

export async function removeMusicAction(slug: unknown): Promise<ActionResult> {
  return withOwner(slug, "remove_music", async (id, s) => {
    await removeMusic(id);
    changed(s);
    return { ok: true };
  });
}
