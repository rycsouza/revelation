"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { sfx, vibrate } from "@/lib/fx/sound";
import type { MechanicProps } from "./types";

/** Nos últimos segundos a tela troca o relógio por números gigantes. */
const FINAL_SECONDS = 10;

function parts(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return {
    dias: Math.floor(s / 86400),
    horas: Math.floor((s % 86400) / 3600),
    min: Math.floor((s % 3600) / 60),
    seg: s % 60,
  };
}

export function Countdown({ reveal, onReveal, now }: MechanicProps) {
  const scheduled = reveal.revealAt ? Date.parse(reveal.revealAt) : null;
  const [clock, setClock] = useState(now);
  // Sem horário marcado (ou se a pessoa chegou atrasada), a contagem começa no botão.
  const [manualTarget, setManualTarget] = useState<number | null>(null);
  const firedRef = useRef(false);
  const lastSecondRef = useRef<number | null>(null);

  const target = manualTarget ?? (scheduled !== null && scheduled > clock ? scheduled : null);
  const remaining = target !== null ? target - clock : null;
  const missed = scheduled !== null && scheduled <= clock && manualTarget === null;

  const onTick = useEffectEvent(() => {
    const t = now();
    setClock(t);
    if (target === null) return;
    const left = target - t;
    const second = Math.ceil(left / 1000);
    if (left <= FINAL_SECONDS * 1000 && second > 0 && second !== lastSecondRef.current) {
      lastSecondRef.current = second;
      sfx.tick();
      vibrate(second <= 3 ? 40 : 15);
    }
    if (left <= 0 && !firedRef.current) {
      firedRef.current = true;
      onReveal();
    }
  });

  useEffect(() => {
    const id = setInterval(onTick, 100);
    return () => clearInterval(id);
  }, []);

  if (remaining !== null && remaining <= FINAL_SECONDS * 1000) {
    const n = Math.max(0, Math.ceil(remaining / 1000));
    return (
      <div className="flex flex-col items-center gap-4" aria-live="assertive">
        <p className="font-display text-xl text-muted">{n > 0 ? "Preparados?" : "Agora!"}</p>
        <span
          key={n}
          className="animate-beat font-display text-[min(55vw,240px)] font-bold leading-none tabular-nums text-accent drop-shadow-[0_8px_30px_rgba(0,0,0,0.2)]"
        >
          {n > 0 ? n : "💥"}
        </span>
      </div>
    );
  }

  if (remaining !== null && scheduled !== null) {
    const p = parts(remaining);
    const when = new Date(scheduled).toLocaleString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    return (
      <div className="flex max-w-sm flex-col items-center gap-6 text-center">
        <p className="font-display text-xl text-muted">A revelação acontece para todo mundo ao mesmo tempo</p>
        <div className="flex gap-2 sm:gap-3">
          {(Object.entries(p) as [string, number][])
            .filter(([k, v]) => k !== "dias" || v > 0)
            .map(([k, v]) => (
              <div
                key={k}
                className="flex w-18 flex-col items-center rounded-2xl border border-card-border bg-card py-3 shadow-sm backdrop-blur"
              >
                <span className="font-display text-4xl font-bold tabular-nums">{String(v).padStart(2, "0")}</span>
                <span className="text-xs uppercase tracking-wider text-muted">{k}</span>
              </div>
            ))}
        </div>
        <p className="text-sm text-muted">
          Marcado para <strong className="text-fg">{when}</strong>.<br />
          Deixe esta página aberta: a contagem começa sozinha.
        </p>
      </div>
    );
  }

  return (
    <div className="flex max-w-sm flex-col items-center gap-6 text-center">
      <span className="animate-float text-7xl">⏰</span>
      <p className="font-display text-2xl">
        {missed ? "A contagem já aconteceu, mas ainda dá tempo de viver o momento!" : "Pronto para a contagem?"}
      </p>
      <button
        type="button"
        onClick={() => {
          lastSecondRef.current = null;
          setManualTarget(now() + FINAL_SECONDS * 1000 + 300);
        }}
        className="rounded-full bg-accent px-8 py-4 font-display text-xl font-semibold text-accent-fg shadow-lg transition active:scale-95"
      >
        Começar contagem
      </button>
    </div>
  );
}
