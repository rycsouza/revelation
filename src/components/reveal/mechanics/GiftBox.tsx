"use client";

import { useState } from "react";
import { SEX_INFO } from "@/lib/reveal/types";
import { sfx, vibrate } from "@/lib/fx/sound";
import type { MechanicProps } from "./types";

const TAPS_TO_OPEN = 3;

const HINTS = ["Toque no presente 🎁", "Hmm… tem algo aí dentro!", "Mais uma vez!", "Uau! 🥳"];

// Balões e corações que sobem da caixa quando ela abre.
const RISERS = [
  { dx: "-110px", delay: 0, shape: "heart", size: 34 },
  { dx: "-60px", delay: 0.15, shape: "balloon", size: 44 },
  { dx: "-10px", delay: 0.05, shape: "heart", size: 28 },
  { dx: "30px", delay: 0.25, shape: "balloon", size: 50 },
  { dx: "80px", delay: 0.1, shape: "heart", size: 36 },
  { dx: "120px", delay: 0.3, shape: "balloon", size: 40 },
  { dx: "-140px", delay: 0.35, shape: "balloon", size: 36 },
  { dx: "10px", delay: 0.45, shape: "heart", size: 42 },
] as const;

function Riser({ shape, color, size }: { shape: "heart" | "balloon"; color: string; size: number }) {
  return shape === "heart" ? (
    <svg viewBox="0 0 32 30" width={size} height={size} aria-hidden>
      <path d="M16 29S1 19.5 1 9.5A7.5 7.5 0 0 1 16 6a7.5 7.5 0 0 1 15 3.5C31 19.5 16 29 16 29Z" fill={color} />
    </svg>
  ) : (
    <svg viewBox="0 0 40 64" width={size} height={size * 1.6} aria-hidden>
      <ellipse cx="20" cy="20" rx="17" ry="20" fill={color} />
      <ellipse cx="13" cy="12" rx="4" ry="6" fill="#fff" opacity="0.5" />
      <path d="M20 40c-3 8 3 12 0 22" stroke="#fff" strokeOpacity="0.7" fill="none" />
    </svg>
  );
}

export function GiftBox({ secret, onReveal }: MechanicProps) {
  const [taps, setTaps] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const open = taps >= TAPS_TO_OPEN;
  const colors = secret ? SEX_INFO[secret.sex].colors : ["#f2c14e", "#fdfcf7"];

  function tap() {
    if (open) return;
    const next = taps + 1;
    setTaps(next);
    setShakeKey((k) => k + 1);
    if (next < TAPS_TO_OPEN) {
      sfx.thump();
      vibrate(30 * next);
    } else {
      sfx.pop();
      setTimeout(onReveal, 450);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="font-display text-xl text-muted" aria-live="polite">
        {HINTS[Math.min(taps, HINTS.length - 1)]}
      </p>

      <button
        type="button"
        onClick={tap}
        aria-label="Abrir o presente"
        className="relative isolate mt-24 h-56 w-56 touch-manipulation select-none"
      >
        {open && (
          <>
            <div
              aria-hidden
              className="animate-rays absolute -inset-24 -z-10 rounded-full"
              style={{
                background: `repeating-conic-gradient(from 0deg, ${colors[0]}55 0deg 12deg, transparent 12deg 30deg)`,
                maskImage: "radial-gradient(circle, #000 30%, transparent 70%)",
              }}
            />
            {RISERS.map((r, i) => (
              <span
                key={i}
                className="animate-rise absolute bottom-24 left-1/2 -ml-5"
                style={{ "--dx": r.dx, animationDelay: `${r.delay}s` } as React.CSSProperties}
              >
                <Riser shape={r.shape} size={r.size} color={colors[i % 3]} />
              </span>
            ))}
          </>
        )}

        {/* Caixa: balança mais forte a cada toque */}
        <div
          key={shakeKey}
          className={`absolute inset-0 ${shakeKey > 0 && !open ? "animate-shake" : taps === 0 ? "animate-wiggle" : ""}`}
          style={{ "--shake": `${4 + taps * 5}px` } as React.CSSProperties}
        >
          <div className="absolute inset-x-3 bottom-0 top-16 rounded-b-2xl bg-[#fff7ec] shadow-2xl ring-1 ring-black/5">
            <div className="absolute inset-y-0 left-1/2 w-9 -translate-x-1/2 bg-gold" />
            <div className="absolute inset-0 rounded-b-2xl bg-[radial-gradient(#f2c14e33_2px,transparent_2px)] bg-size-[18px_18px]" />
          </div>

          <div className={`absolute inset-x-0 top-8 h-12 ${open ? "animate-lid-off" : ""}`}>
            <div className="absolute inset-0 rounded-xl bg-[#fffaf3] shadow-lg ring-1 ring-black/5">
              <div className="absolute inset-y-0 left-1/2 w-9 -translate-x-1/2 bg-gold" />
            </div>
            {/* Laço */}
            <div className="absolute -top-9 left-1/2 h-10 w-24 -translate-x-1/2">
              <div className="absolute left-0 top-1 h-9 w-11 -rotate-12 rounded-[60%_40%_40%_60%] border-[6px] border-gold" />
              <div className="absolute right-0 top-1 h-9 w-11 rotate-12 rounded-[40%_60%_60%_40%] border-[6px] border-gold" />
              <div className="absolute left-1/2 top-4 h-6 w-6 -translate-x-1/2 rounded-full bg-gold" />
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}
