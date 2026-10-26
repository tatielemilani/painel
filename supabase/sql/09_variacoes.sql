-- =====================================================================
-- 09_variacoes.sql
-- "Variações da mensagem (A/B)": guarda qual versão da Mensagem 1 cada
-- pessoa recebeu (0 = versão A, 1 = B, 2 = C...), pra comparar qual
-- versão converte mais.
-- =====================================================================

alter table public.ig_deliveries add column if not exists variante smallint;
alter table public.ig_leads      add column if not exists variante smallint;

create index if not exists ig_deliveries_auto_variante on public.ig_deliveries (automation_id, variante);
create index if not exists ig_leads_auto_variante      on public.ig_leads (automation_id, variante);
