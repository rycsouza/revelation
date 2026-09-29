import "server-only";
import { cookies } from "next/headers";
import { isRevealSlug } from "@/lib/security/media-path";
import { authorizeOwner } from "@/lib/reveal/store";

/*
 * Sessão do dono: o token de edição fica num cookie HttpOnly por revelação.
 * - HttpOnly: JavaScript da página não lê (um XSS não rouba o token).
 * - SameSite=Lax: não vai em POST vindo de outro site (proteção de CSRF, junto com a checagem de Origin das server actions).
 * - Secure em produção: só trafega por HTTPS.
 */

const PREFIX = "rv_owner_";
const MAX_AGE_SECONDS = 400 * 86_400; // teto dos navegadores

export function ownerCookieName(slug: string) {
  return `${PREFIX}${slug}`;
}

export function ownerCookieOptions(expiresAt: string | null, now = Date.now(), production = process.env.NODE_ENV === "production") {
  const untilExpiry = expiresAt ? Math.floor((Date.parse(expiresAt) - now) / 1000) : MAX_AGE_SECONDS;
  return {
    httpOnly: true,
    secure: production,
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.max(60, Math.min(untilExpiry, MAX_AGE_SECONDS)),
  };
}

export async function setOwnerCookie(slug: string, token: string, expiresAt: string | null) {
  (await cookies()).set(ownerCookieName(slug), token, ownerCookieOptions(expiresAt));
}

export async function clearOwnerCookie(slug: string) {
  (await cookies()).delete(ownerCookieName(slug));
}

export async function ownerToken(slug: string) {
  if (!isRevealSlug(slug)) return null;
  return (await cookies()).get(ownerCookieName(slug))?.value ?? null;
}

/** Todas as revelações com cookie de dono neste navegador (ainda não conferidas no banco). */
export async function ownerEntries() {
  return (await cookies())
    .getAll()
    .filter((c) => c.name.startsWith(PREFIX))
    .map((c) => ({ slug: c.name.slice(PREFIX.length), token: c.value }))
    .filter((e) => isRevealSlug(e.slug) && e.token.length > 0 && e.token.length <= 64)
    .slice(0, 50);
}

/** Id da revelação se este navegador for o dono dela, senão null. */
export async function currentOwnerId(slug: string) {
  const token = await ownerToken(slug);
  return token ? authorizeOwner(slug, token) : null;
}
