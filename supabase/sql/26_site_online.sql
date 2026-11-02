-- =====================================================================
-- 26_site_online.sql
-- "Quem está no site agora", preciso: cada página aberta manda um sinal
-- a cada 30s (e um "saí" quando a pessoa fecha ou troca de aba).
-- Fica aqui só a última posição de cada visita; nada de histórico.
-- =====================================================================

create table if not exists public.site_online (
  sessao      text primary key,
  pagina      text,
  origem      text,
  dispositivo text,
  cidade      text,
  regiao      text,
  inicio      timestamptz not null default now(),
  visto_em    timestamptz not null default now()
);
create index if not exists site_online_visto on public.site_online (visto_em desc);

alter table public.site_online enable row level security;
create policy painel_le on public.site_online for select to authenticated using (true);

-- Quem está no site agora: deu sinal nos últimos 75 segundos
create or replace function public.site_agora()
returns jsonb language sql stable security invoker set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'pagina', pagina, 'origem', origem, 'dispositivo', dispositivo, 'cidade', concat_ws(', ', cidade, regiao),
    'desde', inicio) order by inicio), '[]'::jsonb)
  from site_online where visto_em >= now() - interval '75 seconds';
$$;
revoke all on function public.site_agora() from public, anon;
grant execute on function public.site_agora() to authenticated;
