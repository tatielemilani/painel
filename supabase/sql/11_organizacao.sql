-- =====================================================================
-- 11_organizacao.sql
-- Aba "Organização": assinaturas (ferramentas pagas) e as listas de
-- contratos, portfólio, contatos, equipamentos e cursos.
-- Só quem está logado no painel lê e escreve. O público não vê nada.
-- =====================================================================

create table if not exists public.org_assinaturas (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  valor       numeric(12, 2) not null default 0,   -- em reais, por ciclo
  ciclo       text not null default 'mes' check (ciclo in ('mes', 'ano')),
  observacoes text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Uma tabela só pras 5 listas; "tipo" diz de qual aba é.
create table if not exists public.org_itens (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null check (tipo in ('contratos', 'portfolio', 'contatos', 'equipamentos', 'cursos')),
  titulo      text not null,
  subtitulo   text,
  link        text,
  email       text,
  telefone    text,
  valor       numeric(12, 2),
  data        date,
  observacoes text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists org_itens_tipo on public.org_itens (tipo);

alter table public.org_assinaturas enable row level security;
alter table public.org_itens       enable row level security;

create policy painel_logado on public.org_assinaturas for all to authenticated using (true) with check (true);
create policy painel_logado on public.org_itens       for all to authenticated using (true) with check (true);
