import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { isStoreConfigured } from "@/lib/reveal/store";
import { CreateClient } from "./CreateClient";

// Depende das variáveis de ambiente em tempo de execução, não do build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Criar revelação",
  description: "Monte a revelação do seu bebê e mande para a família.",
};

export default function CreatePage() {
  const enabled = isStoreConfigured();
  return (
    <SiteShell narrow>
      <h1 className="mb-1 font-display text-3xl font-bold">Criar revelação</h1>
      <p className="mb-6 text-muted">Leva uns 3 minutos. Dá para mudar tudo depois.</p>
      {enabled ? (
        <CreateClient />
      ) : (
        <p className="rounded-2xl bg-amber-50 p-5 text-amber-900">
          A criação está desligada porque o Supabase não foi configurado. Veja o README para ligar. Enquanto isso, as
          demonstrações da página inicial funcionam normalmente.
        </p>
      )}
    </SiteShell>
  );
}
