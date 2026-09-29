/**
 * Testes contra o Supabase LOCAL (npm run db:start). Rodam com: npm run test:db
 * Cobrem autorização do dono, isolamento entre revelações (IDOR), limites e o que a chave pública enxerga.
 */
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.loadEnvFile?.(".env.local");

const { hitRateLimit } = await import("@/lib/security/rate-limit");
const store = await import("./store");

// Chave pública padrão do Supabase local (a mesma para todo mundo; não é segredo).
const LOCAL_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

if (!process.env.SUPABASE_URL?.includes("127.0.0.1") && !process.env.SUPABASE_URL?.includes("localhost")) {
  throw new Error("test:db só roda contra o Supabase local (SUPABASE_URL em 127.0.0.1/localhost).");
}

const input = (parents: string) => ({
  parents,
  sex: "girl" as const,
  mechanic: "scratch" as const,
  theme: "nuvem" as const,
  guessEnabled: true,
  guests: [{ name: "Vovó Teste", becomes: "vovó" }],
});

async function jpeg() {
  const data = await sharp({ create: { width: 40, height: 30, channels: 3, background: "#999" } }).jpeg().toBuffer();
  return { data, file: { mime: "image/jpeg", ext: "jpg" } };
}

let a: Awaited<ReturnType<typeof store.createReveal>>;
let b: Awaited<ReturnType<typeof store.createReveal>>;
let bPhoto: string;

beforeAll(async () => {
  a = await store.createReveal(input("Teste A") as never);
  b = await store.createReveal(input("Teste B") as never);
  const photo = await jpeg();
  bPhoto = await store.addPhoto(b.id, b.slug, photo.data, photo.file);
});

afterAll(async () => {
  await store.deleteReveal(a.id, a.slug);
  await store.deleteReveal(b.id, b.slug);
});

describe("autorização do dono", () => {
  it("token certo abre; token de outra revelação ou inventado não", async () => {
    expect(await store.authorizeOwner(a.slug, a.token)).toBe(a.id);
    expect(await store.authorizeOwner(a.slug, b.token)).toBeNull();
    expect(await store.authorizeOwner(a.slug, "x".repeat(32))).toBeNull();
    expect(await store.authorizeOwner("naoexiste2", a.token)).toBeNull();
  });

  it("'Minhas' só lista o que o token realmente abre", async () => {
    const list = await store.listOwned([
      { slug: a.slug, token: a.token },
      { slug: b.slug, token: a.token }, // token trocado
    ]);
    expect(list.map((r) => r.slug)).toEqual([a.slug]);
  });
});

describe("isolamento entre revelações (IDOR)", () => {
  it("dono de A não apaga recado de B", async () => {
    const recordB = (await store.fetchReveal(b.slug))!;
    await store.insertMessage(recordB, { deviceId: "d".repeat(32), author: "Tia", body: "Parabéns!" });
    const [message] = (await store.fetchWall(b.id, true)).messages;
    await store.deleteMessage(a.id, message.id);
    expect((await store.fetchWall(b.id, true)).messages.map((m) => m.id)).toContain(message.id);
  });

  it("dono de A não remove nem reordena foto de B", async () => {
    await expect(store.removePhoto(a.id, bPhoto)).rejects.toBeInstanceOf(store.StoreError);
    await expect(store.reorderPhotos(a.id, [bPhoto])).rejects.toBeInstanceOf(store.StoreError);
    expect((await store.fetchReveal(b.slug))!.photoPaths).toEqual([bPhoto]);
  });

  it("painel de A não traz nada de B", async () => {
    const dash = (await store.fetchDashboard(a.id))!;
    expect(dash.reveal.slug).toBe(a.slug);
    expect(dash.messages).toEqual([]);
    expect(dash.photos).toEqual([]);
  });
});

describe("limites", () => {
  it("no máximo 3 fotos", async () => {
    for (let i = 0; i < 3; i++) {
      const p = await jpeg();
      await store.addPhoto(a.id, a.slug, p.data, p.file);
    }
    const p = await jpeg();
    await expect(store.addPhoto(a.id, a.slug, p.data, p.file)).rejects.toThrow("No máximo 3");
  });

  it("um palpite por aparelho (o primeiro vale)", async () => {
    const recordA = (await store.fetchReveal(a.slug))!;
    await store.insertGuess(recordA, { deviceId: "e".repeat(32), guess: "boy" });
    await store.insertGuess(recordA, { deviceId: "e".repeat(32), guess: "girl" });
    expect((await store.fetchWall(a.id, true)).score).toEqual({ boy: 1, girl: 0 });
  });

  it("rate limit bloqueia depois do limite", async () => {
    const ip = `teste-${Date.now()}`;
    const results = [];
    for (let i = 0; i < 21; i++) results.push(await hitRateLimit("panel", ip));
    expect(results.slice(0, 20).every(Boolean)).toBe(true);
    expect(results[20]).toBe(false);
  });
});

describe("o que a chave pública (anon) enxerga", () => {
  const anon = createClient(process.env.SUPABASE_URL!, LOCAL_ANON_KEY, { auth: { persistSession: false } });

  it("nenhuma tabela", async () => {
    for (const table of ["reveals", "reveal_secrets", "guests", "guesses", "messages", "rate_limits"]) {
      const { data, error } = await anon.from(table).select("*").limit(1);
      expect(error !== null || (data ?? []).length === 0).toBe(true);
    }
  });

  it("não escreve nem chama a função de limite", async () => {
    const { error } = await anon.from("messages").insert({ reveal_id: a.id, device_id: "x", author: "x", body: "x" });
    expect(error).not.toBeNull();
    const rpc = await anon.rpc("hit_rate_limit", { p_key: "x", p_limit: 1, p_window_seconds: 1 });
    expect(rpc.error).not.toBeNull();
  });

  it("não baixa arquivo do bucket privado", async () => {
    const { data } = await anon.storage.from("media").download(bPhoto);
    expect(data).toBeNull();
    const res = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/public/media/${bPhoto}`);
    expect(res.ok).toBe(false);
  });
});

describe("arquivos pelo servidor", () => {
  it("entrega arquivo ligado à revelação, com Range", async () => {
    const [slug, file] = bPhoto.split("/");
    const full = await store.fetchMediaObject(slug, file, null);
    expect(full?.status).toBe(200);
    const partial = await store.fetchMediaObject(slug, file, "bytes=0-9");
    expect(partial?.status).toBe(206);
    expect(await store.fetchMediaObject(slug, "../../etc/passwd", null)).toBeNull();
  });

  it("apagar a revelação apaga os arquivos", async () => {
    const tmp = await store.createReveal(input("Temporária") as never);
    const p = await jpeg();
    const path = await store.addPhoto(tmp.id, tmp.slug, p.data, p.file);
    await store.deleteReveal(tmp.id, tmp.slug);
    const [slug, file] = path.split("/");
    expect(await store.fetchMediaObject(slug, file, null)).toBeNull();
    expect(await store.fetchReveal(tmp.slug)).toBeNull();
  });
});
