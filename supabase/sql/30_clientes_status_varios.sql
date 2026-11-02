-- =====================================================================
-- 30_clientes_status_varios.sql
-- Status do cliente com mais de uma opção ao mesmo tempo
-- (Prospecção, Permuta, Parceria, UGC Creator, Plataformas).
-- Saem "Cliente Ativo" e "Inativo". A coluna status continua com o
-- primeiro escolhido; a lista completa fica em status_lista.
-- =====================================================================

alter table public.clientes drop constraint if exists clientes_status_check;
alter table public.clientes add constraint clientes_status_check
  check (status in ('prospect', 'ativo', 'permuta', 'parceria', 'inativo', 'ugc', 'plataformas'));

alter table public.clientes add column if not exists status_lista jsonb not null default '[]'::jsonb;

update public.clientes set status_lista = jsonb_build_array(status)
where status_lista = '[]'::jsonb and status in ('prospect', 'permuta', 'parceria');
