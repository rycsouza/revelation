/** Configurações públicas do site (todas opcionais). */
export const site = {
  name: "Revelação",
  /** URL pública, usada nas imagens de prévia. Na Vercel cai no domínio de produção automaticamente. */
  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  /** Link do repositório no GitHub, mostrado no rodapé. */
  repoUrl: process.env.NEXT_PUBLIC_REPO_URL,
  /** E-mail para denúncias e pedidos de exclusão. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
  /** Quem mantém o projeto, mostrado no rodapé. */
  author: process.env.NEXT_PUBLIC_AUTHOR_NAME,
  authorUrl: process.env.NEXT_PUBLIC_AUTHOR_URL,
};
