import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site/SiteShell";
import { currentOwnerId } from "@/lib/owner-session";
import { fetchDashboard } from "@/lib/reveal/store";
import { isRevealSlug } from "@/lib/security/media-path";
import { site } from "@/lib/site";
import { PanelClient } from "./PanelClient";
import { PanelGate } from "./PanelGate";

export const metadata: Metadata = {
  title: "Painel da revelação",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/** Origem para montar os links de compartilhar (no celular pela rede local também funciona). */
async function requestOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return host && /^[a-z0-9.:-]+$/i.test(host) ? `${proto}://${host}` : site.url;
}

/**
 * Painel renderizado no servidor: os dados só saem se o cookie de dono deste navegador
 * abrir esta revelação. Sem cookie, mostra o PanelGate (que aceita o link de edição).
 */
export default async function PanelPage({ params, searchParams }: PageProps<"/painel/[slug]">) {
  const { slug } = await params;
  if (!isRevealSlug(slug)) notFound();
  const { novo, aviso } = await searchParams;

  const id = await currentOwnerId(slug);
  const dashboard = id ? await fetchDashboard(id) : null;

  return (
    <SiteShell narrow>
      {dashboard ? (
        <PanelClient
          slug={slug}
          origin={await requestOrigin()}
          dashboard={dashboard}
          isNew={novo === "1"}
          uploadFailed={aviso === "upload"}
        />
      ) : (
        <PanelGate slug={slug} />
      )}
    </SiteShell>
  );
}
