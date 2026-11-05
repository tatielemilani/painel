-- =====================================================================
-- 33_push_lembretes.sql
-- Notificações no celular com o que tem pra fazer no dia.
-- push_inscricoes: os celulares/navegadores que ativaram os avisos.
-- push_chaves:     chaves de envio (criadas pela função push-lembretes).
--                  Sem política nenhuma: só as funções conseguem ler.
-- Agendamento:     todo dia às 8h de Brasília (11h UTC). Copia o
--                  endereço e a senha do agendamento "ig-scheduler" que
--                  já existe, então não precisa trocar nada aqui.
-- Rode DEPOIS de publicar a função push-lembretes.
-- =====================================================================

create table if not exists public.push_inscricoes (
  id         uuid primary key default gen_random_uuid(),
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  aparelho   text,
  created_at timestamptz not null default now()
);
alter table public.push_inscricoes enable row level security;
drop policy if exists painel_logado on public.push_inscricoes;
create policy painel_logado on public.push_inscricoes for all to authenticated using (true) with check (true);

create table if not exists public.push_chaves (
  id      text primary key,
  publica text not null,
  privada text not null
);
alter table public.push_chaves enable row level security;

select cron.unschedule(jobname) from cron.job where jobname = 'push-lembretes';
select cron.schedule('push-lembretes', '0 11 * * *', replace(command, '/functions/v1/ig-scheduler', '/functions/v1/push-lembretes'))
  from cron.job where jobname = 'ig-scheduler';

-- Pra conferir: select jobname, schedule from cron.job;
