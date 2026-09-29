import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Sem caracteres ambíguos (0/o, 1/l/i): o link pode ser ditado por telefone.
const SLUG_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

/** Slug público da revelação: 10 caracteres ≈ 50 bits, impossível de adivinhar. */
export function randomSlug(length = 10) {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += SLUG_ALPHABET[bytes[i] % SLUG_ALPHABET.length];
  return out;
}

/** Token do link secreto de edição. Só o hash vai para o banco. */
export function randomToken() {
  return randomBytes(24).toString("base64url");
}

export function hashSecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

/** HMAC com chave secreta: diferente de um hash simples, não dá para reverter por força bruta (ex.: todos os IPv4). */
export function hmacHex(key: string, value: string) {
  return createHmac("sha256", key).update(value).digest("hex");
}

/** Compara dois textos em tempo constante (segredos vindos do cliente). */
export function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function tokenMatches(token: string, hash: string) {
  const a = Buffer.from(hashSecret(token), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** "Vovó Maria" → "vovo-maria" */
export function slugify(text: string) {
  const slug = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return slug || "convidado";
}

/**
 * Garante slugs únicos para a lista de convidados. Quem já tinha slug mantém
 * (o link já pode ter sido enviado); os novos ganham um a partir do nome.
 */
export function assignGuestSlugs<T extends { name: string; slug?: string }>(guests: T[]): (T & { slug: string })[] {
  const used = new Set(guests.map((g) => g.slug).filter((s): s is string => Boolean(s)));
  return guests.map((g) => {
    if (g.slug) return { ...g, slug: g.slug };
    const base = slugify(g.name);
    let slug = base;
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
    used.add(slug);
    return { ...g, slug };
  });
}
