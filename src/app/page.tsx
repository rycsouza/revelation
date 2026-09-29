import Link from "next/link";
import { SiteShell } from "@/components/site/SiteShell";
import { MECHANIC_INFO, MECHANICS } from "@/lib/reveal/types";

const STEPS = [
  { emoji: "✍️", title: "Vocês montam", text: "Nomes, sexo do bebê, foto do ultrassom, música e a lista da família." },
  { emoji: "💬", title: "Mandam o link", text: "Cada pessoa ganha o seu, pelo WhatsApp. A prévia não entrega nada." },
  { emoji: "🎉", title: "A família descobre", text: "Primeiro a gravidez, depois o palpite e, por fim, a revelação." },
];

const PROMISES = [
  { emoji: "🔒", text: "O sexo só sai do servidor na hora da revelação. Nem espiando o código dá para descobrir antes." },
  { emoji: "🧹", text: "Tudo se apaga sozinho alguns meses depois do parto, ou quando vocês quiserem." },
  { emoji: "🚫", text: "Sem cadastro, sem anúncios, sem rastreadores. Feito por diversão." },
];

export default function Home() {
  return (
    <SiteShell>
      <section className="flex flex-col items-center gap-5 py-10 text-center sm:py-16">
        <span className="animate-float text-7xl" aria-hidden>
          💌
        </span>
        <h1 className="max-w-2xl font-display text-4xl font-bold leading-tight sm:text-6xl">
          Conte a novidade do bebê de um jeito especial
        </h1>
        <p className="max-w-lg text-lg text-muted">
          Um link para mandar à família: primeiro a notícia da gravidez, depois a revelação do sexo, com confete, som e
          vibração no celular.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/criar"
            className="rounded-full bg-accent px-8 py-4 font-display text-xl font-semibold text-accent-fg shadow-lg transition hover:brightness-105 active:scale-95"
          >
            Criar a nossa revelação
          </Link>
          <Link
            href="/r/demo-raspadinha?p=vovo"
            className="rounded-full border-2 border-card-border bg-white/60 px-8 py-4 font-display text-xl font-semibold transition hover:bg-white"
          >
            Ver um exemplo
          </Link>
        </div>
        <p className="text-sm text-muted">Grátis, sem cadastro, pronto em 3 minutos.</p>
      </section>

      <section className="py-8">
        <h2 className="mb-6 text-center font-display text-3xl font-semibold">Como funciona</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-3xl border border-card-border bg-card p-6 shadow-sm backdrop-blur">
              <span className="text-4xl" aria-hidden>
                {s.emoji}
              </span>
              <h3 className="mt-3 font-display text-xl font-semibold">
                {i + 1}. {s.title}
              </h3>
              <p className="mt-1 text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="py-8">
        <h2 className="mb-2 text-center font-display text-3xl font-semibold">Escolham como revelar</h2>
        <p className="mb-6 text-center text-muted">Toque para experimentar como a família vai ver.</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {MECHANICS.map((m) => {
            const info = MECHANIC_INFO[m];
            return (
              <li key={m}>
                <Link
                  href={`/r/${info.demo}?p=vovo`}
                  className="flex h-full items-start gap-4 rounded-3xl border border-card-border bg-card p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span className="text-4xl" aria-hidden>
                    {info.emoji}
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="font-display text-xl font-semibold">{info.label}</span>
                    <span className="text-sm text-muted">{info.description}</span>
                    <span className="mt-1 text-sm font-semibold text-accent">Experimentar →</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-center text-sm text-muted">
          A contagem também tem o{" "}
          <Link href="/r/demo-contagem?p=vovo" className="font-semibold underline underline-offset-2">
            modo sem horário marcado
          </Link>
          , em que cada um aperta o botão quando abrir.
        </p>
      </section>

      <section className="py-8">
        <ul className="grid gap-4 sm:grid-cols-3">
          {PROMISES.map((p) => (
            <li key={p.text} className="flex gap-3 rounded-3xl bg-white/40 p-5">
              <span className="text-2xl" aria-hidden>
                {p.emoji}
              </span>
              <p className="text-sm">{p.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col items-center gap-4 py-10 text-center">
        <h2 className="font-display text-3xl font-semibold">Vamos contar?</h2>
        <Link
          href="/criar"
          className="rounded-full bg-accent px-8 py-4 font-display text-xl font-semibold text-accent-fg shadow-lg transition hover:brightness-105 active:scale-95"
        >
          Criar revelação
        </Link>
      </section>
    </SiteShell>
  );
}
