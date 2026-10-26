-- =====================================================================
-- 08_marcas_propostas.sql
-- Abas "Marcas" e "Propostas": controle das parcerias com marcas.
-- Só quem está logado no painel lê e escreve. O público não vê nada.
-- =====================================================================

create table if not exists public.marcas (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  instagram     text,               -- @ da marca
  site          text,
  segmento      text,               -- ex: beleza, moda, casa
  contato_nome  text,               -- pessoa de contato na marca
  email         text,
  telefone      text,
  status        text not null default 'prospeccao'
                check (status in ('prospeccao', 'em_contato', 'negociando', 'parceira', 'pausada')),
  observacoes   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.propostas (
  id            uuid primary key default gen_random_uuid(),
  marca_id      uuid not null references public.marcas(id) on delete cascade,
  titulo        text not null,
  valor         numeric(12, 2),     -- em reais
  entregaveis   text,               -- ex: 2 reels + 3 stories
  status        text not null default 'rascunho'
                check (status in ('rascunho', 'enviada', 'negociando', 'aceita', 'recusada', 'paga')),
  enviada_em    date,
  prazo         date,
  observacoes   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists propostas_marca on public.propostas (marca_id);

alter table public.marcas    enable row level security;
alter table public.propostas enable row level security;

create policy painel_logado on public.marcas    for all to authenticated using (true) with check (true);
create policy painel_logado on public.propostas for all to authenticated using (true) with check (true);
