-- =====================================================================
-- 07_analises.sql
-- Tabelas da aba "Análises": o resultado da última análise dos posts e
-- dos comentários. Só a função ig-analises escreve (service_role);
-- o painel logado só lê. O público anônimo não vê nada.
-- =====================================================================

-- Resumo da última análise (uma linha só)
create table if not exists public.ig_analise (
  id                      text primary key default 'main',
  atualizado_em           timestamptz,
  posts_analisados        int not null default 0,
  comentarios_analisados  int not null default 0,
  status                  text not null default 'nunca' check (status in ('nunca', 'rodando', 'ok', 'erro')),
  erro                    text
);
insert into public.ig_analise (id) values ('main') on conflict (id) do nothing;

-- Números de cada post (curtidas, comentários, salvos, visualizações)
create table if not exists public.ig_analise_posts (
  media_id        text primary key,
  legenda         text,
  tipo            text,
  miniatura       text,
  link            text,
  publicado_em    timestamptz,
  curtidas        int not null default 0,
  comentarios     int not null default 0,
  salvos          int,
  visualizacoes   int,
  alcance         int,
  atualizado_em   timestamptz not null default now()
);
create index if not exists ig_analise_posts_data on public.ig_analise_posts (publicado_em desc);

-- Quem mais comenta: só o @ e quantos comentários + respostas (sem o texto)
create table if not exists public.ig_analise_comentaristas (
  username        text primary key,
  comentarios     int not null default 0,
  atualizado_em   timestamptz not null default now()
);

alter table public.ig_analise               enable row level security;
alter table public.ig_analise_posts         enable row level security;
alter table public.ig_analise_comentaristas enable row level security;

create policy painel_le on public.ig_analise               for select to authenticated using (true);
create policy painel_le on public.ig_analise_posts         for select to authenticated using (true);
create policy painel_le on public.ig_analise_comentaristas for select to authenticated using (true);
