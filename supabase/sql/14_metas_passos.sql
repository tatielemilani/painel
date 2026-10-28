-- =====================================================================
-- 14_metas_passos.sql
-- Metas do Ano: o "primeiro passo" de cada meta e as categorias que
-- você cria (além de Saúde, Trabalho, Dinheiro e Relacionamento).
-- =====================================================================

alter table public.metas_ano add column if not exists primeiro_passo text;

create table if not exists public.meta_categorias (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null unique,
  emoji      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.meta_categorias enable row level security;
create policy painel_logado on public.meta_categorias for all to authenticated using (true) with check (true);
