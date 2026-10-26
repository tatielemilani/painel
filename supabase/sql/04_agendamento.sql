-- =====================================================================
-- 04_agendamento.sql
-- Liga os "robôs" agendados (pg_cron). Rode DEPOIS de publicar as
-- Edge Functions.
--
-- ANTES DE RODAR, troque:
--   SEU_PROJETO            pelo id do seu projeto Supabase (o pedaço da URL)
--   SEU_SCHED_SECRET_AQUI  pela mesma senha que você pôs no segredo SCHED_SECRET
-- =====================================================================

-- pg_cron agenda; pg_net deixa o Postgres chamar uma URL (a Edge Function).
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove agendamentos antigos com o mesmo nome (pra poder rodar de novo).
select cron.unschedule(jobname) from cron.job
 where jobname in ('ig-scheduler', 'ig-token-refresh');

-- Carteiro: a cada 1 minuto esvazia a fila e manda os passos com atraso.
select cron.schedule(
  'ig-scheduler',
  '* * * * *',
  $$
  select net.http_post(
    url     := 'https://SEU_PROJETO.supabase.co/functions/v1/ig-scheduler',
    headers := '{"Content-Type": "application/json", "x-sched-key": "SEU_SCHED_SECRET_AQUI"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- Renovação do token: toda segunda-feira às 03:00 (UTC).
select cron.schedule(
  'ig-token-refresh',
  '0 3 * * 1',
  $$
  select net.http_post(
    url     := 'https://SEU_PROJETO.supabase.co/functions/v1/ig-token-refresh',
    headers := '{"Content-Type": "application/json", "x-sched-key": "SEU_SCHED_SECRET_AQUI"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- Pra conferir: select * from cron.job;
-- Pra ver as últimas execuções: select * from cron.job_run_details order by start_time desc limit 20;
