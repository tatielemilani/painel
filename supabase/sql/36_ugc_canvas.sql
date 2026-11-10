-- =====================================================================
-- 36_ugc_canvas.sql
-- Aba UGC Canvas (Gestão): uma página pra cada marca que você posta
-- no Canvas (perfis, tarefas, vídeos campeões e referências) e os
-- ganhos dessa fonte de renda. Meta e observações ficam no config_painel.
-- =====================================================================

create table if not exists public.canvas_marcas (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  status     text not null default 'ativa' check (status in ('ativa', 'pausada', 'encerrada')),
  perfis     jsonb not null default '[]',  -- [{ plataforma, usuario, login }]
  tarefas    jsonb not null default '[]',  -- [{ texto, feita }]
  videos     jsonb not null default '[]',  -- [{ tipo: campeao|referencia, titulo, link, resultado }]
  notas      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.canvas_ganhos (
  id         uuid primary key default gen_random_uuid(),
  marca_id   uuid references public.canvas_marcas(id) on delete set null,
  data       date not null default current_date,
  valor      numeric(12, 2) not null check (valor >= 0),
  descricao  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists canvas_ganhos_data on public.canvas_ganhos (data desc);

alter table public.canvas_marcas enable row level security;
drop policy if exists painel_logado on public.canvas_marcas;
create policy painel_logado on public.canvas_marcas for all to authenticated using (true) with check (true);

alter table public.canvas_ganhos enable row level security;
drop policy if exists painel_logado on public.canvas_ganhos;
create policy painel_logado on public.canvas_ganhos for all to authenticated using (true) with check (true);
