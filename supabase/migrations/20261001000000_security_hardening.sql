-- Endurecimento de segurança.
-- Compatível com a versão anterior do código: só acrescenta coisas (pode rodar antes ou depois do deploy).

-- 1. Bucket privado: o navegador nunca mais fala com o Storage.
--    Fotos e músicas passam a ser servidas pelo próprio site (/m/<slug>/<arquivo>), depois de conferir a revelação.
update storage.buckets
set public = false,
    file_size_limit = 4194304, -- 4 MB: cabe no limite de corpo da Vercel (4,5 MB)
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp',
      'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/wav'
    ]
where id = 'media';

-- 2. Limite de requisições genérico (janela fixa), usado para criação, palpites, recados, uploads e acesso ao painel.
--    A chave inclui um HMAC do IP (nunca o IP em si); as linhas antigas são apagadas pelo cron diário.
create table if not exists public.rate_limits (
  key text primary key check (char_length(key) <= 200),
  window_start timestamptz not null,
  hits integer not null
);

alter table public.rate_limits enable row level security;

create or replace function public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_hits integer;
begin
  insert into public.rate_limits as rl (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case
                 when rl.window_start < now() - make_interval(secs => p_window_seconds) then 1
                 else rl.hits + 1
               end,
        window_start = case
                 when rl.window_start < now() - make_interval(secs => p_window_seconds) then now()
                 else rl.window_start
               end
  returning hits into v_hits;
  return v_hits <= p_limit;
end;
$$;

-- 3. Menor privilégio: só o servidor (service_role) usa tabelas e funções; a chave pública não enxerga nada.
grant select, insert, update, delete on public.rate_limits to service_role;
revoke all on public.rate_limits from anon, authenticated;
revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;

-- 4. Minimização de dados: o hash de IP de quem cria não é mais usado (o limite agora fica em rate_limits,
--    que expira em 1 dia). Apagamos os valores guardados; a coluna fica por compatibilidade e pode ser removida depois.
update public.reveals set creator_ip_hash = null where creator_ip_hash is not null;
