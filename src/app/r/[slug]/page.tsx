import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RevealExperience } from "@/components/reveal/RevealExperience";
import { findReveal } from "@/lib/reveal/store";

// A prévia do link no WhatsApp precisa ser neutra: nada de cor, nome do bebê ou emoji azul/rosa.
export async function generateMetadata({ params }: PageProps<"/r/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const record = await findReveal(slug);
  const title = { absolute: record ? `Uma novidade de ${record.reveal.parents} 💌` : "Revelação" };
  const description = "Toque para abrir a surpresa.";
  return {
    title,
    description,
    robots: { index: false, follow: false },
    // O openGraph daqui substitui o do layout inteiro, então a imagem neutra precisa vir junto.
    openGraph: {
      title: title.absolute,
      description,
      type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Um envelope fechado com um coração" }],
    },
  };
}

/** Relógio do servidor: o cliente usa para corrigir o horário do aparelho na contagem sincronizada. */
function serverClock() {
  return Date.now();
}

export default async function RevealPage({ params, searchParams }: PageProps<"/r/[slug]">) {
  const { slug } = await params;
  const { p } = await searchParams;
  const record = await findReveal(slug);
  if (!record) notFound();

  const guest = typeof p === "string" ? (record.guests.find((g) => g.slug === p) ?? null) : null;

  // Só a parte pública vai para o cliente. O segredo sai pela rota /api/r/[slug]/secret.
  return <RevealExperience reveal={record.reveal} guest={guest} serverNow={serverClock()} />;
}
