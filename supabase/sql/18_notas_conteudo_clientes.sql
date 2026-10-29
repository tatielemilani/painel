-- =====================================================================
-- 18_notas_conteudo_clientes.sql
-- Abas novas do menu: Bloco de Notas, Conteúdo, Clientes e Contratos.
-- Só quem está logado no painel lê e escreve. O público não vê nada.
-- =====================================================================

-- Bloco de Notas
create table if not exists public.notas (
  id         uuid primary key default gen_random_uuid(),
  titulo     text,
  texto      text,
  cor        text not null default 'branco',
  fixada     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Conteúdo (do rascunho até publicado)
create table if not exists public.conteudos (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null,
  plataforma text not null default 'instagram',
  formato    text,
  status     text not null default 'ideia'
             check (status in ('ideia', 'roteiro', 'gravacao', 'edicao', 'agendado', 'publicado')),
  data       date,
  cliente    text,
  link       text,
  notas      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Clientes
create table if not exists public.clientes (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  empresa    text,
  instagram  text,
  email      text,
  telefone   text,
  status     text not null default 'ativo' check (status in ('prospect', 'ativo', 'inativo')),
  notas      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contratos (ligados a um cliente, se quiser)
create table if not exists public.contratos (
  id         uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes (id) on delete set null,
  titulo     text not null,
  valor      numeric(12, 2),
  inicio     date,
  fim        date,
  status     text not null default 'rascunho'
             check (status in ('rascunho', 'enviado', 'assinado', 'encerrado', 'cancelado')),
  link       text,
  notas      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contratos_cliente_idx on public.contratos (cliente_id);

alter table public.notas     enable row level security;
alter table public.conteudos enable row level security;
alter table public.clientes  enable row level security;
alter table public.contratos enable row level security;
create policy painel_logado on public.notas     for all to authenticated using (true) with check (true);
create policy painel_logado on public.conteudos for all to authenticated using (true) with check (true);
create policy painel_logado on public.clientes  for all to authenticated using (true) with check (true);
create policy painel_logado on public.contratos for all to authenticated using (true) with check (true);
