"use client";

import { useId, useState } from "react";
import { NEUTRAL_COLORS, sparkle } from "@/lib/fx/celebrate";
import { sfx, vibrate } from "@/lib/fx/sound";
import type { MechanicProps } from "./types";

// Cores neutras de propósito: nenhum balão pode dar pista antes da hora.
const BALLOONS = [
  { left: 8, top: 18, color: "#f2c14e", size: 1, tilt: 4, delay: 0 },
  { left: 38, top: 4, color: "#c8b6ff", size: 1.1, tilt: -3, delay: 0.4 },
  { left: 68, top: 16, color: "#b8e0d2", size: 0.95, tilt: 5, delay: 0.8 },
  { left: 18, top: 50, color: "#ffc8a2", size: 1.05, tilt: -5, delay: 0.2 },
  { left: 54, top: 46, color: "#fdfcf7", size: 1, tilt: 3, delay: 0.6 },
] as const;

function Balloon({ color }: { color: string }) {
  const shadeId = useId();
  return (
    <svg viewBox="0 0 100 160" className="h-full w-full drop-shadow-lg" aria-hidden>
      <path d="M50 6C22 6 6 30 6 56c0 30 24 52 44 58 20-6 44-28 44-58C94 30 78 6 50 6Z" fill={color} />
      <path d="M50 6C22 6 6 30 6 56c0 30 24 52 44 58 20-6 44-28 44-58C94 30 78 6 50 6Z" fill={`url(#${shadeId})`} />
      <ellipse cx="32" cy="36" rx="10" ry="16" fill="#fff" opacity="0.45" transform="rotate(-20 32 36)" />
      <path d="M44 114h12l-6 9Z" fill={color} />
      <path d="M50 123c-6 10 6 16 0 26" stroke="#8a7f95" strokeWidth="1.5" fill="none" />
      <defs>
        <radialGradient id={shadeId} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.18" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export function Balloons({ onReveal }: MechanicProps) {
  const [popping, setPopping] = useState<Set<number>>(new Set());
  const [gone, setGone] = useState<Set<number>>(new Set());

  const left = BALLOONS.length - popping.size;

  function pop(index: number, el: HTMLElement) {
    if (popping.has(index)) return;
    const next = new Set(popping).add(index);
    setPopping(next);

    const rect = el.getBoundingClientRect();
    const isLast = next.size === BALLOONS.length;
    sfx.pop();
    vibrate(isLast ? 60 : 30);
    if (!isLast) sparkle(rect.left + rect.width / 2, rect.top + rect.height * 0.35, NEUTRAL_COLORS, 18);

    setTimeout(() => setGone((g) => new Set(g).add(index)), 180);
    if (isLast) onReveal();
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="font-display text-xl text-muted" aria-live="polite">
        {left === 0
          ? "Estourou! 🥳"
          : left === 1
            ? "Falta só um… é esse!"
            : left === BALLOONS.length
              ? "Estoure todos os balões!"
              : `Faltam ${left} balões`}
      </p>

      <div className="relative h-[min(110vw,460px)] w-[min(92vw,400px)]">
        {BALLOONS.map((b, i) => {
          if (gone.has(i)) return null;
          const isPopping = popping.has(i);
          const lastOne = left === 1 && !isPopping;
          return (
            <button
              key={i}
              type="button"
              aria-label={`Balão ${i + 1}`}
              onPointerDown={(e) => pop(i, e.currentTarget)}
              className={`absolute touch-manipulation transition-[left,top,scale] duration-700 ease-out ${
                isPopping ? "animate-balloon-pop" : "animate-float"
              }`}
              style={
                {
                  // O último balão vai para o centro e cresce: é ele que guarda a resposta.
                  left: lastOne ? "36%" : `${b.left}%`,
                  top: lastOne ? "24%" : `${b.top}%`,
                  width: `${28 * b.size}%`,
                  aspectRatio: "100 / 160",
                  animationDelay: isPopping ? "0s" : `${b.delay}s`,
                  "--tilt": `${b.tilt}deg`,
                  scale: lastOne ? "1.6" : undefined,
                  zIndex: lastOne ? 10 : undefined,
                } as React.CSSProperties
              }
            >
              <Balloon color={b.color} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
