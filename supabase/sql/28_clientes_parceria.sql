-- =====================================================================
-- 28_clientes_parceria.sql
-- Status "parceria": marca com quem você já trabalhou e quer guardar o
-- contato pra prospectar de novo mais pra frente (follow-up).
-- =====================================================================

alter table public.clientes drop constraint if exists clientes_status_check;
alter table public.clientes add constraint clientes_status_check
  check (status in ('prospect', 'ativo', 'permuta', 'parceria', 'inativo'));
