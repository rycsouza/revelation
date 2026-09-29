# Colocando no ar

O código está pronto. Estes passos dependem de contas suas e levam uns 20 minutos no total.

## 1. GitHub

Crie um repositório (público, se quiser mostrar no LinkedIn) e suba o código:

```bash
git add -A
git commit -m "Revelação: primeira versão"
git remote add origin git@github.com:SEU-USUARIO/revelacao.git
git push -u origin main
```

## 2. Supabase (banco e arquivos)

1. Em https://supabase.com, crie um projeto. Escolha a região **South America (São Paulo)**.
2. Aplique o esquema. Há dois jeitos:
   - **Pelo painel:** abra *SQL Editor* e rode, nesta ordem, o conteúdo de cada arquivo de [`supabase/migrations`](../supabase/migrations) (`20260928000000_init.sql` e depois `20260929000000_multiple_photos.sql`).
   - **Pelo terminal:**
     ```bash
     npx supabase login
     npx supabase link --project-ref SEU_PROJECT_REF
     npx supabase db push
     ```
3. Confira em *Storage* se o bucket `media` apareceu (público).
4. Em *Project Settings → API Keys*, copie a **URL do projeto** e a chave **service_role** (ou *secret*).

> O plano grátis pausa projetos sem uso por 7 dias. O cron diário (passo 3) consulta o banco todo dia, o que deve manter o projeto ativo. Se pausar mesmo assim, basta reativar no painel.

## 3. Vercel (site)

1. Em https://vercel.com, clique em *Add New → Project* e importe o repositório. O framework (Next.js) é detectado sozinho.
2. Em *Environment Variables*, cadastre:

   | Variável | Valor |
   | --- | --- |
   | `SUPABASE_URL` | URL do projeto Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | chave service_role |
   | `CRON_SECRET` | um texto aleatório longo (ex.: gerado com `openssl rand -hex 32`) |
   | `NEXT_PUBLIC_CONTACT_EMAIL` | e-mail para denúncias (recomendado num site público) |
   | `NEXT_PUBLIC_REPO_URL` | link do GitHub (opcional) |
   | `NEXT_PUBLIC_AUTHOR_NAME` / `NEXT_PUBLIC_AUTHOR_URL` | seu nome e LinkedIn (opcional) |

3. Clique em *Deploy*.
4. O cron de limpeza ([`vercel.json`](../vercel.json)) é ativado sozinho e roda uma vez por dia, o que cabe no plano grátis. Para testar agora: *Settings → Cron Jobs → Run*.

## 4. Domínio (opcional)

Em *Settings → Domains* na Vercel. Com um domínio próprio, cadastre também `NEXT_PUBLIC_SITE_URL=https://seu-dominio` e faça um novo deploy, para as prévias de link usarem o domínio certo.

## 5. Teste antes de mandar para o cliente

- [ ] Criar uma revelação de teste com 3 fotos e música.
- [ ] Abrir o link **num celular de verdade**: som, vibração (só Android; o iPhone não permite vibrar pelo navegador), raspadinha com o dedo.
- [ ] Colar o link numa conversa do WhatsApp e conferir que a prévia é neutra (envelope, sem cor nem nome).
- [ ] Palpitar, ver o placar e deixar um recado.
- [ ] No painel: ver o palpite e o recado, editar, apagar o recado.
- [ ] Apagar a revelação de teste.

## 6. O que pedir ao cliente

- Nomes do casal e a mensagem da carta.
- O sexo do bebê. **Se o casal também quer descobrir na hora**, outra pessoa (quem recebeu o exame) cria a revelação e manda o link para eles também.
- Nome do bebê, se já tiver, e a data prevista.
- A mecânica (mande os links de exemplo da página inicial) e o tema.
- Na contagem ao vivo: dia e hora.
- Até 3 fotos (ultrassom, o casal, o teste positivo…) e uma música que eles possam usar.
- A lista da família: nome de cada pessoa e o que ela vai virar (vovó, titio, dinda…).
- **Autorização** para usar prints ou vídeos da revelação deles no seu post. Se não autorizarem, use as demos.
