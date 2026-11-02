-- =====================================================================
-- 25_site_metricas_completas.sql
-- Métricas completas do site: cidade/estado/país (sem guardar IP),
-- quanto a pessoa rolou a página, e a função site_metricas com tudo:
-- novos x recorrentes, taxa de contato, rejeição, páginas por visita,
-- horários e dias de pico, navegadores, campanhas, tempo por página
-- e quem está no site agora.
-- =====================================================================

alter table public.site_eventos add column if not exists cidade  text;
alter table public.site_eventos add column if not exists regiao  text;
alter table public.site_eventos add column if not exists pais    text;
alter table public.site_eventos add column if not exists rolagem integer; -- saida: % da página que a pessoa viu

create or replace function public.site_metricas(dias integer)
returns jsonb language sql stable security invoker set search_path = public as $$
  with base as (
    select * from site_eventos where created_at >= now() - make_interval(days => dias)
  ), ant as (
    select * from site_eventos
    where created_at >= now() - make_interval(days => dias * 2) and created_at < now() - make_interval(days => dias)
  ), v as (
    select * from base where tipo = 'visita'
  ), sess as (
    -- uma linha por sessão (visita ao site, que pode passar por várias páginas)
    select sessao,
           count(*) filter (where tipo = 'visita') as paginas,
           coalesce(sum(segundos) filter (where tipo = 'saida'), 0) as segundos,
           bool_or(tipo = 'clique' and categoria in ('WhatsApp', 'Instagram', 'E-mail')) as contato
    from base where sessao is not null group by sessao
  ), sess_ant as (
    select sessao, bool_or(tipo = 'clique' and categoria in ('WhatsApp', 'Instagram', 'E-mail')) as contato
    from ant where sessao is not null group by sessao having count(*) filter (where tipo = 'visita') > 0
  ), primeira as (
    select visitante, min(created_at) as primeira from site_eventos where tipo = 'visita' and visitante is not null group by visitante
  ), saidas as (
    select * from base where tipo = 'saida'
  )
  select jsonb_build_object(
    'visitas', (select count(*) from v),
    'visitantes', (select count(distinct visitante) from v),
    'novos', (select count(*) from primeira p where p.primeira >= now() - make_interval(days => dias)),
    'sessoes', (select count(*) from sess where paginas > 0),
    'tempo_medio', (select coalesce(round(avg(segundos)), 0) from saidas where segundos between 1 and 3600),
    'contatos', (select count(*) from base where tipo = 'clique' and categoria in ('WhatsApp', 'Instagram', 'E-mail')),
    'cliques', (select count(*) from base where tipo = 'clique'),
    'conversao', (select coalesce(round(100.0 * count(*) filter (where contato) / nullif(count(*), 0), 1), 0) from sess where paginas > 0),
    'paginas_por_visita', (select coalesce(round(avg(paginas)::numeric, 1), 0) from sess where paginas > 0),
    'rejeicao', (select coalesce(round(100.0 * count(*) filter (where paginas = 1 and segundos < 10 and not contato) / nullif(count(*), 0)), 0) from sess where paginas > 0),
    'rolagem_media', (select coalesce(round(avg(rolagem)), 0) from saidas where rolagem is not null),
    'chegaram_fim', (select coalesce(round(100.0 * count(*) filter (where rolagem >= 90) / nullif(count(*), 0)), 0) from saidas where rolagem is not null),
    'agora', (select count(distinct sessao) from site_eventos where created_at >= now() - interval '5 minutes'),
    'anterior', jsonb_build_object(
      'visitas', (select count(*) from ant where tipo = 'visita'),
      'visitantes', (select count(distinct visitante) from ant where tipo = 'visita'),
      'tempo_medio', (select coalesce(round(avg(segundos)), 0) from ant where tipo = 'saida' and segundos between 1 and 3600),
      'contatos', (select count(*) from ant where tipo = 'clique' and categoria in ('WhatsApp', 'Instagram', 'E-mail')),
      'conversao', (select coalesce(round(100.0 * count(*) filter (where contato) / nullif(count(*), 0), 1), 0) from sess_ant)
    ),
    'por_dia', (select coalesce(jsonb_agg(jsonb_build_object('data', d, 'valor', n) order by d), '[]'::jsonb)
      from (select (created_at at time zone 'America/Sao_Paulo')::date as d, count(*) as n from v group by 1) x),
    'horas', (select coalesce(jsonb_agg(jsonb_build_object('hora', hh, 'valor', n) order by hh), '[]'::jsonb)
      from (select extract(hour from created_at at time zone 'America/Sao_Paulo')::int as hh, count(*) as n from v group by 1) x),
    'semana', (select coalesce(jsonb_agg(jsonb_build_object('dia', dd, 'valor', n) order by dd), '[]'::jsonb)
      from (select extract(dow from created_at at time zone 'America/Sao_Paulo')::int as dd, count(*) as n from v group by 1) x),
    'paginas', (select coalesce(jsonb_agg(jsonb_build_object('nome', pagina, 'valor', n) order by n desc), '[]'::jsonb)
      from (select pagina, count(*) as n from v group by 1) x),
    'tempo_paginas', (select coalesce(jsonb_agg(jsonb_build_object('nome', pagina, 'segundos', s, 'rolagem', r) order by s desc), '[]'::jsonb)
      from (select pagina, round(avg(segundos) filter (where segundos between 1 and 3600)) as s, round(avg(rolagem)) as r from saidas group by 1) x),
    'origens', (select coalesce(jsonb_agg(jsonb_build_object('nome', origem, 'valor', n) order by n desc), '[]'::jsonb)
      from (select coalesce(origem, 'Direto') as origem, count(*) as n from v group by 1) x),
    'campanhas', (select coalesce(jsonb_agg(jsonb_build_object('nome', c, 'valor', n) order by n desc), '[]'::jsonb)
      from (select coalesce(nullif(utm_campaign, ''), utm_source) as c, count(*) as n from v
            where coalesce(nullif(utm_campaign, ''), nullif(utm_source, '')) is not null group by 1 order by 2 desc limit 10) x),
    'dispositivos', (select coalesce(jsonb_agg(jsonb_build_object('nome', dispositivo, 'valor', n) order by n desc), '[]'::jsonb)
      from (select coalesce(dispositivo, 'outro') as dispositivo, count(*) as n from v group by 1) x),
    'navegadores', (select coalesce(jsonb_agg(jsonb_build_object('nome', navegador, 'valor', n) order by n desc), '[]'::jsonb)
      from (select coalesce(navegador, 'outro') as navegador, count(*) as n from v group by 1) x),
    'cidades', (select coalesce(jsonb_agg(jsonb_build_object('nome', l, 'valor', n) order by n desc), '[]'::jsonb)
      from (select concat_ws(', ', cidade, regiao) as l, count(*) as n from v where cidade is not null group by 1 order by 2 desc limit 10) x),
    'paises', (select coalesce(jsonb_agg(jsonb_build_object('nome', pais, 'valor', n) order by n desc), '[]'::jsonb)
      from (select pais, count(*) as n from v where pais is not null group by 1 order by 2 desc limit 8) x),
    'botoes', (select coalesce(jsonb_agg(jsonb_build_object('categoria', categoria, 'nome', rotulo, 'valor', n) order by n desc), '[]'::jsonb)
      from (select categoria, coalesce(nullif(rotulo, ''), destino, categoria) as rotulo, count(*) as n
            from base where tipo = 'clique' group by 1, 2 order by 3 desc limit 12) x),
    'recentes', (select coalesce(jsonb_agg(jsonb_build_object('quando', created_at, 'pagina', pagina, 'origem', origem, 'dispositivo', dispositivo,
        'cidade', concat_ws(', ', cidade, regiao)) order by created_at desc), '[]'::jsonb)
      from (select * from v order by created_at desc limit 15) x)
  );
$$;
revoke all on function public.site_metricas(integer) from public, anon;
grant execute on function public.site_metricas(integer) to authenticated;
