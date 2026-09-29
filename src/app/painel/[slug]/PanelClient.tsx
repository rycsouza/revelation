"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  deleteRevealAction,
  editLinkAction,
  forgetDeviceAction,
  removeMessageAction,
  saveRevealAction,
} from "@/app/actions/owner";
import { formFromDashboard, RevealForm, type MediaChanges } from "@/components/creator/RevealForm";
import { Button, Card } from "@/components/creator/ui";
import { LocalDate } from "@/components/site/LocalDate";
import { editUrl } from "@/lib/client/storage";
import { saveMusic, syncPhotos } from "@/lib/client/upload";
import type { RevealInput } from "@/lib/reveal/schema";
import { MECHANIC_INFO, SEX_INFO, type Dashboard } from "@/lib/reveal/types";

const TABS = [
  { id: "links", label: "Links" },
  { id: "familia", label: "Palpites e recados" },
  { id: "editar", label: "Editar" },
  { id: "ajustes", label: "Ajustes" },
] as const;
type TabId = (typeof TABS)[number]["id"];

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    window.prompt("Copie o link:", text);
    return false;
  }
}

function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      className="px-4 py-2 text-sm"
      onClick={async () => {
        if (await copy(text)) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }
      }}
    >
      {copied ? "Copiado ✓" : label}
    </Button>
  );
}

/** O link de edição não vai no HTML do painel: só é buscado quando o dono pede. */
function EditLink({ slug, origin }: { slug: string; origin: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function show() {
    const res = await editLinkAction(slug);
    if (!res.ok) return setError(res.error);
    setUrl(editUrl(origin, slug, res.token));
  }

  if (!url) {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="outline" className="self-start text-base" onClick={show}>
          Mostrar link de edição
        </Button>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="break-all rounded-2xl bg-white/60 p-3 font-mono text-sm">{url}</p>
      <CopyButton text={url} label="Copiar link de edição" />
    </div>
  );
}

function ShareRow({ title, subtitle, url, greeting }: { title: string; subtitle?: string; url: string; greeting: string }) {
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${greeting} Temos uma novidade para você 💌\n${url}`)}`;
  return (
    <li className="flex flex-col gap-3 rounded-2xl bg-white/60 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {title} {subtitle && <span className="font-normal text-muted">· vai ser {subtitle}</span>}
        </p>
        <p className="truncate text-sm text-muted">{url}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <CopyButton text={url} />
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-full bg-[#25d366] px-4 py-2 text-sm font-semibold text-white transition active:scale-95"
        >
          WhatsApp
        </a>
      </div>
    </li>
  );
}

/**
 * Painel do dono. Os dados chegam prontos do servidor (SSR), sem requisição do navegador para buscá-los.
 * Cada ação chama refresh() no servidor, então o painel se atualiza na mesma resposta.
 */
export function PanelClient({
  slug,
  origin,
  dashboard,
  isNew,
  uploadFailed,
}: {
  slug: string;
  origin: string;
  dashboard: Dashboard;
  isNew: boolean;
  uploadFailed: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("links");

  const { reveal, secret, guests, guesses, messages } = dashboard;
  const baseUrl = `${origin}/r/${slug}`;
  const score = { boy: guesses.filter((g) => g.guess === "boy").length, girl: guesses.filter((g) => g.guess === "girl").length };

  async function save(input: RevealInput, media: MediaChanges) {
    const res = await saveRevealAction(slug, input);
    if (!res.ok) return res.error;
    try {
      if (media.photos) await syncPhotos(slug, dashboard.photos.map((p) => p.path), media.photos);
      if (media.music !== undefined) await saveMusic(slug, media.music);
    } catch (err) {
      router.refresh();
      return err instanceof Error ? err.message : "Não foi possível enviar o arquivo.";
    }
    return null;
  }

  async function remove() {
    const ok = window.confirm(
      "Apagar a revelação, fotos, música, palpites e recados? Os links param de funcionar. Não dá para desfazer.",
    );
    if (!ok) return;
    const res = await deleteRevealAction(slug);
    if (!res.ok) return setError(res.error);
    router.push("/minhas?excluida=1");
  }

  async function forget() {
    if (!window.confirm("Tirar o acesso deste aparelho? Para voltar, vocês vão precisar do link de edição.")) return;
    await forgetDeviceAction(slug);
    router.push("/minhas");
  }

  return (
    <div className="flex flex-col gap-6">
      {isNew && (
        <div className="animate-pop-in flex flex-col gap-3 rounded-3xl bg-green-50 p-5 text-green-900">
          <p className="font-display text-xl font-semibold">Pronto! Sua revelação foi criada 🎉</p>
          <p className="text-sm">
            Este aparelho já tem acesso ao painel (aparece em “Minhas”). Para abrir em outro celular,{" "}
            <strong>guarde o link de edição</strong>:
          </p>
          <EditLink slug={slug} origin={origin} />
        </div>
      )}
      {uploadFailed && (
        <p className="rounded-2xl bg-amber-50 p-4 text-amber-900">
          A revelação foi criada, mas alguma foto ou a música não subiu. Tente de novo em{" "}
          <strong>Editar → Fotos e música</strong>.
        </p>
      )}

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted">Revelação de</p>
            <h1 className="font-display text-3xl font-bold">{reveal.parents}</h1>
            <p className="mt-1 text-muted">
              {MECHANIC_INFO[reveal.mechanic].emoji} {MECHANIC_INFO[reveal.mechanic].label} · {SEX_INFO[secret.sex].emoji}{" "}
              {secret.sex === "boy" ? "menino" : "menina"}
              {secret.babyName ? ` (${secret.babyName})` : ""}
            </p>
            {reveal.revealAt && (
              <p className="mt-1 text-sm text-muted">
                Revelação ao vivo em{" "}
                <strong>
                  <LocalDate iso={reveal.revealAt} options={{ dateStyle: "long", timeStyle: "short" }} />
                </strong>
              </p>
            )}
          </div>
          <span className="text-5xl" aria-hidden>
            💌
          </span>
        </div>
        <a
          href={`/r/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start rounded-full bg-accent px-5 py-2.5 font-display font-semibold text-accent-fg shadow"
        >
          Ver como convidado ↗
        </a>
      </Card>

      <nav className="no-scrollbar -mx-4 overflow-x-auto px-4" aria-label="Seções do painel">
        <div className="flex min-w-max gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                tab === t.id ? "bg-accent text-accent-fg shadow" : "bg-card"
              }`}
            >
              {t.label}
              {t.id === "familia" && guesses.length + messages.length > 0 && ` (${guesses.length + messages.length})`}
            </button>
          ))}
        </div>
      </nav>

      {error && <p className="rounded-2xl bg-red-50 p-4 text-center font-semibold text-red-700">{error}</p>}

      {tab === "links" && (
        <Card>
          <h2 className="font-display text-2xl font-semibold">Mande para a família</h2>
          <p className="-mt-2 text-sm text-muted">
            A prévia no WhatsApp fica neutra (“Uma novidade de {reveal.parents} 💌”), sem entregar nada.
          </p>
          <ul className="flex flex-col gap-3">
            {guests.map((g) => (
              <ShareRow
                key={g.slug}
                title={g.name}
                subtitle={g.becomes}
                url={`${baseUrl}?p=${g.slug}`}
                greeting={`Oi, ${g.name}!`}
              />
            ))}
            <ShareRow title="Link geral" url={baseUrl} greeting="Oi!" />
          </ul>
          <Button variant="ghost" className="self-start text-base" onClick={() => setTab("editar")}>
            + Adicionar pessoas
          </Button>
        </Card>
      )}

      {tab === "familia" && (
        <>
          {reveal.guessEnabled && (
            <Card>
              <h2 className="font-display text-2xl font-semibold">Palpites</h2>
              {guesses.length === 0 ? (
                <p className="text-muted">Ninguém palpitou ainda.</p>
              ) : (
                <>
                  <p className="font-display text-xl">
                    💙 {score.boy} × {score.girl} 💗
                  </p>
                  <ul className="divide-y divide-card-border">
                    {guesses.map((g, i) => (
                      <li key={i} className="flex items-center justify-between py-2">
                        <span>{g.name ?? <span className="text-muted">Alguém pelo link geral</span>}</span>
                        <span className="flex items-center gap-2">
                          {SEX_INFO[g.guess].emoji}
                          {g.guess === secret.sex && <span className="text-sm text-green-700">acertou</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          )}
          <Card>
            <h2 className="font-display text-2xl font-semibold">Recados</h2>
            {messages.length === 0 ? (
              <p className="text-muted">Os recados aparecem aqui depois que a família descobrir.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {messages.map((m) => (
                  <li key={m.id} className="rounded-2xl bg-white/60 p-4">
                    <p className="whitespace-pre-line break-words">{m.body}</p>
                    <div className="mt-2 flex items-center justify-between text-sm text-muted">
                      <span>
                        <strong>{m.author}</strong> ·{" "}
                        <LocalDate iso={m.createdAt} options={{ dateStyle: "short", timeStyle: "short" }} />
                      </span>
                      <button
                        type="button"
                        className="font-semibold text-red-700 hover:underline"
                        onClick={async () => {
                          if (!window.confirm("Apagar este recado?")) return;
                          const res = await removeMessageAction(slug, m.id);
                          if (!res.ok) setError(res.error);
                        }}
                      >
                        Apagar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      {tab === "editar" && (
        <RevealForm
          mode="edit"
          initial={formFromDashboard(dashboard)}
          currentMedia={{ photos: dashboard.photos, musicUrl: reveal.musicUrl }}
          onSubmit={save}
        />
      )}

      {tab === "ajustes" && (
        <>
          <Card>
            <h2 className="font-display text-2xl font-semibold">Link de edição</h2>
            <p className="-mt-2 text-sm text-muted">
              Quem tiver este link pode editar e apagar a revelação. Não mande para a família.
            </p>
            <EditLink slug={slug} origin={origin} />
          </Card>
          <Card>
            <h2 className="font-display text-2xl font-semibold">Este aparelho</h2>
            <p className="-mt-2 text-sm text-muted">
              Celular emprestado ou computador de outra pessoa? Tire o acesso daqui (a revelação continua existindo).
            </p>
            <Button variant="outline" className="self-start text-base" onClick={forget}>
              Tirar acesso deste aparelho
            </Button>
          </Card>
          <Card>
            <h2 className="font-display text-2xl font-semibold">Apagar tudo</h2>
            <p className="-mt-2 text-sm text-muted">
              Se vocês não apagarem, tudo some sozinho em{" "}
              <strong>
                <LocalDate iso={dashboard.expiresAt} options={{ dateStyle: "long" }} />
              </strong>
              .
            </p>
            <Button variant="danger" className="self-start" onClick={remove}>
              Apagar revelação
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}
