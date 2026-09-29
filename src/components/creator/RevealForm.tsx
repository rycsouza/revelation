"use client";

import { useId, useState } from "react";
import { randomId } from "@/lib/client/storage";
import type { PhotoItem } from "@/lib/client/upload";
import { MAX_PHOTOS, MEDIA_ACCEPT, revealInputSchema, type RevealInput } from "@/lib/reveal/schema";
import {
  BECOMES_SUGGESTIONS,
  MECHANICS,
  MECHANIC_INFO,
  THEMES,
  THEME_INFO,
  type BabySex,
  type Dashboard,
  type Mechanic,
  type ThemeId,
} from "@/lib/reveal/types";
import { ThemeBackdrop } from "@/components/theme/ThemeBackdrop";
import { PhotoPicker } from "./PhotoPicker";
import { Button, Card, Field, FileField, inputClass } from "./ui";

export interface GuestRow {
  key: string;
  slug?: string;
  name: string;
  becomes: string;
}

export interface FormState {
  parents: string;
  message: string;
  dueDate: string;
  sex: BabySex | null;
  babyName: string;
  mechanic: Mechanic;
  theme: ThemeId;
  guessEnabled: boolean;
  live: boolean;
  /** Valor do input datetime-local, no fuso do aparelho. */
  revealAtLocal: string;
  guests: GuestRow[];
}

/** undefined = não mexer. Fotos: a lista final, na ordem. Música: null remove, File troca. */
export interface MediaChanges {
  photos?: PhotoItem[];
  music?: File | null;
}

export const EMPTY_FORM: FormState = {
  parents: "",
  message: "Nossa família vai crescer, e a gente queria que você fosse um dos primeiros a saber.",
  dueDate: "",
  sex: null,
  babyName: "",
  mechanic: "scratch",
  theme: "nuvem",
  guessEnabled: true,
  live: false,
  revealAtLocal: "",
  guests: [
    { key: "g1", name: "", becomes: "vovó" },
    { key: "g2", name: "", becomes: "vovô" },
  ],
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formFromDashboard(d: Dashboard): FormState {
  return {
    parents: d.reveal.parents,
    message: d.reveal.message ?? "",
    dueDate: d.reveal.dueDate ?? "",
    sex: d.secret.sex,
    babyName: d.secret.babyName ?? "",
    mechanic: d.reveal.mechanic,
    theme: d.reveal.theme,
    guessEnabled: d.reveal.guessEnabled,
    live: Boolean(d.reveal.revealAt),
    revealAtLocal: d.reveal.revealAt ? toLocalInput(d.reveal.revealAt) : "",
    guests: d.guests.map((g) => ({ key: g.slug, slug: g.slug, name: g.name, becomes: g.becomes ?? "" })),
  };
}

function toInput(form: FormState): RevealInput {
  return {
    parents: form.parents,
    message: form.message,
    dueDate: form.dueDate,
    sex: form.sex as BabySex,
    babyName: form.babyName,
    mechanic: form.mechanic,
    theme: form.theme,
    guessEnabled: form.guessEnabled,
    revealAt:
      form.mechanic === "countdown" && form.live && form.revealAtLocal
        ? new Date(form.revealAtLocal).toISOString()
        : null,
    // Linhas em branco são ignoradas: o formulário já começa com duas sugestões.
    guests: form.guests
      .filter((g) => g.name.trim())
      .map((g) => ({ slug: g.slug, name: g.name, becomes: g.becomes })),
  };
}

const STEPS = [
  { id: "casal", label: "Vocês" },
  { id: "bebe", label: "O bebê" },
  { id: "revelacao", label: "Revelação" },
  { id: "midia", label: "Fotos e música" },
  { id: "familia", label: "Família" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

/** Validação do passo antes de avançar. Retorna a mensagem de erro, ou null. */
function stepError(step: StepId, form: FormState): string | null {
  if (step === "casal" && form.parents.trim().length < 2) return "Coloque o nome de vocês.";
  if (step === "bebe" && !form.sex) return "Escolha menino ou menina.";
  if (step === "revelacao" && form.mechanic === "countdown" && form.live) {
    if (!form.revealAtLocal) return "Escolha o dia e a hora da revelação.";
    if (new Date(form.revealAtLocal).getTime() < Date.now()) return "O horário da revelação já passou.";
  }
  return null;
}

export function RevealForm({
  mode,
  initial,
  currentMedia,
  onSubmit,
}: {
  mode: "create" | "edit";
  initial: FormState;
  currentMedia?: { photos: { path: string; url: string }[]; musicUrl?: string };
  /** Retorna uma mensagem de erro, ou null quando deu certo. */
  onSubmit: (input: RevealInput, media: MediaChanges) => Promise<string | null>;
}) {
  const [form, setForm] = useState(initial);
  const [media, setMedia] = useState<MediaChanges>({});
  const photos: PhotoItem[] =
    media.photos ?? (currentMedia?.photos ?? []).map((p) => ({ key: p.path, path: p.path, url: p.url }));
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const listId = useId();

  const step = STEPS[stepIndex].id;
  const isLast = stepIndex === STEPS.length - 1;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
    setSaved(false);
  }

  function updateGuest(key: string, patch: Partial<GuestRow>) {
    update(
      "guests",
      form.guests.map((g) => (g.key === key ? { ...g, ...patch } : g)),
    );
  }

  function go(index: number) {
    // Criando, só avança com o passo atual válido. Editando, dá para pular livremente.
    if (mode === "create" && index > stepIndex) {
      const err = stepError(step, form);
      if (err) return setError(err);
    }
    setError(null);
    setStepIndex(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    for (const s of STEPS) {
      const err = stepError(s.id, form);
      if (err) {
        setStepIndex(STEPS.findIndex((x) => x.id === s.id));
        return setError(err);
      }
    }
    const input = toInput(form);
    const parsed = revealInputSchema.safeParse(input);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Confira os campos.");

    setSaving(true);
    setError(null);
    const err = await onSubmit(input, media);
    setSaving(false);
    if (err) return setError(err);
    if (mode === "edit") {
      setSaved(true);
      setMedia({});
    }
  }

  const musicName = media.music ? media.music.name : media.music === null ? undefined : currentMedia?.musicUrl ? "Música atual" : undefined;

  return (
    <div className="flex w-full flex-col gap-6">
      <nav aria-label="Passos" className="no-scrollbar -mx-4 overflow-x-auto px-4">
        <ol className="flex min-w-max gap-2">
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={i === stepIndex ? "step" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  i === stepIndex
                    ? "bg-accent text-accent-fg shadow"
                    : i < stepIndex || mode === "edit"
                      ? "bg-card text-fg"
                      : "bg-card text-muted"
                }`}
              >
                {i + 1}. {s.label}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <Card key={step} className="animate-enter">
        {step === "casal" && (
          <>
            <h2 className="font-display text-2xl font-semibold">Quem está contando a novidade?</h2>
            <Field label="Nome de vocês" hint="Aparece assim: “Uma novidade de Ana & Pedro para você”.">
              <input
                className={inputClass}
                value={form.parents}
                onChange={(e) => update("parents", e.target.value)}
                placeholder="Ana & Pedro"
                maxLength={60}
                autoFocus={mode === "create"}
              />
            </Field>
            <Field label="Mensagem da carta" hint="Aparece junto com “Tem um bebê a caminho!”.">
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                value={form.message}
                onChange={(e) => update("message", e.target.value)}
                maxLength={400}
              />
            </Field>
            <Field label="Data prevista (opcional)" hint="Mostramos só o mês e o ano.">
              <input
                type="date"
                className={inputClass}
                value={form.dueDate}
                onChange={(e) => update("dueDate", e.target.value)}
              />
            </Field>
          </>
        )}

        {step === "bebe" && (
          <>
            <h2 className="font-display text-2xl font-semibold">É menino ou menina?</h2>
            <p className="-mt-2 text-sm text-muted">
              🔒 Fica guardado em segredo: não aparece na página nem na prévia do link até a hora da revelação.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(["boy", "girl"] as const).map((sex) => (
                <button
                  key={sex}
                  type="button"
                  onClick={() => update("sex", sex)}
                  aria-pressed={form.sex === sex}
                  className={`flex flex-col items-center gap-1 rounded-3xl p-5 font-display text-xl font-semibold text-white transition ${
                    sex === "boy" ? "bg-linear-to-br from-boy to-boy-deep" : "bg-linear-to-br from-girl to-girl-deep"
                  } ${form.sex && form.sex !== sex ? "opacity-40" : ""} ${form.sex === sex ? "ring-4 ring-accent ring-offset-2" : ""}`}
                >
                  <span className="text-4xl">{sex === "boy" ? "💙" : "💗"}</span>
                  {sex === "boy" ? "Menino" : "Menina"}
                </button>
              ))}
            </div>
            <Field label="Nome do bebê (opcional)" hint="Aparece depois da revelação: “Bem-vinda, Helena!”.">
              <input
                className={inputClass}
                value={form.babyName}
                onChange={(e) => update("babyName", e.target.value)}
                maxLength={40}
                placeholder="Ainda não decidimos"
              />
            </Field>
          </>
        )}

        {step === "revelacao" && (
          <>
            <h2 className="font-display text-2xl font-semibold">Como a família vai descobrir?</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {MECHANICS.map((m) => {
                const info = MECHANIC_INFO[m];
                const active = form.mechanic === m;
                return (
                  <div
                    key={m}
                    className={`relative flex flex-col gap-1 rounded-2xl border-2 p-4 transition ${
                      active ? "border-accent bg-accent/10" : "border-card-border bg-white/40"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => update("mechanic", m)}
                      aria-pressed={active}
                      className="text-left after:absolute after:inset-0"
                    >
                      <span className="text-3xl">{info.emoji}</span>
                      <span className="mt-1 block font-display text-lg font-semibold">{info.label}</span>
                      <span className="block text-sm text-muted">{info.description}</span>
                    </button>
                    <a
                      href={`/r/${info.demo}`}
                      target="_blank"
                      rel="noreferrer"
                      className="relative z-10 mt-1 self-start text-sm font-semibold text-accent underline underline-offset-2"
                    >
                      Ver exemplo ↗
                    </a>
                  </div>
                );
              })}
            </div>

            {form.mechanic === "countdown" && (
              <div className="flex flex-col gap-3 rounded-2xl bg-white/50 p-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 accent-(--accent)"
                    checked={form.live}
                    onChange={(e) => update("live", e.target.checked)}
                  />
                  <span>
                    <strong>Marcar um horário para todo mundo</strong>
                    <span className="block text-sm text-muted">
                      A família revela junta, ao vivo. Sem horário, cada um aperta o botão quando abrir.
                    </span>
                  </span>
                </label>
                {form.live && (
                  <Field label="Dia e hora da revelação" hint="No fuso horário deste aparelho.">
                    <input
                      type="datetime-local"
                      className={inputClass}
                      value={form.revealAtLocal}
                      onChange={(e) => update("revealAtLocal", e.target.value)}
                    />
                  </Field>
                )}
              </div>
            )}

            <Field label="Tema">
              <div className="grid grid-cols-3 gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => update("theme", t)}
                    aria-pressed={form.theme === t}
                    className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-3 text-sm font-semibold ${
                      form.theme === t ? "border-accent" : "border-transparent"
                    }`}
                  >
                    <span
                      className="relative isolate h-16 w-full overflow-hidden rounded-xl shadow-inner"
                      style={{ background: `linear-gradient(135deg, ${THEME_INFO[t].swatch[0]}, ${THEME_INFO[t].swatch[1]})` }}
                    >
                      <ThemeBackdrop theme={t} compact />
                    </span>
                    {THEME_INFO[t].label}
                  </button>
                ))}
              </div>
            </Field>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 accent-(--accent)"
                checked={form.guessEnabled}
                onChange={(e) => update("guessEnabled", e.target.checked)}
              />
              <span>
                <strong>Pedir o palpite antes</strong>
                <span className="block text-sm text-muted">Cada pessoa escolhe menino ou menina, e vocês veem o placar.</span>
              </span>
            </label>
          </>
        )}

        {step === "midia" && (
          <>
            <h2 className="font-display text-2xl font-semibold">Fotos e música (opcionais)</h2>
            <PhotoPicker
              photos={photos}
              max={MAX_PHOTOS}
              onChange={(next) => {
                setMedia((m) => ({ ...m, photos: next }));
                setSaved(false);
              }}
            />
            <FileField
              label="Música de fundo"
              hint="Toca desde a abertura, até 4 MB (uns 3 minutos em MP3). Use uma música que vocês tenham direito de usar."
              accept={MEDIA_ACCEPT.music}
              fileName={musicName}
              onPick={(file) => {
                setMedia((m) => ({ ...m, music: file }));
                setSaved(false);
              }}
              onRemove={musicName ? () => setMedia((m) => ({ ...m, music: null })) : undefined}
            />
          </>
        )}

        {step === "familia" && (
          <>
            <h2 className="font-display text-2xl font-semibold">Para quem vai o link?</h2>
            <p className="-mt-2 text-sm text-muted">
              Cada pessoa ganha um link com o nome dela (“Oi, Vovó Maria!”). Também existe um link geral para mandar a
              qualquer um.
            </p>
            <datalist id={listId}>
              {BECOMES_SUGGESTIONS.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
            <ul className="flex flex-col gap-3">
              {form.guests.map((g, i) => (
                <li key={g.key} className="flex items-end gap-2">
                  <label className="flex-1">
                    <span className="mb-1 block text-xs font-semibold text-muted">Nome {i + 1}</span>
                    <input
                      className={inputClass}
                      value={g.name}
                      onChange={(e) => updateGuest(g.key, { name: e.target.value })}
                      placeholder="Vovó Maria"
                      maxLength={40}
                    />
                  </label>
                  <label className="w-28 sm:w-36">
                    <span className="mb-1 block text-xs font-semibold text-muted">Vai ser</span>
                    <input
                      className={inputClass}
                      list={listId}
                      value={g.becomes}
                      onChange={(e) => updateGuest(g.key, { becomes: e.target.value })}
                      placeholder="vovó"
                      maxLength={30}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => update("guests", form.guests.filter((x) => x.key !== g.key))}
                    aria-label={`Remover ${g.name || `convidado ${i + 1}`}`}
                    className="mb-1 grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl text-muted hover:bg-black/5"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <Button
              variant="ghost"
              onClick={() => update("guests", [...form.guests, { key: randomId(), name: "", becomes: "" }])}
            >
              + Adicionar pessoa
            </Button>
            {mode === "edit" && (
              <p className="text-xs text-muted">Quem já tinha link continua com o mesmo, mesmo trocando o nome.</p>
            )}
          </>
        )}
      </Card>

      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-center font-semibold text-red-700">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="rounded-2xl bg-green-50 px-4 py-3 text-center font-semibold text-green-700">
          Alterações salvas ✓
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => go(stepIndex - 1)} disabled={stepIndex === 0}>
          ← Voltar
        </Button>
        {mode === "edit" ? (
          <Button onClick={submit} disabled={saving}>
            {saving ? "Salvando…" : "Salvar alterações"}
          </Button>
        ) : isLast ? (
          <Button onClick={submit} disabled={saving}>
            {saving ? "Criando…" : "Criar revelação ✨"}
          </Button>
        ) : (
          <Button onClick={() => go(stepIndex + 1)}>Continuar →</Button>
        )}
      </div>
    </div>
  );
}
