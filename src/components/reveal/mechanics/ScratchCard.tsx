"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { SEX_INFO } from "@/lib/reveal/types";
import { vibrate } from "@/lib/fx/sound";
import type { MechanicProps } from "./types";

/** Quanto da película precisa sair para considerar raspado. */
const CLEAR_THRESHOLD = 0.5;

function paintFoil(ctx: CanvasRenderingContext2D, w: number, h: number, font: string) {
  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, "#d9d4c7");
  gradient.addColorStop(0.35, "#f4f1ea");
  gradient.addColorStop(0.5, "#c9c2b2");
  gradient.addColorStop(0.7, "#efe9dc");
  gradient.addColorStop(1, "#bdb5a3");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  // Brilhinhos e pontos de interrogação espalhados.
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.5})`;
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 1.8 + 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(120,110,95,0.18)";
  ctx.font = `600 ${Math.round(w * 0.09)}px ${font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if ((row === 1 || row === 2) && (col === 1 || col === 2)) continue;
      ctx.fillText("?", (col + 0.5) * (w / 4), (row + 0.5) * (h / 4));
    }
  }

  ctx.fillStyle = "rgba(80,70,60,0.75)";
  ctx.font = `700 ${Math.round(w * 0.085)}px ${font}`;
  ctx.fillText("Raspe aqui ✨", w / 2, h / 2);
}

export function ScratchCard({ secret, onReveal }: MechanicProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);

  const finish = useEffectEvent(() => {
    setDone(true);
    onReveal();
  });
  const markStarted = useEffectEvent(() => setStarted(true));

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const { width, height } = wrap.getBoundingClientRect();
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.scale(dpr, dpr);
    // O canvas não entende var(--font-*): pega o nome real da fonte carregada pelo next/font.
    const font = getComputedStyle(wrap).getPropertyValue("--font-fredoka").trim() || "sans-serif";
    paintFoil(ctx, width, height, font);

    const brush = Math.max(22, width * 0.08);
    let drawing = false;
    let finished = false;
    let last: { x: number; y: number } | null = null;
    let moves = 0;
    let touched = false;

    // Se a fonte ainda não tinha carregado, redesenha (só enquanto ninguém raspou).
    void document.fonts.ready.then(() => {
      if (touched) return;
      ctx.globalCompositeOperation = "source-over";
      paintFoil(ctx, width, height, font);
    });

    const point = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const scratch = (p: { x: number; y: number }) => {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = brush;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo((last ?? p).x, (last ?? p).y);
      ctx.lineTo(p.x + 0.01, p.y);
      ctx.stroke();
      last = p;
    };

    const check = () => {
      if (finished) return;
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let clear = 0;
      let total = 0;
      // Amostra 1 a cada 24 pixels: suficiente e barato.
      for (let i = 3; i < data.length; i += 4 * 24) {
        total++;
        if (data[i] < 128) clear++;
      }
      if (clear / total >= CLEAR_THRESHOLD) {
        finished = true;
        finish();
      }
    };

    const down = (e: PointerEvent) => {
      if (finished) return;
      drawing = true;
      touched = true;
      last = null;
      canvas.setPointerCapture(e.pointerId);
      markStarted();
      scratch(point(e));
    };
    const move = (e: PointerEvent) => {
      if (!drawing || finished) return;
      scratch(point(e));
      moves++;
      if (moves % 10 === 0) {
        vibrate(6);
        check();
      }
    };
    const up = () => {
      drawing = false;
      last = null;
      check();
    };

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
    };
  }, []);

  const info = secret ? SEX_INFO[secret.sex] : null;

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="font-display text-xl text-muted" aria-live="polite">
        {done ? "Descobriu! 🥳" : started ? "Continua, tá quase…" : "Raspe o cartão com o dedo"}
      </p>

      <div
        ref={wrapRef}
        className="relative aspect-square w-[min(80vw,340px)] overflow-hidden rounded-[2rem] shadow-2xl ring-8 ring-white/70"
      >
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center gap-2 text-white ${
            secret?.sex === "boy"
              ? "bg-linear-to-br from-boy to-boy-deep"
              : secret?.sex === "girl"
                ? "bg-linear-to-br from-girl to-girl-deep"
                : "bg-neutral-300"
          }`}
        >
          {info ? (
            <>
              <span className="text-6xl">{info.emoji}</span>
              <span className="font-display text-4xl font-bold drop-shadow">{info.label}</span>
              {secret?.babyName && <span className="text-lg font-semibold opacity-90">{secret.babyName}</span>}
            </>
          ) : (
            <span className="animate-pulse text-4xl">…</span>
          )}
        </div>
        <canvas
          ref={canvasRef}
          aria-label="Cartão de raspar"
          className={`absolute inset-0 h-full w-full cursor-pointer touch-none transition-opacity duration-700 ${
            done ? "pointer-events-none opacity-0" : ""
          }`}
        />
      </div>
    </div>
  );
}
