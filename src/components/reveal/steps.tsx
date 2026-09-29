"use client";

import { useState } from "react";
import { NEUTRAL_COLORS, sparkle } from "@/lib/fx/celebrate";
import { sfx, vibrate } from "@/lib/fx/sound";
import { SEX_INFO, type BabySex, type Guest, type PublicReveal, type RevealSecret } from "@/lib/reveal/types";
import { PhotoCarousel } from "./PhotoCarousel";
import { Wall, type WallData } from "./Wall";

const primaryButton =
  "rounded-full bg-accent px-8 py-4 font-display text-xl font-semibold text-accent-fg shadow-lg shadow-black/10 transition hover:brightness-105 active:scale-95";

function formatDueDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

/* ---------- 1. Abertura ---------- */

const reportEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export function IntroStep({ reveal, guest, onStart }: { reveal: PublicReveal; guest: Guest | null; onStart: () => void }) {
  return (
    <div className="animate-enter flex max-w-sm flex-col items-center gap-6 text-center">
      <span className="animate-float text-8xl" aria-hidden>
        💌
      </span>
      <div className="space-y-2">
        <h1 className="font-display text-4xl font-bold">{guest ? `Oi, ${guest.name}!` : "Oi!"}</h1>
        <p className="text-lg text-muted">
          Uma novidade de <strong className="text-fg">{reveal.parents}</strong> para você.
        </p>
      </div>
      <button type="button" onClick={onStart} className={primaryButton}>
        Abrir surpresa
      </button>
      <p className="text-sm text-muted">🔊 Aumente o volume</p>
      {reportEmail && (
        <a
          href={`mailto:${reportEmail}?subject=${encodeURIComponent(`Denúncia: revelação ${reveal.slug}`)}`}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted underline opacity-70"
        >
          Denunciar conteúdo
        </a>
      )}
    </div>
  );
}

/* ---------- 2. Envelope com a notícia da gravidez ---------- */

export function PregnancyStep({
  reveal,
  guest,
  onNext,
}: {
  reveal: PublicReveal;
  guest: Guest | null;
  onNext: () => void;
}) {
  const [phase, setPhase] = useState<"closed" | "opening" | "open">("closed");

  function open(e: React.MouseEvent<HTMLButtonElement>) {
    if (phase !== "closed") return;
    setPhase("opening");
    sfx.chime();
    vibrate(40);
    const rect = e.currentTarget.getBoundingClientRect();
    setTimeout(() => sparkle(rect.left + rect.width / 2, rect.top, NEUTRAL_COLORS, 40), 500);
    setTimeout(() => setPhase("open"), 1100);
  }

  if (phase !== "open") {
    return (
      <div className="animate-enter flex flex-col items-center gap-8">
        <p className={`font-display text-xl text-muted transition-opacity ${phase === "opening" ? "opacity-0" : ""}`}>
          Chegou uma carta para você
        </p>
        <button
          type="button"
          onClick={open}
          aria-label="Abrir envelope"
          className={`relative mt-16 h-48 w-72 touch-manipulation [perspective:800px] ${phase === "closed" ? "animate-wiggle" : ""}`}
        >
          {/* Carta: fica atrás do corpo e sobe para a frente da aba aberta */}
          <div
            className={`absolute inset-x-5 top-3 z-10 h-40 rounded-lg bg-white shadow-md ${phase === "opening" ? "animate-[letter-up_0.6s_0.45s_ease-out_forwards]" : ""}`}
          >
            <div className="mx-auto mt-4 h-2 w-24 rounded bg-black/10" />
            <div className="mx-auto mt-2 h-2 w-32 rounded bg-black/10" />
          </div>
          {/* Corpo do envelope (bolso da frente) */}
          <div className="absolute inset-0 z-20 overflow-hidden rounded-xl shadow-xl">
            <div className="absolute inset-0 bg-[#f3dcc4]" />
            <div className="absolute inset-0 bg-[#efd3b6] [clip-path:polygon(0_0,50%_58%,0_100%)]" />
            <div className="absolute inset-0 bg-[#efd3b6] [clip-path:polygon(100%_0,50%_58%,100%_100%)]" />
            <div className="absolute inset-0 bg-[#f6e2cd] [clip-path:polygon(0_100%,50%_52%,100%_100%)]" />
          </div>
          {/* Aba: vira para cima ao abrir */}
          <div
            className={`absolute inset-x-0 top-0 z-30 h-28 origin-top ${phase === "opening" ? "animate-[flap-open_0.5s_ease-in_forwards]" : ""}`}
          >
            <div className="h-full w-full bg-[#e6c19c] drop-shadow-md [clip-path:polygon(0_0,100%_0,50%_100%)]" />
            <span
              className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/3 text-4xl transition-opacity duration-150 ${phase === "opening" ? "opacity-0" : ""}`}
              aria-hidden
            >
              💛
            </span>
          </div>
        </button>
        <p className="text-sm text-muted">Toque para abrir</p>
      </div>
    );
  }

  return (
    <div className="animate-pop-in flex w-full max-w-sm flex-col items-center gap-5 rounded-[2rem] border border-card-border bg-card p-7 text-center shadow-xl backdrop-blur">
      <span className="text-6xl" aria-hidden>
        👶
      </span>
      <h1 className="font-display text-4xl font-bold leading-tight">Tem um bebê a caminho!</h1>
      {guest?.becomes && (
        <p className="font-display text-2xl text-accent">Você vai ser {guest.becomes}! 🥹</p>
      )}
      {reveal.message && <p className="text-muted">{reveal.message}</p>}
      <PhotoCarousel urls={reveal.photoUrls} alt="Foto do bebê e da família" />
      {reveal.dueDate && (
        <p className="rounded-full bg-black/5 px-4 py-1.5 text-sm">
          Chegada prevista: <strong>{formatDueDate(reveal.dueDate)}</strong>
        </p>
      )}
      <button type="button" onClick={onNext} className={`${primaryButton} mt-2`}>
        E tem mais… →
      </button>
    </div>
  );
}

/* ---------- 3. Palpite ---------- */

export function GuessStep({
  askName,
  onGuess,
}: {
  /** No link geral não sabemos quem é: pede o nome (opcional) para o placar do casal. */
  askName: boolean;
  onGuess: (guess: BabySex, name?: string) => void;
}) {
  const [picked, setPicked] = useState<BabySex | null>(null);
  const [name, setName] = useState("");

  function pick(guess: BabySex) {
    if (picked) return;
    setPicked(guess);
    sfx.tick();
    vibrate(20);
    setTimeout(() => onGuess(guess, name.trim() || undefined), 900);
  }

  return (
    <div className="animate-enter flex w-full max-w-sm flex-col items-center gap-6 text-center">
      <h1 className="font-display text-3xl font-bold">
        {picked ? "Palpite anotado! Vamos descobrir…" : "Antes de descobrir: qual é o seu palpite?"}
      </h1>
      {askName && !picked && (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="Seu nome (opcional)"
          aria-label="Seu nome"
          className="w-full rounded-2xl border border-card-border bg-card px-4 py-3 text-center text-lg outline-none backdrop-blur focus:ring-2 focus:ring-accent"
        />
      )}
      <div className="grid w-full grid-cols-2 gap-4">
        {(["boy", "girl"] as const).map((sex) => (
          <button
            key={sex}
            type="button"
            onClick={() => pick(sex)}
            disabled={picked !== null}
            className={`flex flex-col items-center gap-2 rounded-3xl p-6 font-display text-2xl font-semibold text-white shadow-lg transition active:scale-95 ${
              sex === "boy" ? "bg-linear-to-br from-boy to-boy-deep" : "bg-linear-to-br from-girl to-girl-deep"
            } ${picked && picked !== sex ? "scale-90 opacity-30" : ""} ${picked === sex ? "scale-105 ring-4 ring-white" : ""}`}
          >
            <span className="text-5xl">{SEX_INFO[sex].emoji}</span>
            {sex === "boy" ? "Menino" : "Menina"}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- 4. Resultado ---------- */

export function ResultOverlay({
  reveal,
  secret,
  initialWall,
  guess,
  authorName,
  onReplay,
}: {
  reveal: PublicReveal;
  secret: RevealSecret;
  initialWall: WallData;
  guess: BabySex | null;
  authorName?: string;
  onReplay: () => void;
}) {
  const info = SEX_INFO[secret.sex];
  const gradient = secret.sex === "boy" ? "from-boy/95 to-boy-deep/95" : "from-girl/95 to-girl-deep/95";

  return (
    <div
      role="dialog"
      aria-label={info.label}
      className={`fixed inset-0 z-50 overflow-y-auto bg-linear-to-b ${gradient} text-white backdrop-blur-sm`}
    >
      <div className="mx-auto flex min-h-full max-w-md flex-col items-center gap-10 px-5 py-14">
        <div className="animate-pop-in flex flex-col items-center gap-4 text-center" aria-live="assertive">
          <span className="animate-float text-8xl">{info.emoji}</span>
          <h1 className="font-display text-6xl font-bold drop-shadow-md">{info.label}</h1>
          {secret.babyName && (
            <p className="font-display text-3xl">
              {secret.sex === "boy" ? "Bem-vindo" : "Bem-vinda"}, {secret.babyName}!
            </p>
          )}
          {guess && (
            <p className="mt-2 rounded-full bg-white/20 px-5 py-2 text-lg font-semibold">
              {guess === secret.sex ? "Você acertou o palpite! 🎯" : "Quase! Não foi dessa vez 😄"}
            </p>
          )}
          <button
            type="button"
            onClick={onReplay}
            className="mt-4 rounded-full border-2 border-white/80 px-6 py-3 font-display text-lg font-semibold transition hover:bg-white/15 active:scale-95"
          >
            Ver de novo ↺
          </button>
        </div>

        <Wall reveal={reveal} initialWall={initialWall} authorName={authorName} />
      </div>
    </div>
  );
}
