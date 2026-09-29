import "server-only";
import { cache } from "react";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { demoMemory, getDemoReveal, isDemoSlug, type RevealRecord } from "./demo";
import { assignGuestSlugs, hashSecret, randomSlug, randomToken, tokenMatches } from "./ids";
import { MAX_PHOTOS, type MediaKind, type RevealData } from "./schema";
import {
  MECHANICS,
  THEMES,
  type BabySex,
  type Dashboard,
  type Mechanic,
  type Score,
  type ThemeId,
  type WallMessage,
} from "./types";

export type { RevealRecord };

const BUCKET = "media";
/** Quantas revelações um mesmo IP pode criar por hora. */
const CREATE_LIMIT_PER_HOUR = 10;
/** Quantos recados um aparelho pode deixar numa revelação. */
const MESSAGES_PER_DEVICE = 5;

export class StoreError extends Error {}

export function isStoreConfigured() {
  return getSupabaseAdmin() !== null;
}

function db() {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new StoreError("O Supabase não está configurado.");
  return supabase;
}

function fail(error: { message: string } | null): asserts error is null {
  if (error) throw new StoreError(error.message);
}

/**
 * Em desenvolvimento, o navegador fala com o Storage através do próprio Next (rewrite em next.config.ts),
 * assim o celular na mesma rede só precisa alcançar a porta 3000. Em produção, vai direto no Supabase.
 */
export const DEV_STORAGE_PROXY = "/supabase-storage";

function browserUrl(url: string) {
  if (process.env.NODE_ENV !== "development" || !process.env.SUPABASE_URL) return url;
  return url.replace(`${process.env.SUPABASE_URL.replace(/\/$/, "")}/storage/v1`, DEV_STORAGE_PROXY);
}

function publicUrl(path: string | null) {
  return path ? browserUrl(db().storage.from(BUCKET).getPublicUrl(path).data.publicUrl) : undefined;
}

/** Os dados somem sozinhos: 4 meses depois da data prevista, ou 1 ano depois de criar. */
function expiryFor(dueDate: string | undefined) {
  const now = Date.now();
  const target = dueDate ? Date.parse(`${dueDate}T12:00:00Z`) + 120 * 86_400_000 : now + 365 * 86_400_000;
  return new Date(Math.max(target, now + 30 * 86_400_000)).toISOString();
}

/* ---------- Leitura pública ---------- */

interface RevealRow {
  id: string;
  slug: string;
  edit_token_hash: string;
  parents: string;
  mechanic: string;
  theme: string;
  message: string | null;
  photo_paths: string[];
  music_path: string | null;
  due_date: string | null;
  guess_enabled: boolean;
  reveal_at: string | null;
  expires_at: string;
  reveal_secrets: SecretRow | SecretRow[] | null;
  guests: { slug: string; name: string; becomes: string | null; position: number }[] | null;
}

interface SecretRow {
  sex: BabySex;
  baby_name: string | null;
}

const REVEAL_SELECT = "*, reveal_secrets(sex, baby_name), guests(slug, name, becomes, position)";

function toRecord(row: RevealRow): RevealRecord | null {
  if (Date.parse(row.expires_at) < Date.now()) return null;
  const secret = Array.isArray(row.reveal_secrets) ? row.reveal_secrets[0] : row.reveal_secrets;
  if (!secret) return null;
  return {
    id: row.id,
    reveal: {
      slug: row.slug,
      parents: row.parents,
      mechanic: (MECHANICS as readonly string[]).includes(row.mechanic) ? (row.mechanic as Mechanic) : "scratch",
      theme: (THEMES as readonly string[]).includes(row.theme) ? (row.theme as ThemeId) : "nuvem",
      message: row.message ?? undefined,
      photoUrls: (row.photo_paths ?? []).map((p) => publicUrl(p)).filter((u): u is string => Boolean(u)),
      musicUrl: publicUrl(row.music_path),
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

async function fetchRow(slug: string) {
  const { data, error } = await db().from("reveals").select(REVEAL_SELECT).eq("slug", slug).maybeSingle<RevealRow>();
  fail(error);
  return data;
}

/** Busca uma revelação pelo slug. O retorno inclui o segredo: nunca passe `secret` para um Client Component. */
export const findReveal = cache(async (slug: string): Promise<RevealRecord | null> => {
  const demo = getDemoReveal(slug);
  if (demo || isDemoSlug(slug) || !isStoreConfigured()) return demo;
  const row = await fetchRow(slug);
  return row ? toRecord(row) : null;
});

/* ---------- Palpites e mural (convidados) ---------- */

export async function addGuess(
  record: RevealRecord,
  input: { deviceId: string; guestSlug?: string; name?: string; guess: BabySex },
) {
  if (record.demo) return demoMemory.addGuess(record.reveal.slug, input.deviceId, input.guess);
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
  fail(error);
}

export async function getScore(record: RevealRecord): Promise<Score> {
  if (record.demo) return demoMemory.score(record.reveal.slug);
  const { data, error } = await db().from("guesses").select("guess").eq("reveal_id", record.id);
  fail(error);
  const score: Score = { boy: 0, girl: 0 };
  for (const row of data) score[row.guess as BabySex]++;
  return score;
}

export async function listMessages(record: RevealRecord): Promise<WallMessage[]> {
  if (record.demo) return demoMemory.messages(record.reveal.slug);
  const { data, error } = await db()
    .from("messages")
    .select("id, author, body, created_at")
    .eq("reveal_id", record.id)
    .order("created_at", { ascending: false })
    .limit(200);
  fail(error);
  return data.map((m) => ({ id: m.id, author: m.author, body: m.body, createdAt: m.created_at }));
}

export async function addMessage(record: RevealRecord, input: { deviceId: string; author: string; body: string }) {
  if (record.demo) return demoMemory.addMessage(record.reveal.slug, input.author, input.body);
  const supabase = db();
  const { count, error: countError } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("reveal_id", record.id)
    .eq("device_id", input.deviceId);
  fail(countError);
  if ((count ?? 0) >= MESSAGES_PER_DEVICE) throw new StoreError("Você já deixou bastante carinho por aqui 💛");
  const { error } = await supabase
    .from("messages")
    .insert({ reveal_id: record.id, device_id: input.deviceId, author: input.author, body: input.body });
  fail(error);
}

/* ---------- Dono (link secreto de edição) ---------- */

/** Retorna o id da revelação se o token bater, senão null. */
export async function authorize(slug: string, token: string): Promise<string | null> {
  if (!isStoreConfigured() || isDemoSlug(slug)) return null;
  const { data, error } = await db().from("reveals").select("id, edit_token_hash").eq("slug", slug).maybeSingle();
  fail(error);
  return data && tokenMatches(token, data.edit_token_hash) ? data.id : null;
}

function revealColumns(data: RevealData) {
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
  fail(secretError);

  const guests = assignGuestSlugs(data.guests);
  const keep = guests.map((g) => g.slug);
  const del = supabase.from("guests").delete().eq("reveal_id", revealId);
  const { error: delError } = keep.length ? await del.not("slug", "in", `(${keep.join(",")})`) : await del;
  fail(delError);

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
    fail(error);
  }
}

export async function createReveal(data: RevealData, ip: string | null) {
  const supabase = db();
  const ipHash = ip ? hashSecret(`revelation:${ip}`) : null;

  if (ipHash) {
    const since = new Date(Date.now() - 3_600_000).toISOString();
    const { count, error } = await supabase
      .from("reveals")
      .select("id", { count: "exact", head: true })
      .eq("creator_ip_hash", ipHash)
      .gte("created_at", since);
    fail(error);
    if ((count ?? 0) >= CREATE_LIMIT_PER_HOUR) {
      throw new StoreError("Muitas revelações criadas daqui na última hora. Tente de novo mais tarde.");
    }
  }

  const token = randomToken();
  const slug = randomSlug();
  const { data: row, error } = await supabase
    .from("reveals")
    .insert({ slug, edit_token_hash: hashSecret(token), creator_ip_hash: ipHash, ...revealColumns(data) })
    .select("id")
    .single();
  fail(error);

  try {
    await saveSecretAndGuests(row.id, data);
  } catch (err) {
    await supabase.from("reveals").delete().eq("id", row.id);
    throw err;
  }
  return { slug, token };
}

export async function updateReveal(id: string, data: RevealData) {
  const { error } = await db().from("reveals").update(revealColumns(data)).eq("id", id);
  fail(error);
  await saveSecretAndGuests(id, data);
}

export async function getDashboard(id: string): Promise<Dashboard> {
  const supabase = db();
  const { data: row, error } = await supabase.from("reveals").select(REVEAL_SELECT).eq("id", id).single<RevealRow>();
  fail(error);
  const record = toRecord(row);
  if (!record) throw new StoreError("Esta revelação expirou.");

  const [{ data: guesses, error: gErr }, messages] = await Promise.all([
    supabase.from("guesses").select("name, guest_slug, guess, created_at").eq("reveal_id", id).order("created_at"),
    listMessages(record),
  ]);
  fail(gErr);

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
    photos: (row.photo_paths ?? []).map((path) => ({ path, url: publicUrl(path) as string })),
    expiresAt: row.expires_at,
  };
}

export async function deleteMessage(revealId: string, messageId: string) {
  const { error } = await db().from("messages").delete().eq("reveal_id", revealId).eq("id", messageId);
  fail(error);
}

/* ---------- Arquivos ---------- */

async function removeFolder(slug: string) {
  const storage = db().storage.from(BUCKET);
  const { data } = await storage.list(slug, { limit: 100 });
  if (data?.length) await storage.remove(data.map((f) => `${slug}/${f.name}`));
}

export async function createUploadUrl(slug: string, kind: MediaKind, extension: string) {
  const path = `${slug}/${kind}-${randomSlug(8)}.${extension}`;
  const { data, error } = await db().storage.from(BUCKET).createSignedUploadUrl(path);
  fail(error);
  return { path, uploadUrl: browserUrl(data.signedUrl) };
}

/** Troca (ou remove, com `path` null) a música, apagando o arquivo antigo. */
export async function setMusic(id: string, slug: string, path: string | null) {
  if (path && !path.startsWith(`${slug}/music-`)) throw new StoreError("Arquivo inválido.");
  const supabase = db();
  const { data: current, error: readError } = await supabase.from("reveals").select("music_path").eq("id", id).single();
  fail(readError);
  const { error } = await supabase
    .from("reveals")
    .update({ music_path: path, updated_at: new Date().toISOString() })
    .eq("id", id);
  fail(error);
  if (current.music_path && current.music_path !== path) await supabase.storage.from(BUCKET).remove([current.music_path]);
}

/** Define a lista (e a ordem) das fotos. Arquivos que saíram da lista são apagados do Storage. */
export async function setPhotos(id: string, slug: string, paths: string[]) {
  if (paths.length > MAX_PHOTOS) throw new StoreError(`No máximo ${MAX_PHOTOS} fotos.`);
  if (paths.some((p) => !p.startsWith(`${slug}/photo-`)) || new Set(paths).size !== paths.length) {
    throw new StoreError("Arquivo inválido.");
  }
  const supabase = db();
  const { data: current, error: readError } = await supabase.from("reveals").select("photo_paths").eq("id", id).single();
  fail(readError);
  const { error } = await supabase
    .from("reveals")
    .update({ photo_paths: paths, updated_at: new Date().toISOString() })
    .eq("id", id);
  fail(error);
  const removed = (current.photo_paths as string[]).filter((p) => !paths.includes(p));
  if (removed.length) await supabase.storage.from(BUCKET).remove(removed);
}

/* ---------- Exclusão ---------- */

export async function deleteReveal(id: string, slug: string) {
  await removeFolder(slug);
  const { error } = await db().from("reveals").delete().eq("id", id);
  fail(error);
}

/** Roda pelo cron diário: apaga revelações vencidas e os arquivos delas. */
export async function cleanupExpired() {
  const { data, error } = await db()
    .from("reveals")
    .select("id, slug")
    .lt("expires_at", new Date().toISOString())
    .limit(200);
  fail(error);
  for (const row of data) await deleteReveal(row.id, row.slug);
  return data.length;
}
