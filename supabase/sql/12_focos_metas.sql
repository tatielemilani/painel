-- =====================================================================
-- 12_focos_metas.sql
-- Aba "Focos e metas": planejamento do mês (foco, top 3, hábitos e
-- tarefas por dia), metas do ano e mural dos sonhos.
-- Só quem está logado no painel lê e escreve. O público não vê nada.
-- =====================================================================

-- Um registro por mês ("2026-10"): o foco e as 3 prioridades.
create table if not exists public.plan_mes (
  mes        text primary key check (mes ~ '^\d{4}-\d{2}$'),
  foco       text,
  top3       jsonb not null default '["", "", ""]',
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_tarefas (
  id         uuid primary key default gen_random_uuid(),
  data       date not null,
  titulo     text not null,
  feita      boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists plan_tarefas_data on public.plan_tarefas (data);

-- Hábitos de um mês; "dias" guarda os dias marcados (ex: [1, 2, 5]).
create table if not exists public.plan_habitos (
  id         uuid primary key default gen_random_uuid(),
  mes        text not null check (mes ~ '^\d{4}-\d{2}$'),
  nome       text not null,
  dias       jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists plan_habitos_mes on public.plan_habitos (mes);

create table if not exists public.metas_ano (
  id         uuid primary key default gen_random_uuid(),
  ano        int not null,
  titulo     text not null,
  categoria  text,
  progresso  int not null default 0 check (progresso between 0 and 100),
  prazo      date,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists metas_ano_ano on public.metas_ano (ano);

create table if not exists public.sonhos (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null,
  imagem_url text,
  descricao  text,
  realizado  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plan_mes     enable row level security;
alter table public.plan_tarefas enable row level security;
alter table public.plan_habitos enable row level security;
alter table public.metas_ano    enable row level security;
alter table public.sonhos       enable row level security;

create policy painel_logado on public.plan_mes     for all to authenticated using (true) with check (true);
create policy painel_logado on public.plan_tarefas for all to authenticated using (true) with check (true);
create policy painel_logado on public.plan_habitos for all to authenticated using (true) with check (true);
create policy painel_logado on public.metas_ano    for all to authenticated using (true) with check (true);
create policy painel_logado on public.sonhos       for all to authenticated using (true) with check (true);
