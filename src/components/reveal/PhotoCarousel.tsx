"use client";

import { useEffect, useRef, useState } from "react";

const INTERVAL = 3500;

/** Uma foto: imagem simples. Duas ou três: troca sozinha com fade, e dá para tocar nos pontinhos ou arrastar. */
export function PhotoCarousel({ urls, alt }: { urls: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  // Muda sempre que a pessoa interage, para reiniciar o tempo do avanço automático.
  const [interaction, setInteraction] = useState(0);
  const touchX = useRef<number | null>(null);
  const many = urls.length > 1;

  useEffect(() => {
    if (!many) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % urls.length), INTERVAL);
    return () => clearInterval(id);
  }, [many, urls.length, interaction]);

  function go(next: number) {
    setIndex((next + urls.length) % urls.length);
    setInteraction((n) => n + 1);
  }

  if (urls.length === 0) return null;

  return (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black/5 shadow-inner"
      aria-roledescription={many ? "carrossel" : undefined}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null || !many) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
      }}
    >
      {urls.map((url, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- fotos vêm do Storage (URL externa) ou de prévia local
        <img
          key={url}
          src={url}
          alt={many ? `${alt} (${i + 1} de ${urls.length})` : alt}
          aria-hidden={i !== index}
          className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out ${
            i === index ? "scale-100 opacity-100" : "scale-105 opacity-0"
          }`}
        />
      ))}

      {many && (
        <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
          {urls.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => go(i)}
              aria-label={`Ver foto ${i + 1}`}
              aria-current={i === index}
              className={`h-2 rounded-full bg-white shadow transition-all ${i === index ? "w-6" : "w-2 opacity-60"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
