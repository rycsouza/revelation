import { describe, expect, it } from "vitest";
import { CACHE_TIMES, readCache, writeCache } from "@/lib/client/cache";
import { parseServerEnv } from "@/lib/env";
import { ownerCookieOptions } from "@/lib/owner-session";
import { safeEqual } from "@/lib/reveal/ids";

describe("variáveis de ambiente", () => {
  const key = "x".repeat(40);

  it("aceita a configuração correta", () => {
    const env = parseServerEnv({ SUPABASE_URL: "https://abc.supabase.co", SUPABASE_SERVICE_ROLE_KEY: key, CRON_SECRET: "c".repeat(32) }, true);
    expect(env.supabase?.url).toBe("https://abc.supabase.co");
    expect(env.problems).toEqual([]);
  });

  it("recusa URL com caminho, http em produção e segredo curto", () => {
    expect(parseServerEnv({ SUPABASE_URL: "https://abc.supabase.co/rest/v1", SUPABASE_SERVICE_ROLE_KEY: key }, true).supabase).toBeNull();
    expect(parseServerEnv({ SUPABASE_URL: "http://abc.supabase.co", SUPABASE_SERVICE_ROLE_KEY: key }, true).supabase).toBeNull();
    expect(parseServerEnv({ CRON_SECRET: "curto" }, true).cronSecret).toBeNull();
  });

  it("nunca coloca os valores nas mensagens de problema", () => {
    const { problems } = parseServerEnv({ SUPABASE_URL: "https://abc.supabase.co/rest/v1", SUPABASE_SERVICE_ROLE_KEY: "segredo-super-secreto-123", CRON_SECRET: "x" }, true);
    expect(problems.join(" ")).not.toContain("segredo-super-secreto");
  });
});

describe("cookie de dono", () => {
  it("é HttpOnly, SameSite=Lax e Secure em produção", () => {
    const opts = ownerCookieOptions(null, Date.now(), true);
    expect(opts).toMatchObject({ httpOnly: true, sameSite: "lax", secure: true, path: "/" });
    expect(ownerCookieOptions(null, Date.now(), false).secure).toBe(false);
  });

  it("vence junto com a revelação e respeita o teto dos navegadores", () => {
    const now = Date.now();
    expect(ownerCookieOptions(new Date(now + 3_600_000).toISOString(), now, true).maxAge).toBe(3600);
    expect(ownerCookieOptions(new Date(now + 1000 * 86_400_000).toISOString(), now, true).maxAge).toBe(400 * 86_400);
  });
});

describe("comparação de segredo", () => {
  it("compara em tempo constante e sem aceitar prefixo", () => {
    expect(safeEqual("Bearer abc", "Bearer abc")).toBe(true);
    expect(safeEqual("Bearer ab", "Bearer abc")).toBe(false);
    expect(safeEqual("", "Bearer abc")).toBe(false);
  });
});

describe("cache do navegador", () => {
  it("devolve fresco, depois velho (para revalidar) e depois descarta", () => {
    const t = 1_000_000;
    writeCache("wall:teste", { n: 1 }, t);
    expect(readCache("wall:teste", CACHE_TIMES.wall, t + 1000)).toEqual({ value: { n: 1 }, fresh: true });
    expect(readCache("wall:teste", CACHE_TIMES.wall, t + 60_000)?.fresh).toBe(false);
    expect(readCache("wall:teste", CACHE_TIMES.wall, t + 11 * 60_000)).toBeNull();
  });
});
