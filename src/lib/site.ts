/**
 * Aceita URL com ou sem protocolo ("meusite.com.br" vira "https://meusite.com.br").
 * Vazio ou inválido vira undefined, para cair no valor padrão em vez de quebrar o build.
 */
export function absoluteUrl(value: string | undefined) {
  const raw = value?.trim().replace(/\/+$/, "");
  if (!raw) return undefined;
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withProtocol).toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

/** Configurações públicas do site (todas opcionais). */
export const site = {
  name: "Revelação",
  /** URL pública, usada nas imagens de prévia. Na Vercel cai no domínio de produção automaticamente. */
  url:
    absoluteUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
    absoluteUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    "http://localhost:3000",
  /** Link do repositório no GitHub, mostrado no rodapé. */
  repoUrl: absoluteUrl(process.env.NEXT_PUBLIC_REPO_URL),
  /** E-mail para denúncias e pedidos de exclusão. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || undefined,
  /** Quem mantém o projeto, mostrado no rodapé. */
  author: process.env.NEXT_PUBLIC_AUTHOR_NAME?.trim() || undefined,
  authorUrl: absoluteUrl(process.env.NEXT_PUBLIC_AUTHOR_URL),
};
