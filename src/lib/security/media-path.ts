/*
 * Caminhos de arquivo no Storage e as URLs públicas do site para eles.
 * O navegador só conhece /m/<slug>/<arquivo>; o caminho real é montado aqui, a partir de uma allowlist.
 */

/** Mesmo alfabeto de randomSlug (lib/reveal/ids.ts). */
const SLUG_RE = /^[2-9a-hjkmnp-z]{10}$/;
const FILE_RE = /^(photo|music)-[2-9a-hjkmnp-z]{8}\.(jpg|png|webp|mp3|m4a|aac|ogg|wav)$/;

export const MEDIA_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  wav: "audio/wav",
};

export function isRevealSlug(value: unknown): value is string {
  return typeof value === "string" && SLUG_RE.test(value);
}

export function parseMediaFile(file: string): { kind: "photo" | "music"; ext: string; mime: string } | null {
  const match = FILE_RE.exec(file);
  if (!match) return null;
  return { kind: match[1] as "photo" | "music", ext: match[2], mime: MEDIA_MIME[match[2]] };
}

/** Caminho no Storage a partir de slug + arquivo, ou null se qualquer parte for inválida (bloqueia path traversal). */
export function storagePath(slug: string, file: string) {
  return isRevealSlug(slug) && parseMediaFile(file) ? `${slug}/${file}` : null;
}

/** URL pública (no próprio site) para um caminho guardado no banco. */
export function mediaUrl(path: string) {
  const [slug, file] = path.split("/");
  return storagePath(slug ?? "", file ?? "") ? `/m/${slug}/${file}` : null;
}
