-- =====================================================================
-- 27_site_videos.sql
-- Vídeos do portfólio: quem viu qual vídeo (marca e nicho), quanto
-- tempo assistiu e até que ponto (%). E em quais nichos clicaram.
-- No site_eventos:
--   tipo 'video': categoria = nicho (ou "Destaques"), rotulo = marca,
--                 destino = arquivo do vídeo, segundos = tempo assistido,
--                 rolagem = % do vídeo que a pessoa chegou a ver
--   tipo 'nicho': categoria = nicho em que a pessoa clicou
-- =====================================================================

alter table public.site_eventos drop constraint if exists site_eventos_tipo_check;
alter table public.site_eventos add constraint site_eventos_tipo_check
  check (tipo in ('visita', 'clique', 'saida', 'video', 'nicho'));

create or replace function public.site_videos(dias integer)
returns jsonb language sql stable security invoker set search_path = public as $$
  with vid as (
    select * from site_eventos
    where tipo = 'video' and segundos >= 2 and created_at >= now() - make_interval(days => dias)
  ), nic as (
    select * from site_eventos where tipo = 'nicho' and created_at >= now() - make_interval(days => dias)
  )
  select jsonb_build_object(
    'views', (select count(*) from vid),
    'pessoas', (select count(distinct visitante) from vid),
    'segundos', (select coalesce(sum(segundos), 0) from vid),
    'ate_o_fim', (select coalesce(round(100.0 * count(*) filter (where rolagem >= 90) / nullif(count(*), 0)), 0) from vid),
    'media_pct', (select coalesce(round(avg(rolagem)), 0) from vid),
    'nichos', (select coalesce(jsonb_agg(jsonb_build_object('nome', nome, 'views', views, 'cliques', cliques, 'media_pct', pct) order by views desc, cliques desc), '[]'::jsonb)
      from (
        select coalesce(v.nome, n.nome) as nome, coalesce(v.views, 0) as views, coalesce(n.cliques, 0) as cliques, v.pct
        from (select categoria as nome, count(*) as views, round(avg(rolagem)) as pct from vid group by 1) v
        full join (select categoria as nome, count(*) as cliques from nic group by 1) n on n.nome = v.nome
      ) x),
    'videos', (select coalesce(jsonb_agg(jsonb_build_object('marca', marca, 'nicho', nicho, 'arquivo', arquivo, 'views', views,
        'pessoas', pessoas, 'segundos', seg, 'media_pct', pct, 'ate_o_fim', fim) order by views desc), '[]'::jsonb)
      from (
        select rotulo as marca, categoria as nicho, destino as arquivo, count(*) as views, count(distinct visitante) as pessoas,
               round(avg(segundos)) as seg, round(avg(rolagem)) as pct, count(*) filter (where rolagem >= 90) as fim
        from vid group by 1, 2, 3 order by 4 desc limit 20
      ) x),
    'recentes', (select coalesce(jsonb_agg(jsonb_build_object('quando', created_at, 'marca', rotulo, 'nicho', categoria, 'segundos', segundos, 'pct', rolagem)
        order by created_at desc), '[]'::jsonb)
      from (select * from vid order by created_at desc limit 12) x)
  );
$$;
revoke all on function public.site_videos(integer) from public, anon;
grant execute on function public.site_videos(integer) to authenticated;
