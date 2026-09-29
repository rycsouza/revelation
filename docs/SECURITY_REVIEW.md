# Revisão de segurança

Auditoria feita seguindo [security-rules.md](security-rules.md), junto com a mudança de arquitetura "o navegador nunca fala com o Supabase".

## Sumário executivo

- **Antes:** o banco já era acessado só pelo servidor (service role, RLS sem policies públicas). Mas o **Storage** era acessado direto pelo navegador: fotos e música vinham de um bucket público, e os uploads iam do navegador para uma URL assinada, sem o servidor ver o arquivo. O token de edição ficava no `localStorage` e era enviado como parâmetro em cada ação.
- **Depois:**
  - O navegador só fala com o próprio site (`connect-src 'self'` na CSP).
  - O bucket é privado. Arquivos passam pelo servidor, que confere a assinatura real e reprocessa as fotos (remove GPS/EXIF).
  - O dono tem sessão em cookie HttpOnly, e o painel é renderizado no servidor (SSR).
  - Há limite de requisições no banco, headers de segurança, erros genéricos, logs estruturados e 52 testes (39 unitários + 13 contra o banco).
- **Áreas mais críticas:** uploads (arquivo controlado pelo usuário) e o acesso do dono (sem conta, só o link secreto).

## Achados e correções

| # | Tier | Achado | Status |
|---|------|--------|--------|
| G1 | Grave | Upload sem validação do conteúdo real: o servidor não via o arquivo; `file.type` (do cliente) decidia o tipo | ✅ Corrigido |
| G2 | Grave | Fotos com metadados: foto de celular carrega EXIF/GPS (endereço da família) e ia para um bucket público | ✅ Corrigido |
| M1 | Médio | Token de edição no `localStorage` (roubável por XSS) e trafegando em cada ação | ✅ Corrigido |
| M2 | Médio | Placar manipulável: um palpite por "ID de aparelho", mas o ID vem do cliente, sem limite por IP | ✅ Corrigido |
| M3 | Médio | Sem rate limit em recados e palpites; hash de IP sem chave (SHA-256 puro dá para reverter por força bruta) | ✅ Corrigido |
| M4 | Médio | Erros do banco repassados ao usuário (nome de constraint, detalhes internos) | ✅ Corrigido |
| M5 | Médio | Schemas aceitavam campos extras (base para mass assignment futuro) e textos sem normalização | ✅ Corrigido |
| M6 | Médio | Placar lia todas as linhas de palpites (sem limite); consultas com `select *` traziam `edit_token_hash` sem necessidade | ✅ Corrigido |
| M7 | Médio | Bucket público: qualquer um com a URL baixava, inclusive arquivos já desligados da revelação | ✅ Corrigido |
| B1 | Moderado | Headers de segurança ausentes (CSP, HSTS, frame-ancestors…) e `X-Powered-By` exposto | ✅ Corrigido |
| B2 | Moderado | Segredo do cron comparado com `!==` (não é tempo constante) | ✅ Corrigido |
| B3 | Moderado | Variáveis de ambiente sem validação no boot | ✅ Corrigido |
| B4 | Moderado | Sem testes negativos de autorização/IDOR | ✅ Corrigido |
| B5 | Moderado | Endpoint REST público `GET /api/r/[slug]/secret` (superfície desnecessária) | ✅ Removido |

### G1: upload sem validação do conteúdo
- **Impacto:** um HTML ou SVG com script, renomeado para `.jpg`, seria guardado e servido. Com `nosniff` ausente, poderia ser interpretado como página.
- **Correção:**
  - O upload passa por server action (`uploadPhotoAction` / `setMusicAction`).
  - [file-signature.ts](../src/lib/security/file-signature.ts) confere os *magic bytes*.
  - O nome do arquivo é gerado no servidor, e o tipo servido vem da allowlist.
  - Limite de 4 MB por arquivo e de 3 fotos (reforçado por check constraint no banco).
  - Tudo é servido com `nosniff`, `Content-Disposition: inline` e `CSP: default-src 'none'; sandbox`.
- **Testes:** `file-signature.test.ts`, `uploads.test.ts` (SVG com script, JPEG falso com PHP, HTML como música, arquivo acima de 4 MB).

### G2: EXIF/GPS nas fotos
- **Correção:** toda foto é **decodificada e reencodada** com `sharp` ([uploads.ts](../src/lib/security/uploads.ts)): rotação aplicada, redimensionada para 1600px, JPEG novo e sem metadados. Isso também elimina arquivos *polyglot*.
- **Teste:** `uploads.test.ts` gera uma foto com GPS no EXIF e confere que a saída não tem EXIF.

### M1: token de edição no navegador
- **Correção** ([owner-session.ts](../src/lib/owner-session.ts)):
  - O token fica num cookie `HttpOnly`, `SameSite=Lax` e `Secure` em produção, que vence junto com a revelação.
  - O link de edição (`/painel/<slug>#<token>`) é trocado pelo cookie uma vez, e o `#` é apagado da barra de endereço.
  - O painel e "Minhas" são SSR: sem cookie válido, não sai nenhum dado.
  - O link de edição não vai no HTML; só aparece quando o dono pede.
  - Todas as ações do dono operam **só** pelo `id` que a checagem do cookie devolve.
- **CSRF:** server actions só aceitam POST com `Origin` igual ao host. Somado ao `SameSite=Lax`, um site de terceiros não consegue disparar ações.
- **Testes:** `store.db.test.ts` (token de outra revelação não abre; "Minhas" ignora cookie com token trocado) e `config.test.ts` (flags do cookie).

### M2 e M3: abuso do placar, do mural e dos uploads
- **Correção:**
  - A função `hit_rate_limit` no Postgres (janela fixa e atômica) é chamada só pelo servidor ([rate-limit.ts](../src/lib/security/rate-limit.ts)).
  - Limites: 10 criações/h por IP, 40 palpites/h e 15 recados/h por IP e revelação, 30 uploads/h por revelação e 20 tentativas de abrir painel a cada 10 min por IP.
  - O IP vira **HMAC** com chave derivada do segredo do servidor. As linhas de limite expiram em 1 dia, apagadas pelo cron.
- **Teste:** `store.db.test.ts` (a 21ª tentativa é bloqueada).

### M4 a M7
- `fail()` registra o erro do banco e devolve uma mensagem genérica. `StoreError` é reservado para textos escritos para o usuário.
- `z.strictObject` em todas as entradas: campo extra reprova a validação. Os textos passam por limpeza de caracteres de controle, as datas são validadas de verdade, e o ID de aparelho e o token têm formato fixo.
- O placar usa `count` por sexo, o mural tem no máximo 100 recados e o painel no máximo 500 palpites. As consultas usam colunas explícitas.
- Bucket privado (migration `20261001000000`). A rota `/m/<slug>/<arquivo>` só entrega arquivo **ligado** a uma revelação existente e não vencida.
- **Testes:** `schema.test.ts` (campos `id`, `edit_token_hash`, `expires_at` e slug de convidado com injeção de filtro são recusados) e `store.db.test.ts` (a chave pública não lê tabelas nem o bucket; dono de A não apaga recado nem foto de B).

## Cache (sem abrir brecha)

| Camada | O quê | Validade | Invalidação |
|---|---|---|---|
| Servidor (Data Cache do Next) | revelação pelo slug | 1 h | `updateTag` em toda escrita do dono; cron com `revalidateTag` |
| Servidor | placar + mural | 60 s | `updateTag` a cada palpite ou recado |
| CDN (Vercel) | fotos e música (`/m/...`) | 1 h (`s-maxage`) | nomes únicos; apagar a revelação deixa a URL em 404 depois do cache |
| Navegador (HTTP) | fotos e música | 1 dia | nomes únicos |
| Navegador (sessionStorage) | resultado da revelação / mural | 10 min / 30 s + revalidação em segundo plano | descartado depois do palpite ou recado |
| Navegador (router) | páginas dinâmicas ao navegar | 30 s (`staleTimes`) | `refresh()` nas ações |

Páginas do dono (`/painel`, `/minhas`) usam `Cache-Control: private, no-store`. O segredo (sexo) fica em cache no servidor, mas nunca vai para o HTML antes da hora, e a trava da contagem é conferida **fora** do cache, a cada pedido.

## Testes

```bash
npm test          # 39 testes unitários (arquivos, caminhos, schemas, cookie, cache, env, trava da contagem)
npm run db:start  # sobe o Supabase local (Docker)
npm run test:db   # 13 testes contra o banco local: autorização, IDOR, limites, chave pública, bucket privado
```

Casos negativos cobertos: token errado e token de outra revelação, IDOR em recado e foto, campos extras (mass assignment), path traversal na mídia, SVG/HTML/PHP disfarçados, arquivo grande demais, chave pública tentando ler, escrever ou chamar a função, e rate limit estourado.

## Riscos residuais

| Tier | Risco | Por que ficou | Próximo passo |
|---|---|---|---|
| Moderado | CSP com `'unsafe-inline'` em scripts | O Next precisa de scripts inline; nonce obrigaria toda página a ser dinâmica (perde cache de HTML) | Se aparecer conteúdo HTML de usuário, migrar para CSP com nonce via `proxy.ts` |
| Moderado | Quem tem o link de edição é dono (sem conta, sem MFA) | Decisão de produto (sem cadastro). O token tem 192 bits e o hash é comparado em tempo constante | Se virar produto maior, login por e-mail (Supabase Auth) |
| Moderado | Rate limit "deixa passar" se o banco falhar | Disponibilidade de um site pessoal; o erro fica no log | Monitorar `rate_limit_unavailable` nos logs da Vercel |
| Moderado | Arquivo apagado pode sair do cache da CDN por até 1 h, e do navegador de quem já viu por até 1 dia | Custo/desempenho | Aceitável; está explicado na página de privacidade |
| Moderado | IP vem de `x-forwarded-for` | Na Vercel, o valor é definido pela plataforma. Fora dela, poderia ser forjado | Manter o deploy na Vercel ou ajustar `clientIpHash` |
| Moderado | Música não é reencodada (só a assinatura é conferida) | Reencodar áudio exigiria ffmpeg | É servida com `sandbox` + `nosniff`; risco baixo |
| Moderado | Sem antivírus nos uploads | Só imagens reprocessadas e áudio validado são aceitos | Não aplicável para os tipos permitidos |
