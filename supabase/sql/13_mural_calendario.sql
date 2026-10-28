-- =====================================================================
-- 13_mural_calendario.sql
-- Mural dos Sonhos com fotos enviadas do computador (pasta "mural",
-- PRIVADA: só quem está logado vê) e eventos do Calendário
-- (campanhas, follow-ups e vencimentos).
-- =====================================================================

-- Caminho da foto dentro da pasta "mural".
alter table public.sonhos add column if not exists arquivo text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mural', 'mural', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy mural_logado on storage.objects
  for all to authenticated using (bucket_id = 'mural') with check (bucket_id = 'mural');

create table if not exists public.cal_eventos (
  id         uuid primary key default gen_random_uuid(),
  data       date not null,
  tipo       text not null check (tipo in ('campanha', 'followup', 'vencimento')),
  titulo     text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cal_eventos_data on public.cal_eventos (data);

alter table public.cal_eventos enable row level security;
create policy painel_logado on public.cal_eventos for all to authenticated using (true) with check (true);
