-- =====================================================================
-- 02_freio.sql
-- As funções do FREIO de envio (balde de fichas atômico).
--
-- AVISO IMPORTANTE: sem essas duas funções o freio falha FECHADO.
-- Ou seja: NENHUMA DM por comentário sai, tudo vai pra fila e a fila
-- nunca anda. Este é o passo que não pode faltar.
-- =====================================================================

-- ---------------------------------------------------------------------
-- take_send_slot: tenta pegar UMA ficha de envio.
-- Retorna true = pode enviar agora / false = segura (vai pra fila).
-- Respeita os tetos por minuto, hora e dia da tabela ig_send_budget,
-- e o disjuntor (paused_until).
-- ---------------------------------------------------------------------
create or replace function public.take_send_slot(p_key text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  b     public.ig_send_budget%rowtype;
  agora timestamptz := now();
  pode  boolean;
begin
  -- Garante que a linha existe (se alguém esqueceu o seed).
  insert into public.ig_send_budget (id) values (p_key) on conflict (id) do nothing;

  -- Trava a linha: dois envios ao mesmo tempo nunca pegam a mesma ficha.
  select * into b from public.ig_send_budget where id = p_key for update;

  -- Disjuntor desarmado? Nada sai até o fim da pausa.
  if b.paused_until is not null and b.paused_until > agora then
    return false;
  end if;

  -- Zera as janelas que já viraram.
  if b.min_start is null or agora >= b.min_start + interval '1 minute' then
    b.min_count := 0;  b.min_start := date_trunc('minute', agora);
  end if;
  if b.hour_start is null or agora >= b.hour_start + interval '1 hour' then
    b.hour_count := 0; b.hour_start := date_trunc('hour', agora);
  end if;
  if b.day_start is null or agora >= b.day_start + interval '1 day' then
    b.day_count := 0;  b.day_start := date_trunc('day', agora);
  end if;

  pode := b.min_count < b.cap_minute
      and b.hour_count < b.cap_hour
      and b.day_count < b.cap_day;

  if pode then
    b.min_count  := b.min_count + 1;
    b.hour_count := b.hour_count + 1;
    b.day_count  := b.day_count + 1;
  end if;

  update public.ig_send_budget set
    min_count = b.min_count, hour_count = b.hour_count, day_count = b.day_count,
    min_start = b.min_start, hour_start = b.hour_start, day_start = b.day_start,
    paused_until = null, updated_at = agora
  where id = p_key;

  return pode;
end;
$$;

-- ---------------------------------------------------------------------
-- record_send_result: registra como foi o envio, pra alimentar o disjuntor.
--   p_ok   = true se saiu
--   p_hard = true se foi falha "dura" (bloqueio, limite estourado)
-- Falha dura vale 3 pontos, falha comum vale 1. Ao chegar em
-- breaker_points (padrão 9, ou seja, 3 falhas duras seguidas),
-- pausa os envios por pause_hours (padrão 6 horas).
-- Um envio com sucesso zera a contagem.
-- ---------------------------------------------------------------------
create or replace function public.record_send_result(p_key text, p_ok boolean, p_hard boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.ig_send_budget%rowtype;
begin
  insert into public.ig_send_budget (id) values (p_key) on conflict (id) do nothing;
  select * into b from public.ig_send_budget where id = p_key for update;

  if p_ok then
    update public.ig_send_budget set err_streak = 0, updated_at = now() where id = p_key;
    return;
  end if;

  b.err_streak := b.err_streak + (case when p_hard then 3 else 1 end);

  if b.err_streak >= b.breaker_points then
    update public.ig_send_budget
       set err_streak = 0,
           paused_until = now() + make_interval(hours => b.pause_hours),
           updated_at = now()
     where id = p_key;
  else
    update public.ig_send_budget set err_streak = b.err_streak, updated_at = now() where id = p_key;
  end if;
end;
$$;

-- Só as Edge Functions (service_role) podem chamar o freio.
revoke all on function public.take_send_slot(text) from public, anon, authenticated;
revoke all on function public.record_send_result(text, boolean, boolean) from public, anon, authenticated;
grant execute on function public.take_send_slot(text) to service_role;
grant execute on function public.record_send_result(text, boolean, boolean) to service_role;
