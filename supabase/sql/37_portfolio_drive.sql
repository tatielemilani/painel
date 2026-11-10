-- =====================================================================
-- 37_portfolio_drive.sql
-- Vídeos pro portfólio: o que você escolheu (Sim ou Não) pra cada vídeo
-- da pasta do Google Drive. Os "Sim" aparecem sozinhos no site
-- (a função drive-videos entrega só esses pro site).
-- =====================================================================

create table if not exists public.portfolio_drive (
  drive_id   text primary key,               -- id do arquivo no Drive
  nome       text,                           -- nome do arquivo (pra referência)
  decisao    text not null check (decisao in ('sim', 'nao')),
  marca      text,
  nicho      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.portfolio_drive enable row level security;
drop policy if exists painel_logado on public.portfolio_drive;
create policy painel_logado on public.portfolio_drive for all to authenticated using (true) with check (true);
