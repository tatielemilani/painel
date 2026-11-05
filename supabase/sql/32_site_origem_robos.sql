-- =====================================================================
-- 32_site_origem_robos.sql
-- Origem mais certeira das visitas do site e separação de robôs.
-- referencia: o site de onde a pessoa veio, do jeito que chegou
--             (pra conferir quando a origem não for reconhecida).
-- rede:       a empresa da conexão (operadora ou servidor).
-- site_robos: acessos vindos de servidores (Amazon, Google Cloud,
--             Microsoft...). Ficam fora das métricas, só pra contagem.
-- =====================================================================

alter table public.site_eventos add column if not exists referencia text;
alter table public.site_eventos add column if not exists rede text;

create table if not exists public.site_robos (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  sessao      text,
  pagina      text,
  rede        text,
  cidade      text,
  pais        text
);
create index if not exists site_robos_sessao on public.site_robos (sessao);
create index if not exists site_robos_data on public.site_robos (created_at desc);

alter table public.site_robos enable row level security;
drop policy if exists painel_le on public.site_robos;
create policy painel_le on public.site_robos for select to authenticated using (true);
drop policy if exists painel_apaga on public.site_robos;
create policy painel_apaga on public.site_robos for delete to authenticated using (true);
