-- =====================================================================
-- 24_site_metricas.sql
-- Métricas do site tatielemilani.com (portfólio, bio e indicações).
-- O site manda cada visita, clique e tempo de leitura pra função
-- "site-evento", que grava aqui. Ninguém de fora lê: só o painel (logado).
-- Não guarda IP nem nada que identifique a pessoa: só um código aleatório
-- por navegador, pra contar visitantes únicos.
-- =====================================================================

create table if not exists public.site_eventos (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  tipo        text not null check (tipo in ('visita', 'clique', 'saida')),
  pagina      text not null,          -- Portfólio, Bio, Indicações
  visitante   text,                   -- código aleatório do navegador
  sessao      text,                   -- código aleatório da visita
  origem      text,                   -- Instagram, Google, TikTok, Direto...
  utm_source  text,
  utm_campaign text,
  dispositivo text,                   -- celular, computador, tablet
  navegador   text,
  idioma      text,
  categoria   text,                   -- clique: WhatsApp, Instagram, E-mail, Loja...
  rotulo      text,                   -- clique: texto do botão
  destino     text,                   -- clique: site de destino
  segundos    integer                 -- saida: tempo na página
);
create index if not exists site_eventos_data on public.site_eventos (created_at desc);
create index if not exists site_eventos_tipo_data on public.site_eventos (tipo, created_at desc);

alter table public.site_eventos enable row level security;
create policy painel_le on public.site_eventos for select to authenticated using (true);
create policy painel_apaga on public.site_eventos for delete to authenticated using (true);

-- Números prontos do período (dias) e do período anterior, pra comparar
create or replace function public.site_metricas(dias integer)
returns jsonb language sql stable security invoker set search_path = public as $$
  with base as (
    select * from site_eventos where created_at >= now() - make_interval(days => dias)
  ), ant as (
    select * from site_eventos
    where created_at >= now() - make_interval(days => dias * 2) and created_at < now() - make_interval(days => dias)
  ), v as (
    select * from base where tipo = 'visita'
  )
  select jsonb_build_object(
    'visitas', (select count(*) from v),
    'visitantes', (select count(distinct visitante) from v),
    'tempo_medio', (select coalesce(round(avg(segundos)), 0) from base where tipo = 'saida' and segundos between 1 and 3600),
    'contatos', (select count(*) from base where tipo = 'clique' and categoria in ('WhatsApp', 'Instagram', 'E-mail')),
    'cliques', (select count(*) from base where tipo = 'clique'),
    'anterior', jsonb_build_object(
      'visitas', (select count(*) from ant where tipo = 'visita'),
      'visitantes', (select count(distinct visitante) from ant where tipo = 'visita'),
      'tempo_medio', (select coalesce(round(avg(segundos)), 0) from ant where tipo = 'saida' and segundos between 1 and 3600),
      'contatos', (select count(*) from ant where tipo = 'clique' and categoria in ('WhatsApp', 'Instagram', 'E-mail'))
    ),
    'por_dia', (select coalesce(jsonb_agg(jsonb_build_object('data', d, 'valor', n) order by d), '[]'::jsonb)
      from (select (created_at at time zone 'America/Sao_Paulo')::date as d, count(*) as n from v group by 1) x),
    'paginas', (select coalesce(jsonb_agg(jsonb_build_object('nome', pagina, 'valor', n) order by n desc), '[]'::jsonb)
      from (select pagina, count(*) as n from v group by 1) x),
    'origens', (select coalesce(jsonb_agg(jsonb_build_object('nome', origem, 'valor', n) order by n desc), '[]'::jsonb)
      from (select coalesce(origem, 'Direto') as origem, count(*) as n from v group by 1) x),
    'dispositivos', (select coalesce(jsonb_agg(jsonb_build_object('nome', dispositivo, 'valor', n) order by n desc), '[]'::jsonb)
      from (select coalesce(dispositivo, 'outro') as dispositivo, count(*) as n from v group by 1) x),
    'botoes', (select coalesce(jsonb_agg(jsonb_build_object('categoria', categoria, 'nome', rotulo, 'valor', n) order by n desc), '[]'::jsonb)
      from (select categoria, coalesce(nullif(rotulo, ''), destino, categoria) as rotulo, count(*) as n
            from base where tipo = 'clique' group by 1, 2 order by 3 desc limit 10) x),
    'recentes', (select coalesce(jsonb_agg(jsonb_build_object('quando', created_at, 'pagina', pagina, 'origem', origem, 'dispositivo', dispositivo) order by created_at desc), '[]'::jsonb)
      from (select * from v order by created_at desc limit 12) x)
  );
$$;
revoke all on function public.site_metricas(integer) from public, anon;
grant execute on function public.site_metricas(integer) to authenticated;
