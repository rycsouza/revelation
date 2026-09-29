-- Até 3 fotos por revelação (viram carrossel na carta).
alter table public.reveals
  add column photo_paths text[] not null default '{}'
    check (cardinality(photo_paths) <= 3);

update public.reveals set photo_paths = array[photo_path] where photo_path is not null;

alter table public.reveals drop column photo_path;
