import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { PanelClient } from "./PanelClient";

export const metadata: Metadata = {
  title: "Painel da revelação",
  robots: { index: false, follow: false },
  // O token fica no # da URL e nunca vai ao servidor, mas por garantia não vaza em links clicados daqui.
  referrer: "no-referrer",
};

export default async function PanelPage({ params, searchParams }: PageProps<"/painel/[slug]">) {
  const { slug } = await params;
  const { novo, aviso } = await searchParams;
  return (
    <SiteShell narrow>
      <PanelClient slug={slug} isNew={novo === "1"} uploadFailed={aviso === "upload"} />
    </SiteShell>
  );
}
