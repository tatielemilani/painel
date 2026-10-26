-- =====================================================================
-- 05_retencao.sql
-- Cumpre a Política de Privacidade: apaga sozinho, uma vez por dia,
-- os dados com mais de 12 meses sem interação.
-- Rode DEPOIS do 04_agendamento.sql (precisa do pg_cron).
-- =====================================================================

create or replace function public.limpar_dados_antigos()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  limite timestamptz := now() - interval '12 months';
begin
  -- Leads sem nenhuma interação há 12 meses (updated_at muda a cada interação).
  delete from public.ig_leads where updated_at < limite;
  -- Registros de envio, fila e passos agendados com mais de 12 meses.
  delete from public.ig_deliveries where ts < limite;
  delete from public.ig_send_queue where created_at < limite;
  delete from public.ig_scheduled  where created_at < limite;
  -- Controle de mensagens repetidas: 7 dias bastam.
  delete from public.ig_processed_events where created_at < now() - interval '7 days';
  delete from public.ig_bot_sends        where created_at < now() - interval '7 days';
end;
$$;

revoke all on function public.limpar_dados_antigos() from public, anon, authenticated;

-- Todo dia às 04:00 (UTC), que é 01:00 em Brasília.
select cron.schedule('limpar-dados-antigos', '0 4 * * *', $$ select public.limpar_dados_antigos(); $$);
