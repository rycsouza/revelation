"use client";

import { useRef } from "react";
import { randomId } from "@/lib/client/storage";
import type { PhotoItem } from "@/lib/client/upload";
import { MEDIA_RULES } from "@/lib/reveal/schema";

// Uma URL de prévia por arquivo, criada uma vez só. Não revogamos: são no máximo 3 fotos por página,
// e revogar na limpeza do efeito quebra a prévia quando o React monta o componente duas vezes (Strict Mode).
const previewUrls = new WeakMap<File, string>();
function previewUrl(file: File) {
  let url = previewUrls.get(file);
  if (!url) {
    url = URL.createObjectURL(file);
    previewUrls.set(file, url);
  }
  return url;
}

function Thumb({ item }: { item: PhotoItem }) {
  const src = "url" in item ? item.url : previewUrl(item.file);
  // eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:) ou do Storage
  return <img src={src} alt="" className="h-full w-full object-cover" />;
}

export function PhotoPicker({
  photos,
  max,
  onChange,
}: {
  photos: PhotoItem[];
  max: number;
  onChange: (photos: PhotoItem[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const room = max - photos.length;

  function move(index: number, delta: number) {
    const next = [...photos];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="font-semibold">
        Fotos <span className="font-normal text-muted">(até {max})</span>
      </span>

      <ul className="grid grid-cols-3 gap-2">
        {photos.map((item, i) => (
          <li key={item.key} className="relative aspect-square overflow-hidden rounded-2xl bg-black/5 shadow-inner">
            <Thumb item={item} />
            {i === 0 && photos.length > 1 && (
              <span className="absolute left-1.5 top-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">
                1ª
              </span>
            )}
            <button
              type="button"
              onClick={() => onChange(photos.filter((p) => p.key !== item.key))}
              aria-label={`Remover foto ${i + 1}`}
              className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/55 text-sm text-white"
            >
              ✕
            </button>
            {photos.length > 1 && (
              <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Mover foto ${i + 1} para antes`}
                  className="grid h-7 w-7 place-items-center rounded-full bg-black/55 text-sm text-white disabled:invisible"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === photos.length - 1}
                  aria-label={`Mover foto ${i + 1} para depois`}
                  className="grid h-7 w-7 place-items-center rounded-full bg-black/55 text-sm text-white disabled:invisible"
                >
                  →
                </button>
              </div>
            )}
          </li>
        ))}
        {room > 0 && (
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-card-border bg-white/50 text-muted transition hover:bg-white"
            >
              <span className="text-3xl leading-none">+</span>
              <span className="text-xs font-semibold">Adicionar</span>
            </button>
          </li>
        )}
      </ul>

      <input
        ref={inputRef}
        type="file"
        accept={MEDIA_RULES.photo.types.join(",")}
        multiple
        className="sr-only"
        aria-label="Escolher fotos"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []).slice(0, room);
          if (files.length) onChange([...photos, ...files.map((file) => ({ key: randomId(), file }))]);
          e.target.value = "";
        }}
      />
      <span className="text-sm text-muted">
        Ultrassom, o casal, o teste positivo… Com mais de uma, elas passam sozinhas dentro da carta. Reduzimos o
        tamanho automaticamente.
      </span>
    </div>
  );
}
