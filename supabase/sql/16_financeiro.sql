-- =====================================================================
-- 16_financeiro.sql
-- Aba "Financeiro": receitas e despesas, categorias que você cria e a
-- meta de receita de cada mês.
-- Só quem está logado no painel lê e escreve. O público não vê nada.
-- =====================================================================

create table if not exists public.fin_transacoes (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null check (tipo in ('receita', 'despesa')),
  escopo      text not null default 'pessoal' check (escopo in ('pessoal', 'empresa')),
  categoria   text not null default 'Outros',
  cliente     text,
  descricao   text not null,
  valor       numeric(12, 2) not null check (valor >= 0),
  data        date not null,
  status      text not null default 'concluido' check (status in ('concluido', 'pendente')),
  cartao      boolean not null default false,   -- veio de fatura de cartão de crédito
  parcela     text,                             -- ex: "2/4"
  recorrencia uuid,                             -- mesmo id nas 6 cópias de uma recorrente
  notas       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists fin_transacoes_data on public.fin_transacoes (data);

create table if not exists public.fin_categorias (
  id         uuid primary key default gen_random_uuid(),
  tipo       text not null check (tipo in ('receita', 'despesa')),
  nome       text not null,
  emoji      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tipo, nome)
);

-- Meta de receita do mês ("2026-10").
create table if not exists public.fin_metas (
  mes          text primary key check (mes ~ '^\d{4}-\d{2}$'),
  meta_receita numeric(12, 2),
  updated_at   timestamptz not null default now()
);

alter table public.fin_transacoes enable row level security;
alter table public.fin_categorias enable row level security;
alter table public.fin_metas      enable row level security;

create policy painel_logado on public.fin_transacoes for all to authenticated using (true) with check (true);
create policy painel_logado on public.fin_categorias for all to authenticated using (true) with check (true);
create policy painel_logado on public.fin_metas      for all to authenticated using (true) with check (true);
