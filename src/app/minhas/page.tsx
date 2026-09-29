import type { Metadata } from "next";
import Link from "next/link";
import { LocalDate } from "@/components/site/LocalDate";
import { SiteShell } from "@/components/site/SiteShell";
import { ownerEntries } from "@/lib/owner-session";
import { listOwned } from "@/lib/reveal/store";
import { LegacyCleanup } from "./LegacyCleanup";

export const metadata: Metadata = {
  title: "Minhas revelações",
  robots: { index: false },
};

/** Lista montada no servidor a partir dos cookies de dono deste navegador (conferidos no banco). */
export default async function MinePage({ searchParams }: PageProps<"/minhas">) {
  const { excluida } = await searchParams;
  const list = await listOwned(await ownerEntries());

  return (
    <SiteShell narrow>
      <LegacyCleanup />
      <h1 className="mb-1 font-display text-3xl font-bold">Minhas revelações</h1>
      <p className="mb-6 text-muted">As que este aparelho acessa. Em outro celular, use o link de edição.</p>
      {excluida === "1" && (
        <p className="mb-4 rounded-2xl bg-green-50 p-4 text-green-800">Revelação apagada, junto com fotos e recados.</p>
      )}

      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-[2rem] border border-card-border bg-card p-8 text-center">
          <span className="text-5xl" aria-hidden>
            🍼
          </span>
          <p className="text-muted">Nenhuma revelação neste aparelho ainda.</p>
          <Link href="/criar" className="rounded-full bg-accent px-6 py-3 font-display font-semibold text-accent-fg shadow">
            Criar revelação
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((r) => (
            <li key={r.slug}>
              <Link
                href={`/painel/${r.slug}`}
                className="flex items-center justify-between gap-4 rounded-3xl border border-card-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5"
              >
                <span>
                  <span className="block font-display text-xl font-semibold">{r.parents}</span>
                  <span className="text-sm text-muted">
                    Criada em <LocalDate iso={r.createdAt} options={{ dateStyle: "long" }} />
                  </span>
                </span>
                <span className="shrink-0 whitespace-nowrap font-semibold text-accent" aria-hidden>
                  Abrir →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SiteShell>
  );
}
