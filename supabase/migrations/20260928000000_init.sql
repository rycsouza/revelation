-- Revelações: dados públicos (vão para o navegador antes da revelação).
create table public.reveals (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  -- Não há login: quem tem o link secreto de edição é o dono. Guardamos só o hash.
  edit_token_hash text not null,
  creator_ip_hash text,
  parents text not null,
  mechanic text not null default 'scratch'
    check (mechanic in ('scratch', 'balloons', 'giftbox', 'countdown')),
  theme text not null default 'nuvem'
    check (theme in ('nuvem', 'noite', 'jardim')),
  message text,
  photo_path text,
  music_path text,
  due_date date,
  guess_enabled boolean not null default true,
  reveal_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Tudo some sozinho depois de um tempo (LGPD: fotos de ultrassom e nomes de família).
  expires_at timestamptz not null
);

create index reveals_expires_at_idx on public.reveals (expires_at);
create index reveals_creator_ip_idx on public.reveals (creator_ip_hash, created_at);

-- O segredo fica numa tabela separada para nunca vazar num select('*') de reveals.
create table public.reveal_secrets (
  reveal_id uuid primary key references public.reveals (id) on delete cascade,
  sex text not null check (sex in ('boy', 'girl')),
  baby_name text
);

-- Links personalizados: /r/<slug>?p=<guest.slug>
create table public.guests (
  id uuid primary key default gen_random_uuid(),
  reveal_id uuid not null references public.reveals (id) on delete cascade,
  slug text not null,
  name text not null,
  becomes text,
  position int not null default 0,
  unique (reveal_id, slug)
);

-- Um palpite por aparelho. O primeiro vale: não dá para trocar depois de ver o resultado.
create table public.guesses (
  id uuid primary key default gen_random_uuid(),
  reveal_id uuid not null references public.reveals (id) on delete cascade,
  device_id text not null,
  guest_slug text,
  name text,
  guess text not null check (guess in ('boy', 'girl')),
  created_at timestamptz not null default now(),
  unique (reveal_id, device_id)
);

-- Mural de recados para o casal, visível depois da revelação.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  reveal_id uuid not null references public.reveals (id) on delete cascade,
  device_id text not null,
  author text not null check (char_length(author) between 1 and 60),
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index messages_reveal_idx on public.messages (reveal_id, created_at);

-- Só o servidor (service role) acessa: RLS ligado e nenhuma policy pública.
alter table public.reveals enable row level security;
alter table public.reveal_secrets enable row level security;
alter table public.guests enable row level security;
alter table public.guesses enable row level security;
alter table public.messages enable row level security;

-- Fotos e músicas. Leitura pública (o caminho inclui o slug aleatório); upload só por URL assinada do servidor.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  8388608,
  array[
    'image/jpeg', 'image/png', 'image/webp',
    'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/x-m4a', 'audio/ogg', 'audio/wav'
  ]
)
on conflict (id) do nothing;
