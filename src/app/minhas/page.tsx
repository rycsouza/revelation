import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { MineClient } from "./MineClient";

export const metadata: Metadata = {
  title: "Minhas revelações",
  robots: { index: false },
};

export default async function MinePage({ searchParams }: PageProps<"/minhas">) {
  const { excluida } = await searchParams;
  return (
    <SiteShell narrow>
      <h1 className="mb-1 font-display text-3xl font-bold">Minhas revelações</h1>
      <p className="mb-6 text-muted">Ficam salvas só neste aparelho. Em outro celular, use o link de edição.</p>
      {excluida === "1" && (
        <p className="mb-4 rounded-2xl bg-green-50 p-4 text-green-800">Revelação apagada, junto com fotos e recados.</p>
      )}
      <MineClient />
    </SiteShell>
  );
}
