import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacidade",
  description: "O que guardamos, quem vê e quando tudo é apagado.",
};

export default function PrivacyPage() {
  return (
    <SiteShell narrow>
      <article className="flex flex-col gap-6 leading-relaxed [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
        <h1 className="font-display text-4xl font-bold">Privacidade</h1>
        <p>
          O {site.name} é um projeto pessoal, feito por diversão e sem fins lucrativos. Não tem anúncios, não vende dados e
          não usa rastreadores. Aqui está, sem juridiquês, o que acontece com as informações.
        </p>

        <section className="flex flex-col gap-2">
          <h2>O que guardamos</h2>
          <ul>
            <li>O que vocês preenchem ao criar: nomes, mensagem, data prevista, sexo e nome do bebê.</li>
            <li>A foto e a música, se vocês enviarem.</li>
            <li>Os nomes dos convidados que vocês colocarem na lista.</li>
            <li>Os palpites e recados que a família deixar.</li>
            <li>
              Um código aleatório do aparelho de cada convidado (para contar um palpite por pessoa) e, por no máximo 1
              dia, um resumo irreversível (HMAC) do IP para limitar abuso. Não guardamos o IP em si.
            </li>
            <li>
              No aparelho de quem cria, um cookie técnico com o acesso ao painel. Não é de rastreamento e sai pelo botão
              “Tirar acesso deste aparelho”.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2>Quem vê</h2>
          <ul>
            <li>Só quem tem o link. As páginas não aparecem no Google.</li>
            <li>O sexo e o nome do bebê só saem do servidor na hora da revelação.</li>
            <li>
              Fotos e música ficam num armazenamento privado. O site só entrega o arquivo para quem abre o link de uma
              revelação que ainda existe. As fotos são reprocessadas no envio, e isso remove a localização (GPS) e
              outros dados escondidos que o celular grava.
            </li>
            <li>Palpites e recados aparecem para a família depois da revelação; o painel com os nomes é só de vocês.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2>Quando tudo é apagado</h2>
          <ul>
            <li>Automaticamente, 4 meses depois da data prevista (ou 1 ano depois de criar, se não tiver data).</li>
            <li>
              A qualquer momento, pelo botão “Apagar revelação” no painel. Apaga tudo, inclusive arquivos (cópias em
              cache de fotos já vistas podem levar até 1 hora para expirar).
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2>Serviços usados</h2>
          <p>
            Os dados ficam no Supabase (banco de dados e arquivos) e o site roda na Vercel. Os dois só processam os dados
            para o site funcionar.
          </p>
        </section>

        {site.contactEmail && (
          <section className="flex flex-col gap-2">
            <h2>Contato e denúncias</h2>
            <p>
              Para denunciar um conteúdo ou pedir a exclusão de dados, escreva para{" "}
              <a href={`mailto:${site.contactEmail}`} className="font-semibold underline">
                {site.contactEmail}
              </a>
              .
            </p>
          </section>
        )}
      </article>
    </SiteShell>
  );
}
