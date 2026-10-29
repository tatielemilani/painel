-- =====================================================================
-- 21_campanhas_status_pgto.sql
-- Status do pagamento da campanha: pendente, pago ou atrasado.
-- (a coluna "pago" continua e acompanha: pago = status_pgto 'pago')
-- =====================================================================

alter table public.campanhas add column if not exists status_pgto text not null default 'pendente'
  check (status_pgto in ('pendente', 'pago', 'atrasado'));
update public.campanhas set status_pgto = 'pago' where pago and status_pgto <> 'pago';
