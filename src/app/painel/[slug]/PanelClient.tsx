"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { deleteRevealAction, loadDashboard, removeMessageAction, saveRevealAction } from "@/app/actions/owner";
import { formFromDashboard, RevealForm, type MediaChanges } from "@/components/creator/RevealForm";
import { Button, Card } from "@/components/creator/ui";
import { editPath, forgetMyReveal, saveMyReveal } from "@/lib/client/storage";
import { saveMusic, savePhotos } from "@/lib/client/upload";
import type { RevealInput } from "@/lib/reveal/schema";
import { MECHANIC_INFO, SEX_INFO, type Dashboard } from "@/lib/reveal/types";

const TABS = [
  { id: "links", label: "Links" },
  { id: "familia", label: "Palpites e recados" },
  { id: "editar", label: "Editar" },
  { id: "ajustes", label: "Ajustes" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      className="px-4 py-2 text-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          window.prompt("Copie o link:", text);
        }
      }}
    >
      {copied ? "Copiado ✓" : label}
    </Button>
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
          rel="noreferrer"
          className="inline-flex items-center rounded-full bg-[#25d366] px-4 py-2 text-sm font-semibold text-white transition active:scale-95"
        >
          WhatsApp
        </a>
      </div>
    </li>
  );
}

export function PanelClient({ slug, isNew, uploadFailed }: { slug: string; isNew: boolean; uploadFailed: boolean }) {
  const router = useRouter();
  const token = useSyncExternalStore(
    subscribeHash,
    () => decodeURIComponent(window.location.hash.slice(1)),
    () => null,
  );
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("links");
  const [version, setVersion] = useState(0);

  const apply = useCallback(
    // remount: só na carga inicial. Depois de salvar, o formulário fica como está (passo atual e aviso de salvo).
    (res: Awaited<ReturnType<typeof loadDashboard>>, remount: boolean) => {
      if (!res.ok) {
        // Token trocado ou revelação apagada: não pode sobrar nada da sessão anterior na tela.
        setDashboard(null);
        return setError(res.error);
      }
      setError(null);
      setDashboard(res.dashboard);
      if (remount) setVersion((v) => v + 1);
      if (token) saveMyReveal({ slug, token, parents: res.dashboard.reveal.parents, createdAt: new Date().toISOString() });
    },
    [slug, token],
  );

  const refresh = useCallback(async () => {
    if (token) apply(await loadDashboard(slug, token), false);
  }, [apply, slug, token]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    void loadDashboard(slug, token).then((res) => {
      if (active) apply(res, true);
    });
    return () => {
      active = false;
    };
  }, [apply, slug, token]);

  const missingToken = token === "";
  if (missingToken || (error && !dashboard)) {
    return (
      <Card>
        <h1 className="font-display text-2xl font-semibold">Não conseguimos abrir o painel</h1>
        <p className="text-muted">
          {missingToken ? "Este link está sem o código de edição. Use o link completo que vocês guardaram." : error}
        </p>
        <Link href="/minhas" className="font-semibold text-accent underline">
          Ver minhas revelações
        </Link>
      </Card>
    );
  }

  if (!dashboard || !token) {
    return <p className="animate-pulse py-20 text-center text-muted">Carregando painel…</p>;
  }

  // Só chega aqui no navegador (o painel depende do # da URL), então dá para ler window direto.
  const origin = window.location.origin;
  const { reveal, secret, guests, guesses, messages } = dashboard;
  const baseUrl = `${origin}/r/${slug}`;
  const editUrl = `${origin}${editPath(slug, token)}`;
  const score = { boy: guesses.filter((g) => g.guess === "boy").length, girl: guesses.filter((g) => g.guess === "girl").length };

  async function save(input: RevealInput, media: MediaChanges) {
    if (!token) return "Link de edição inválido.";
    const res = await saveRevealAction(slug, token, input);
    if (!res.ok) return res.error;
    try {
      if (media.photos) await savePhotos(slug, token, media.photos);
      if (media.music !== undefined) await saveMusic(slug, token, media.music);
    } catch (err) {
      await refresh();
      return err instanceof Error ? err.message : "Não foi possível enviar o arquivo.";
    }
    await refresh();
    return null;
  }

  async function remove() {
    if (!token) return;
    const ok = window.confirm(
      "Apagar a revelação, fotos, música, palpites e recados? Os links param de funcionar. Não dá para desfazer.",
    );
    if (!ok) return;
    const res = await deleteRevealAction(slug, token);
    if (!res.ok) return setError(res.error);
    forgetMyReveal(slug);
    router.push("/minhas?excluida=1");
  }

  return (
    <div className="flex flex-col gap-6">
      {isNew && (
        <div className="animate-pop-in rounded-3xl bg-green-50 p-5 text-green-900">
          <p className="font-display text-xl font-semibold">Pronto! Sua revelação foi criada 🎉</p>
          <p className="mt-1 text-sm">
            <strong>Guarde o link desta página:</strong> é com ele que vocês editam e veem os palpites. Ele também fica
            salvo neste aparelho em “Minhas”.
          </p>
          <div className="mt-3">
            <CopyButton text={editUrl} label="Copiar link de edição" />
          </div>
        </div>
      )}
      {uploadFailed && (
        <p className="rounded-2xl bg-amber-50 p-4 text-amber-900">
          A revelação foi criada, mas a foto ou a música não subiu. Tente de novo em <strong>Editar → Fotos e música</strong>.
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
                  {new Date(reveal.revealAt).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" })}
                </strong>
              </p>
            )}
          </div>
          <span className="text-5xl" aria-hidden>
            💌
          </span>
        </div>
        <a
          href={baseUrl}
          target="_blank"
          rel="noreferrer"
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
                        {new Date(m.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                      <button
                        type="button"
                        className="font-semibold text-red-700 hover:underline"
                        onClick={async () => {
                          if (!window.confirm("Apagar este recado?")) return;
                          const res = await removeMessageAction(slug, token, m.id);
                          if (!res.ok) return setError(res.error);
                          await refresh();
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
          key={version}
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
            <p className="break-all rounded-2xl bg-white/60 p-3 font-mono text-sm">{editUrl}</p>
            <CopyButton text={editUrl} label="Copiar link de edição" />
          </Card>
          <Card>
            <h2 className="font-display text-2xl font-semibold">Apagar tudo</h2>
            <p className="-mt-2 text-sm text-muted">
              Se vocês não apagarem, tudo some sozinho em{" "}
              <strong>{new Date(dashboard.expiresAt).toLocaleDateString("pt-BR", { dateStyle: "long" })}</strong>.
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
