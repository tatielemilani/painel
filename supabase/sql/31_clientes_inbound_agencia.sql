-- =====================================================================
-- 31_clientes_inbound_agencia.sql
-- Mais dois status de cliente: Inbound (a marca chegou até você)
-- e Agência.
-- =====================================================================

alter table public.clientes drop constraint if exists clientes_status_check;
alter table public.clientes add constraint clientes_status_check
  check (status in ('prospect', 'ativo', 'permuta', 'parceria', 'inativo', 'ugc', 'plataformas', 'inbound', 'agencia'));
