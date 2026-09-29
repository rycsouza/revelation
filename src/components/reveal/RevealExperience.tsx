"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { submitGuess } from "@/app/actions/public";
import { getDeviceId } from "@/lib/client/storage";
import { celebrate } from "@/lib/fx/celebrate";
import { setSoundMuted, unlockAudio } from "@/lib/fx/sound";
import type { BabySex, Guest, PublicReveal, RevealSecret } from "@/lib/reveal/types";
import { ThemeBackdrop } from "@/components/theme/ThemeBackdrop";
import { MECHANIC_COMPONENTS, needsSecretUpfront } from "./mechanics";
import { GuessStep, IntroStep, PregnancyStep, ResultOverlay } from "./steps";

type Step = "intro" | "pregnancy" | "guess" | "mechanic";

/** Tempo entre o instante da revelação e a tela de resultado: deixa o confete aparecer primeiro. */
const RESULT_DELAY = 1600;

async function fetchSecret(slug: string, attempts = 6): Promise<RevealSecret> {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(`/api/r/${encodeURIComponent(slug)}/secret`, { cache: "no-store" });
    if (res.ok) return res.json();
    // 423: o relógio do aparelho adiantou um pouco em relação ao servidor. Espera e tenta de novo.
    if (res.status !== 423) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Não foi possível carregar a revelação.");
}

export function RevealExperience({
  reveal,
  guest,
  serverNow,
}: {
  reveal: PublicReveal;
  guest: Guest | null;
  serverNow: number;
}) {
  const [step, setStep] = useState<Step>("intro");
  const [guess, setGuess] = useState<BabySex | null>(null);
  const [guessName, setGuessName] = useState<string | undefined>();
  const [secret, setSecret] = useState<RevealSecret | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [round, setRound] = useState(0);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const clockOffset = useRef(0);
  const secretRequest = useRef<Promise<RevealSecret> | null>(null);

  useEffect(() => {
    clockOffset.current = serverNow - Date.now();
  }, [serverNow]);

  const now = useCallback(() => Date.now() + clockOffset.current, []);

  const loadSecret = useCallback(() => {
    secretRequest.current ??= fetchSecret(reveal.slug).then(
      (s) => {
        setSecret(s);
        return s;
      },
      (err: unknown) => {
        secretRequest.current = null;
        throw err;
      },
    );
    return secretRequest.current;
  }, [reveal.slug]);

  function start() {
    unlockAudio();
    void audioRef.current?.play().catch(() => {});
    if (needsSecretUpfront(reveal.mechanic)) loadSecret().catch(() => {});
    setStep("pregnancy");
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    setSoundMuted(next);
    if (audioRef.current) audioRef.current.muted = next;
  }

  async function handleReveal() {
    try {
      const s = await loadSecret();
      celebrate(s.sex);
      setTimeout(() => setShowResult(true), RESULT_DELAY);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo deu errado.");
    }
  }

  function replay() {
    setShowResult(false);
    setRound((r) => r + 1);
  }

  const Mechanic = MECHANIC_COMPONENTS[reveal.mechanic];

  return (
    <main
      data-theme={reveal.theme}
      className="theme-bg relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10"
    >
      <ThemeBackdrop theme={reveal.theme} fixed />
      {reveal.musicUrl && <audio ref={audioRef} src={reveal.musicUrl} loop preload="auto" />}

      {step !== "intro" && (
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Ligar som" : "Desligar som"}
          className="fixed right-4 top-4 z-40 grid h-11 w-11 place-items-center rounded-full border border-card-border bg-card text-xl shadow backdrop-blur"
        >
          {muted ? "🔇" : "🔊"}
        </button>
      )}

      {step === "intro" && <IntroStep reveal={reveal} guest={guest} onStart={start} />}

      {step === "pregnancy" && (
        <PregnancyStep reveal={reveal} guest={guest} onNext={() => setStep(reveal.guessEnabled ? "guess" : "mechanic")} />
      )}

      {step === "guess" && (
        <GuessStep
          askName={!guest}
          onGuess={(g, name) => {
            setGuess(g);
            setGuessName(name);
            setStep("mechanic");
            // Não trava a experiência se o palpite não salvar: o placar só fica sem ele.
            void submitGuess({ slug: reveal.slug, deviceId: getDeviceId(), guestSlug: guest?.slug, name, guess: g }).catch(
              () => {},
            );
          }}
        />
      )}

      {step === "mechanic" && (
        <div key={round} className="animate-enter">
          <Mechanic reveal={reveal} secret={secret} onReveal={handleReveal} now={now} />
        </div>
      )}

      {error && (
        <div role="alert" className="fixed inset-x-4 bottom-6 z-50 mx-auto max-w-sm rounded-2xl bg-red-600 p-4 text-center text-white shadow-xl">
          {error}{" "}
          <button type="button" className="underline" onClick={() => location.reload()}>
            Tentar de novo
          </button>
        </div>
      )}

      {showResult && secret && (
        <ResultOverlay
          reveal={reveal}
          secret={secret}
          guess={guess}
          authorName={guest?.name ?? guessName}
          onReplay={replay}
        />
      )}
    </main>
  );
}
