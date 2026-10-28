-- =====================================================================
-- 17_config_agenda.sql
-- Configurações do painel (chave e valor). Por enquanto guarda o
-- endereço secreto (iCal) do Google Agenda, que a função
-- "agenda-google" usa pra mostrar seus eventos no Calendário.
-- Só quem está logado no painel lê e escreve. O público não vê nada.
-- =====================================================================

create table if not exists public.config_painel (
  chave      text primary key,
  valor      text,
  updated_at timestamptz not null default now()
);

alter table public.config_painel enable row level security;
create policy painel_logado on public.config_painel for all to authenticated using (true) with check (true);
