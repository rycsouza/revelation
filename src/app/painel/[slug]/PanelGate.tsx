"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { openPanelAction } from "@/app/actions/owner";
import { Card } from "@/components/creator/ui";

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/**
 * Chegou pelo link de edição (/painel/<slug>#<token>) num aparelho sem sessão:
 * troca o token por um cookie HttpOnly, apaga o # da barra de endereço e recarrega o painel (SSR).
 * O token fica depois do #, então nunca vai para o servidor em GET, logs ou Referer.
 */
export function PanelGate({ slug }: { slug: string }) {
  const router = useRouter();
  const token = useSyncExternalStore(
    subscribeHash,
    () => decodeURIComponent(window.location.hash.slice(1)),
    () => null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    void openPanelAction({ slug, token }).then((res) => {
      if (!active) return;
      if (!res.ok) return setError(res.error);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      router.refresh();
    });
    return () => {
      active = false;
    };
  }, [router, slug, token]);

  if (token === null || (token && !error)) {
    return <p className="animate-pulse py-20 text-center text-muted">Abrindo painel…</p>;
  }

  return (
    <Card>
      <h1 className="font-display text-2xl font-semibold">Não conseguimos abrir o painel</h1>
      <p className="text-muted">
        {error ?? "Este aparelho ainda não tem acesso. Abra o link de edição completo que vocês guardaram."}
      </p>
      <Link href="/minhas" className="font-semibold text-accent underline">
        Ver minhas revelações
      </Link>
    </Card>
  );
}
