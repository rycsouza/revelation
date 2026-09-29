"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { editPath, listMyReveals, MINE_KEY, type MyReveal } from "@/lib/client/storage";

// Lê o localStorage como store externo: no servidor a lista é vazia (null = ainda carregando).
let cache: { raw: string | null; list: MyReveal[] } = { raw: null, list: [] };
function snapshot() {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(MINE_KEY);
  } catch {}
  if (raw !== cache.raw) cache = { raw, list: listMyReveals() };
  return cache.list;
}
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

export function MineClient() {
  const list = useSyncExternalStore(subscribe, snapshot, () => null);

  if (list === null) return <p className="animate-pulse text-muted">Carregando…</p>;

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[2rem] border border-card-border bg-card p-8 text-center">
        <span className="text-5xl" aria-hidden>
          🍼
        </span>
        <p className="text-muted">Nenhuma revelação criada neste aparelho ainda.</p>
        <Link href="/criar" className="rounded-full bg-accent px-6 py-3 font-display font-semibold text-accent-fg shadow">
          Criar revelação
        </Link>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {list.map((r) => (
        <li key={r.slug}>
          <Link
            href={editPath(r.slug, r.token)}
            className="flex items-center justify-between gap-4 rounded-3xl border border-card-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5"
          >
            <span>
              <span className="block font-display text-xl font-semibold">{r.parents}</span>
              <span className="text-sm text-muted">
                Criada em {new Date(r.createdAt).toLocaleDateString("pt-BR", { dateStyle: "long" })}
              </span>
            </span>
            <span className="shrink-0 whitespace-nowrap font-semibold text-accent" aria-hidden>
              Abrir →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
