# Revelação 💌

Um link para mandar à família: primeiro a notícia da gravidez, depois a revelação do sexo do bebê, com confete, som e vibração no celular.

- **4 mecânicas:** raspadinha, estourar balões, caixa de presente e contagem regressiva (manual ou ao vivo, com horário marcado).
- **Link personalizado por pessoa:** "Oi, Vovó Maria! Você vai ser vovó!".
- **Até 3 fotos** na carta, em carrossel automático, e música de fundo.
- **3 temas animados:** nuvens, noite estrelada e jardim, em cores neutras para não dar pista.
- **Palpite, placar e mural de recados** para a família.
- **Sem spoiler:** o sexo só sai do servidor na hora da revelação, e a prévia do WhatsApp é neutra.
- **Sem cadastro:** quem cria vira dono naquele aparelho (cookie seguro) e recebe um link secreto de edição para outros aparelhos.
- **O navegador nunca fala com o banco nem com o Storage:** tudo passa pelo servidor (ver [revisão de segurança](docs/SECURITY_REVIEW.md)).
- **Privacidade:** tudo se apaga sozinho alguns meses depois da data prevista, ou na hora, pelo painel.

## Rodando localmente

Precisa de Node 22+ e, para criar revelações, Docker (para o Supabase local).

```bash
npm install
npm run db:start      # sobe o Supabase local no Docker e aplica o esquema
cp .env.example .env.local
```

O `db:start` imprime `API_URL` e `SERVICE_ROLE_KEY`. Coloque esses valores em `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no `.env.local`. Depois:

```bash
npm run dev
```

Abra http://localhost:3000. Sem Supabase o site também roda, mas só com as demos (`/r/demo-raspadinha`, `/r/demo-baloes`, `/r/demo-presente`, `/r/demo-contagem`, `/r/demo-ao-vivo`).

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm test` | Testes unitários (Vitest) |
| `npm run test:db` | Testes contra o Supabase local: autorização, IDOR, limites, permissões |
| `npm run lint` | ESLint |
| `npm run build` | Build de produção |
| `npm run db:start` / `db:stop` | Liga e desliga o Supabase local |

### Testando no celular

Com o celular na mesma rede Wi-Fi, abra `http://IP-DO-COMPUTADOR:3000` (o `npm run dev` mostra o endereço em *Network*). Como o navegador só fala com o próprio site, o celular não precisa alcançar o Supabase. Por ser `http://` e não `https://`, o botão "Copiar" pede para copiar manualmente; em produção funciona normal.

Para publicar, siga o [guia de deploy](docs/DEPLOY.md).

## Como funciona

### Páginas

| Rota | O que é |
| --- | --- |
| `/` | Landing pública |
| `/criar` | Formulário em 5 passos ([RevealForm](src/components/creator/RevealForm.tsx)) |
| `/r/[slug]?p=[convidado]` | A experiência da família ([RevealExperience](src/components/reveal/RevealExperience.tsx)) |
| `/painel/[slug]` | Painel do casal (SSR): links, palpites, recados, edição e exclusão. `#token` no fim é o link de edição |
| `/minhas` | Revelações que este aparelho acessa (SSR, a partir dos cookies de dono) |
| `/m/[slug]/[arquivo]` | Fotos e música, servidas do bucket privado |
| `/privacidade` | O que é guardado e quando é apagado |

### Sem spoiler

- O HTML da revelação e a prévia do link só levam dados neutros ([`PublicReveal`](src/lib/reveal/types.ts)).
- O sexo e o nome do bebê ficam numa tabela separada e só saem pela server action [`revealAction`](src/app/actions/public.ts), junto com o mural. Na contagem ao vivo, o servidor recusa até o horário chegar.
- O relógio do aparelho é corrigido pelo do servidor, para todo mundo revelar no mesmo segundo.
- O mural de recados só abre depois da revelação (alguém pode escrever "é menina!!").

### Sem login

Ao criar, o servidor gera um token aleatório, guarda **só o hash** e entrega o token num cookie `HttpOnly` (o JavaScript da página não lê). O painel é renderizado no servidor e só sai para o navegador com o cookie certo. Para abrir em outro aparelho, o link de edição `/painel/<slug>#<token>` é trocado por esse cookie. O token fica depois do `#`, então não aparece em logs nem no `Referer`. Toda [ação do dono](src/app/actions/owner.ts) confere o cookie e opera só pelo `id` autorizado.

### Dados ([`store.ts`](src/lib/reveal/store.ts))

- Supabase com RLS ligado, nenhuma policy pública e permissões só para a service role. O navegador não recebe nenhuma chave nem endereço do Supabase.
- Fotos (até 3) e música sobem **pelo servidor** (server actions, até 4 MB). Ele confere a assinatura real do arquivo e **reprocessa as fotos** (remove GPS/EXIF). O bucket é privado, e a rota `/m/...` só entrega arquivo ligado a uma revelação existente.
- Limites no Postgres (`hit_rate_limit`, por HMAC do IP): criação, palpites, recados, uploads e abertura do painel. Mais: 5 recados por aparelho, 3 fotos e 80 convidados.
- As revelações vencem 4 meses depois da data prevista (ou 1 ano sem data), e o [cron diário](src/app/api/cron/cleanup/route.ts) apaga as vencidas, com os arquivos.
- As demos (`demo-*`) não usam o banco: palpites e recados delas ficam em memória.

### Cache

- **Servidor:** a revelação fica 1 h no Data Cache do Next, e placar/mural 60 s. Toda escrita invalida a tag na hora (`updateTag`), então a família inteira abrindo o link vira uma consulta, sem ninguém ver dado velho.
- **CDN e navegador:** fotos e música têm nome único e ficam em cache (1 h na CDN, 1 dia no navegador).
- **Aba:** o resultado da revelação e o mural ficam no `sessionStorage` ("Ver de novo" e recarregar não consultam de novo), com revalidação em segundo plano. O router do Next guarda páginas dinâmicas por 30 s.

### Mecânicas

Cada mecânica é um componente em [src/components/reveal/mechanics](src/components/reveal/mechanics) com o mesmo contrato ([types.ts](src/components/reveal/mechanics/types.ts)): recebe a configuração e chama `onReveal()` no instante da revelação. Confete, som, vibração e a tela de resultado ficam por conta do fluxo.

Para criar uma mecânica nova:

1. Crie o componente em `src/components/reveal/mechanics/`.
2. Registre em [`index.ts`](src/components/reveal/mechanics/index.ts).
3. Adicione em `MECHANICS` e `MECHANIC_INFO` ([types.ts](src/lib/reveal/types.ts)) e no `check` da coluna `mechanic` (nova migration).

Os sons são sintetizados com Web Audio ([sound.ts](src/lib/fx/sound.ts)): nenhum arquivo de áudio, nenhum direito autoral.

## Stack

Next.js 16 (App Router, Server Actions), React 19, Tailwind 4, Supabase (Postgres + Storage), Zod, canvas-confetti, Vitest.
