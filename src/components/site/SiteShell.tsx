import Link from "next/link";
import { ThemeBackdrop } from "@/components/theme/ThemeBackdrop";
import { site } from "@/lib/site";

export function SiteShell({ children, narrow = false }: { children: React.ReactNode; narrow?: boolean }) {
  return (
    <div data-theme="nuvem" className="theme-bg relative isolate flex min-h-dvh flex-col">
      <ThemeBackdrop theme="nuvem" fixed />
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold">
          <span aria-hidden>💌</span> {site.name}
        </Link>
        <nav className="flex items-center gap-1 text-sm font-semibold sm:gap-3">
          <Link href="/minhas" className="rounded-full px-3 py-2 hover:bg-black/5">
            Minhas
          </Link>
          <Link href="/criar" className="rounded-full bg-accent px-4 py-2 text-accent-fg shadow-sm">
            Criar
          </Link>
        </nav>
      </header>

      <main className={`mx-auto flex w-full flex-1 flex-col px-4 pb-16 pt-4 ${narrow ? "max-w-xl" : "max-w-4xl"}`}>
        {children}
      </main>

      <footer className="border-t border-card-border">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted">
          <p>
            Feito por diversão, sem anúncios
            {site.author && (
              <>
                {" "}
                por{" "}
                {site.authorUrl ? (
                  <a href={site.authorUrl} className="font-semibold underline underline-offset-2">
                    {site.author}
                  </a>
                ) : (
                  site.author
                )}
              </>
            )}
            .
          </p>
          <nav className="flex gap-4">
            <Link href="/privacidade" className="hover:underline">
              Privacidade
            </Link>
            {site.repoUrl && (
              <a href={site.repoUrl} className="hover:underline">
                Código no GitHub
              </a>
            )}
          </nav>
        </div>
      </footer>
    </div>
  );
}
