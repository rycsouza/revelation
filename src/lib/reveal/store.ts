import "server-only";
import { serverEnv } from "@/lib/env";
import { logError } from "@/lib/security/log";
import { mediaUrl, storagePath } from "@/lib/security/media-path";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { DetectedFile } from "@/lib/security/file-signature";
import { assignGuestSlugs, hashSecret, randomSlug, randomToken, tokenMatches } from "./ids";
import { MAX_PHOTOS, type RevealData } from "./schema";
import {
  MECHANICS,
  THEMES,
  type BabySex,
  type Dashboard,
  type Guest,
  type Mechanic,
  type PublicReveal,
  type RevealSecret,
  type Score,
  type ThemeId,
  type WallMessage,
} from "./types";

/*
 * Acesso ao banco e ao Storage. Só o servidor chama isto (service role).
 * Regras: colunas explícitas (nada de select *), toda escrita do dono recebe o `id` já autorizado,
 * e erros do banco nunca chegam ao usuário (StoreError é só para mensagens pensadas para ele).
 */

const BUCKET = "media";
/** Quantos recados um aparelho pode deixar numa revelação. */
const MESSAGES_PER_DEVICE = 5;
/** Quantos recados o mural mostra. */
const WALL_LIMIT = 100;

/** Erro com mensagem segura para mostrar ao usuário. */
export class StoreError extends Error {}

export interface RevealRecord {
  id: string;
  slug: string;
  reveal: PublicReveal;
  guests: Guest[];
  secret: RevealSecret;
  photoPaths: string[];
  musicPath: string | null;
  /** null nas demos. */
  expiresAt: string | null;
  demo?: boolean;
}

export interface Wall {
  /** null quando a revelação não pede palpite. */
  score: Score | null;
  messages: WallMessage[];
}

export function isStoreConfigured() {
  return getSupabaseAdmin() !== null;
}

function db() {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new StoreError("A criação está desligada no momento.");
  return supabase;
}

/** Erro do banco: registra o detalhe e devolve uma mensagem genérica. */
function fail(error: { message: string; code?: string } | null, context: string): asserts error is null {
  if (!error) return;
  logError(`db:${context}`, error);
  throw new StoreError("Não foi possível concluir agora. Tente de novo em instantes.");
}

/** Os dados somem sozinhos: 4 meses depois da data prevista, ou 1 ano depois de criar. */
export function expiryFor(dueDate: string | undefined, now = Date.now()) {
  const target = dueDate ? Date.parse(`${dueDate}T12:00:00Z`) + 120 * 86_400_000 : now + 365 * 86_400_000;
  return new Date(Math.max(target, now + 30 * 86_400_000)).toISOString();
}

/* ---------- Leitura pública ---------- */

interface SecretRow {
  sex: BabySex;
  baby_name: string | null;
}

interface RevealRow {
  id: string;
  slug: string;
  parents: string;
  mechanic: string;
  theme: string;
  message: string | null;
  photo_paths: string[] | null;
  music_path: string | null;
  due_date: string | null;
  guess_enabled: boolean;
  reveal_at: string | null;
  expires_at: string;
  reveal_secrets: SecretRow | SecretRow[] | null;
  guests: { slug: string; name: string; becomes: string | null; position: number }[] | null;
}

const REVEAL_COLUMNS =
  "id, slug, parents, mechanic, theme, message, photo_paths, music_path, due_date, guess_enabled, reveal_at, expires_at, reveal_secrets(sex, baby_name), guests(slug, name, becomes, position)";

function toRecord(row: RevealRow): RevealRecord | null {
  if (Date.parse(row.expires_at) < Date.now()) return null;
  const secret = Array.isArray(row.reveal_secrets) ? row.reveal_secrets[0] : row.reveal_secrets;
  if (!secret) return null;
  const photoPaths = row.photo_paths ?? [];
  return {
    id: row.id,
    slug: row.slug,
    photoPaths,
    musicPath: row.music_path,
    expiresAt: row.expires_at,
    reveal: {
      slug: row.slug,
      parents: row.parents,
      mechanic: (MECHANICS as readonly string[]).includes(row.mechanic) ? (row.mechanic as Mechanic) : "scratch",
      theme: (THEMES as readonly string[]).includes(row.theme) ? (row.theme as ThemeId) : "nuvem",
      message: row.message ?? undefined,
      // URLs do próprio site: o navegador nunca recebe endereço do Supabase.
      photoUrls: photoPaths.map(mediaUrl).filter((u): u is string => Boolean(u)),
      musicUrl: (row.music_path && mediaUrl(row.music_path)) || undefined,
      dueDate: row.due_date ?? undefined,
      guessEnabled: row.guess_enabled,
      revealAt: row.reveal_at ?? undefined,
    },
    guests: (row.guests ?? [])
      .toSorted((a, b) => a.position - b.position)
      .map((g) => ({ slug: g.slug, name: g.name, becomes: g.becomes ?? undefined })),
    secret: { sex: secret.sex, babyName: secret.baby_name ?? undefined },
  };
}

export async function fetchReveal(slug: string): Promise<RevealRecord | null> {
  const { data, error } = await db().from("reveals").select(REVEAL_COLUMNS).eq("slug", slug).maybeSingle<RevealRow>();
  fail(error, "fetch_reveal");
  return data ? toRecord(data) : null;
}

async function countGuesses(revealId: string, guess: BabySex) {
  const { count, error } = await db()
    .from("guesses")
    .select("id", { count: "exact", head: true })
    .eq("reveal_id", revealId)
    .eq("guess", guess);
  fail(error, "count_guesses");
  return count ?? 0;
}

async function listMessages(revealId: string): Promise<WallMessage[]> {
  const { data, error } = await db()
    .from("messages")
    .select("id, author, body, created_at")
    .eq("reveal_id", revealId)
    .order("created_at", { ascending: false })
    .limit(WALL_LIMIT);
  fail(error, "list_messages");
  return data.map((m) => ({ id: m.id, author: m.author, body: m.body, createdAt: m.created_at }));
}

export async function fetchWall(revealId: string, guessEnabled: boolean): Promise<Wall> {
  const [boy, girl, messages] = await Promise.all([
    guessEnabled ? countGuesses(revealId, "boy") : 0,
    guessEnabled ? countGuesses(revealId, "girl") : 0,
    listMessages(revealId),
  ]);
  return { score: guessEnabled ? { boy, girl } : null, messages };
}

/* ---------- Convidados ---------- */

export async function insertGuess(
  record: RevealRecord,
  input: { deviceId: string; guestSlug?: string; name?: string; guess: BabySex },
) {
  // O nome vem da lista do dono quando o link é personalizado; o cliente não escolhe em nome de quem palpita.
  const guest = record.guests.find((g) => g.slug === input.guestSlug);
  const { error } = await db()
    .from("guesses")
    .upsert(
      {
        reveal_id: record.id,
        device_id: input.deviceId,
        guest_slug: guest?.slug ?? null,
        name: guest?.name ?? input.name ?? null,
        guess: input.guess,
      },
      { onConflict: "reveal_id,device_id", ignoreDuplicates: true },
    );
  fail(error, "insert_guess");
}

export async function insertMessage(record: RevealRecord, input: { deviceId: string; author: string; body: string }) {
  const supabase = db();
  const { count, error: countError } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("reveal_id", record.id)
    .eq("device_id", input.deviceId);
  fail(countError, "count_messages");
  if ((count ?? 0) >= MESSAGES_PER_DEVICE) throw new StoreError("Você já deixou bastante carinho por aqui 💛");
  const { error } = await supabase
    .from("messages")
    .insert({ reveal_id: record.id, device_id: input.deviceId, author: input.author, body: input.body });
  fail(error, "insert_message");
}

/* ---------- Dono ---------- */

/** Retorna o id da revelação se o token bater, senão null (mesma resposta para slug inexistente e token errado). */
export async function authorizeOwner(slug: string, token: string): Promise<string | null> {
  if (!isStoreConfigured()) return null;
  const { data, error } = await db().from("reveals").select("id, edit_token_hash").eq("slug", slug).maybeSingle();
  fail(error, "authorize");
  return data && tokenMatches(token, data.edit_token_hash) ? data.id : null;
}

/** Revelações deste aparelho (cookies de dono). Só devolve as que o token realmente abre. */
export async function listOwned(entries: { slug: string; token: string }[]) {
  if (!entries.length || !isStoreConfigured()) return [];
  const { data, error } = await db()
    .from("reveals")
    .select("slug, parents, created_at, edit_token_hash, expires_at")
    .in("slug", entries.map((e) => e.slug))
    .limit(50);
  fail(error, "list_owned");
  const now = Date.now();
  return data
    .filter((row) => {
      const entry = entries.find((e) => e.slug === row.slug);
      return entry && tokenMatches(entry.token, row.edit_token_hash) && Date.parse(row.expires_at) > now;
    })
    .map((row) => ({ slug: row.slug as string, parents: row.parents as string, createdAt: row.created_at as string }))
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function revealColumns(data: RevealData) {
  // Allowlist explícita: nada de repassar o objeto do cliente para o banco.
  return {
    parents: data.parents,
    mechanic: data.mechanic,
    theme: data.theme,
    message: data.message ?? null,
    due_date: data.dueDate ?? null,
    guess_enabled: data.guessEnabled,
    reveal_at: data.revealAt ?? null,
    expires_at: expiryFor(data.dueDate),
    updated_at: new Date().toISOString(),
  };
}

async function saveSecretAndGuests(revealId: string, data: RevealData) {
  const supabase = db();
  const { error: secretError } = await supabase
    .from("reveal_secrets")
    .upsert({ reveal_id: revealId, sex: data.sex, baby_name: data.babyName ?? null });
  fail(secretError, "save_secret");

  const guests = assignGuestSlugs(data.guests);
  const keep = guests.map((g) => g.slug);
  const del = supabase.from("guests").delete().eq("reveal_id", revealId);
  // Os slugs já passaram pelo schema (/^[a-z0-9-]+$/), então a lista não tem como injetar nada no filtro.
  const { error: delError } = keep.length ? await del.not("slug", "in", `(${keep.join(",")})`) : await del;
  fail(delError, "delete_guests");

  if (guests.length) {
    const { error } = await supabase.from("guests").upsert(
      guests.map((g, position) => ({
        reveal_id: revealId,
        slug: g.slug,
        name: g.name,
        becomes: g.becomes ?? null,
        position,
      })),
      { onConflict: "reveal_id,slug" },
    );
    fail(error, "save_guests");
  }
}

export async function createReveal(data: RevealData) {
  const supabase = db();
  const token = randomToken();
  const slug = randomSlug();
  const columns = revealColumns(data);
  const { data: row, error } = await supabase
    .from("reveals")
    .insert({ slug, edit_token_hash: hashSecret(token), ...columns })
    .select("id")
    .single();
  fail(error, "create_reveal");

  try {
    await saveSecretAndGuests(row.id, data);
  } catch (err) {
    await supabase.from("reveals").delete().eq("id", row.id);
    throw err;
  }
  return { id: row.id as string, slug, token, expiresAt: columns.expires_at };
}

export async function updateReveal(id: string, data: RevealData) {
  const columns = revealColumns(data);
  const { error } = await db().from("reveals").update(columns).eq("id", id);
  fail(error, "update_reveal");
  await saveSecretAndGuests(id, data);
  return { expiresAt: columns.expires_at };
}

export async function fetchDashboard(id: string): Promise<Dashboard | null> {
  const supabase = db();
  const { data: row, error } = await supabase.from("reveals").select(REVEAL_COLUMNS).eq("id", id).maybeSingle<RevealRow>();
  fail(error, "fetch_dashboard");
  const record = row && toRecord(row);
  if (!record) return null;

  const [{ data: guesses, error: gErr }, messages] = await Promise.all([
    supabase
      .from("guesses")
      .select("name, guest_slug, guess, created_at")
      .eq("reveal_id", id)
      .order("created_at")
      .limit(500),
    listMessages(id),
  ]);
  fail(gErr, "dashboard_guesses");

  return {
    reveal: record.reveal,
    secret: record.secret,
    guests: record.guests,
    guesses: guesses.map((g) => ({
      name: g.name ?? undefined,
      guestSlug: g.guest_slug ?? undefined,
      guess: g.guess as BabySex,
      createdAt: g.created_at,
    })),
    messages,
    photos: record.photoPaths.flatMap((path) => {
      const url = mediaUrl(path);
      return url ? [{ path, url }] : [];
    }),
    expiresAt: row.expires_at,
  };
}

export async function deleteMessage(revealId: string, messageId: string) {
  // Escopo pelo id da revelação autorizada: não dá para apagar recado de outra revelação trocando o id.
  const { error } = await db().from("messages").delete().eq("reveal_id", revealId).eq("id", messageId);
  fail(error, "delete_message");
}

/* ---------- Arquivos ---------- */

async function currentMedia(id: string) {
  const { data, error } = await db().from("reveals").select("photo_paths, music_path").eq("id", id).single();
  fail(error, "current_media");
  return { photos: (data.photo_paths ?? []) as string[], music: data.music_path as string | null };
}

async function uploadObject(slug: string, kind: "photo" | "music", data: Buffer | Uint8Array, file: DetectedFile) {
  // Nome gerado no servidor; o nome original do arquivo nunca é usado.
  const path = `${slug}/${kind}-${randomSlug(8)}.${file.ext}`;
  const { error } = await db()
    .storage.from(BUCKET)
    .upload(path, data, { contentType: file.mime, upsert: false, cacheControl: "31536000" });
  fail(error, "upload_object");
  return path;
}

async function removeObjects(paths: string[]) {
  if (!paths.length) return;
  const { error } = await db().storage.from(BUCKET).remove(paths);
  if (error) logError("db:remove_objects", error);
}

export async function addPhoto(id: string, slug: string, data: Buffer, file: DetectedFile) {
  const { photos } = await currentMedia(id);
  if (photos.length >= MAX_PHOTOS) throw new StoreError(`No máximo ${MAX_PHOTOS} fotos.`);
  const path = await uploadObject(slug, "photo", data, file);
  // O banco também barra mais de 3 (check constraint), então duas abas ao mesmo tempo não passam do limite.
  const { error } = await db()
    .from("reveals")
    .update({ photo_paths: [...photos, path], updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    await removeObjects([path]);
    fail(error, "add_photo");
  }
  return path;
}

export async function removePhoto(id: string, path: string) {
  const { photos } = await currentMedia(id);
  if (!photos.includes(path)) throw new StoreError("Essa foto não é desta revelação.");
  const { error } = await db()
    .from("reveals")
    .update({ photo_paths: photos.filter((p) => p !== path), updated_at: new Date().toISOString() })
    .eq("id", id);
  fail(error, "remove_photo");
  await removeObjects([path]);
}

export async function reorderPhotos(id: string, paths: string[]) {
  const { photos } = await currentMedia(id);
  const same = paths.length === photos.length && new Set(paths).size === paths.length && paths.every((p) => photos.includes(p));
  if (!same) throw new StoreError("Lista de fotos inválida.");
  const { error } = await db()
    .from("reveals")
    .update({ photo_paths: paths, updated_at: new Date().toISOString() })
    .eq("id", id);
  fail(error, "reorder_photos");
}

export async function setMusic(id: string, slug: string, data: Uint8Array, file: DetectedFile) {
  const { music } = await currentMedia(id);
  const path = await uploadObject(slug, "music", data, file);
  const { error } = await db()
    .from("reveals")
    .update({ music_path: path, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    await removeObjects([path]);
    fail(error, "set_music");
  }
  if (music) await removeObjects([music]);
  return path;
}

export async function removeMusic(id: string) {
  const { music } = await currentMedia(id);
  const { error } = await db()
    .from("reveals")
    .update({ music_path: null, updated_at: new Date().toISOString() })
    .eq("id", id);
  fail(error, "remove_music");
  if (music) await removeObjects([music]);
}

/**
 * Busca um arquivo no Storage privado, no servidor, repassando o Range (o Safari exige para tocar áudio).
 * O caminho é remontado a partir da allowlist; a URL de destino é fixa (nada de URL vinda do cliente).
 */
export async function fetchMediaObject(slug: string, file: string, range: string | null) {
  const env = serverEnv().supabase;
  const path = storagePath(slug, file);
  if (!env || !path) return null;
  const safeRange = range && /^bytes=\d{0,12}-\d{0,12}$/.test(range) ? range : null;
  const res = await fetch(`${env.url}/storage/v1/object/authenticated/${BUCKET}/${path}`, {
    headers: {
      Authorization: `Bearer ${env.serviceRoleKey}`,
      apikey: env.serviceRoleKey,
      ...(safeRange ? { Range: safeRange } : {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok && res.status !== 206) {
    if (res.status !== 404 && res.status !== 400) logError("storage:fetch_media", { message: `status ${res.status}` });
    return null;
  }
  return res;
}

/* ---------- Exclusão ---------- */

async function removeFolder(slug: string) {
  const { data, error } = await db().storage.from(BUCKET).list(slug, { limit: 100 });
  if (error) logError("db:list_folder", error);
  if (data?.length) await removeObjects(data.map((f) => `${slug}/${f.name}`));
}

export async function deleteReveal(id: string, slug: string) {
  await removeFolder(slug);
  const { error } = await db().from("reveals").delete().eq("id", id);
  fail(error, "delete_reveal");
}

/** Roda pelo cron diário: apaga revelações vencidas (com os arquivos) e contadores de limite antigos. */
export async function cleanupExpired() {
  const supabase = db();
  const { data, error } = await supabase
    .from("reveals")
    .select("id, slug")
    .lt("expires_at", new Date().toISOString())
    .limit(200);
  fail(error, "cleanup_select");
  for (const row of data) await deleteReveal(row.id, row.slug);

  const { error: rlError } = await supabase
    .from("rate_limits")
    .delete()
    .lt("window_start", new Date(Date.now() - 86_400_000).toISOString());
  if (rlError) logError("db:cleanup_rate_limits", rlError);

  return data.map((row) => row.slug as string);
}
