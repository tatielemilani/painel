-- =====================================================================
-- 01_tabelas.sql
-- Cria todas as tabelas do sistema. Rode PRIMEIRO no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem problema (usa "if not exists").
-- =====================================================================

create extension if not exists pgcrypto;  -- pra gen_random_uuid()

-- ---------------------------------------------------------------------
-- Automações: cada linha é um "gatilho + conversa".
-- A conversa INTEIRA (inclusive a Mensagem 1) mora no campo "flow".
-- Não existem colunas separadas de "mensagem" e "link": tudo está no fluxo.
-- ---------------------------------------------------------------------
create table if not exists public.ig_automations (
  id                    uuid primary key default gen_random_uuid(),
  nome                  text not null default 'Nova automação',
  keyword               text not null default '',          -- palavras separadas por vírgula
  match_any             boolean not null default false,    -- true = qualquer comentário dispara
  active                boolean not null default true,
  media_ids             text[] not null default '{}',      -- posts escolhidos (vazio = todos)
  public_reply          text not null default '',          -- resposta pública no comentário
  public_reply_variants text[] not null default '{}',      -- variações A/B
  flow                  jsonb not null default '{"steps":[]}'::jsonb,
  asset_ids             text[] not null default '{}',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Leads: cada pessoa que interagiu com uma automação.
-- ---------------------------------------------------------------------
create table if not exists public.ig_leads (
  ig_user_id     text primary key,
  username       text,
  last_source    text check (last_source in ('comment', 'dm', 'story_reply')),
  last_keyword   text,
  automation_id  uuid references public.ig_automations(id) on delete set null,
  flow_step      text,                 -- em que passo da conversa a pessoa está
  link_sent      boolean not null default false,
  expecting      jsonb,                -- quando um passo pediu um dado (email/telefone)
  tags           text[] not null default '{}',
  email          text,
  telefone       text,
  extras         jsonb not null default '{}'::jsonb,  -- outros dados coletados
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Log de cada envio (alimenta o painel e a regra do "1 por dia").
-- ---------------------------------------------------------------------
create table if not exists public.ig_deliveries (
  id             bigint generated always as identity primary key,
  ig_user_id     text,
  automation_id  uuid references public.ig_automations(id) on delete set null,
  canal          text check (canal in ('private_reply', 'dm')),
  tipo           text check (tipo in ('flow', 'link', 'text')),
  status         text check (status in ('ok', 'erro', 'na_fila')),
  motivo         text,
  ts             timestamptz not null default now()
);
create index if not exists ig_deliveries_user_ts on public.ig_deliveries (ig_user_id, ts desc);
create index if not exists ig_deliveries_ts on public.ig_deliveries (ts desc);

-- ---------------------------------------------------------------------
-- Fila: envios segurados pelo freio. O ig-scheduler esvazia a cada minuto.
-- ---------------------------------------------------------------------
create table if not exists public.ig_send_queue (
  id             bigint generated always as identity primary key,
  comment_id     text not null unique,
  automation_id  uuid references public.ig_automations(id) on delete cascade,
  ig_user_id     text,
  username       text,
  keyword        text,               -- o que a pessoa comentou (vai pro lead)
  status         text not null default 'pendente'
                 check (status in ('pendente', 'enviado', 'erro', 'expirado')),
  tentativas     int not null default 0,
  created_at     timestamptz not null default now(),
  sent_at        timestamptz,
  last_error     text
);
create index if not exists ig_send_queue_pend on public.ig_send_queue (status, created_at);

-- ---------------------------------------------------------------------
-- O CONTADOR do freio. Uma linha por "chave" (ex: 'private_reply').
-- As funções take_send_slot / record_send_result leem e escrevem AQUI.
-- SEM ESSA TABELA o freio não tem onde contar e o sistema trava mudo.
-- ---------------------------------------------------------------------
create table if not exists public.ig_send_budget (
  id                 text primary key,
  min_count          int not null default 0,
  hour_count         int not null default 0,
  day_count          int not null default 0,
  min_start          timestamptz,
  hour_start         timestamptz,
  day_start          timestamptz,
  err_streak         int not null default 0,   -- pontos de falha seguidos (dura = 3, comum = 1)
  cap_minute         int not null default 6,   -- tetos CONSERVADORES, bem abaixo do Instagram
  cap_hour           int not null default 60,
  cap_day            int not null default 180,
  breaker_points     int not null default 9,   -- com 9 pontos seguidos o disjuntor desarma
  pause_hours        int not null default 6,   -- por quantas horas pausa
  paused_until       timestamptz,
  updated_at         timestamptz not null default now()
);

-- Linha inicial (seed) com os tetos padrão.
insert into public.ig_send_budget (id) values ('private_reply')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Passos com atraso ("manda a próxima mensagem sozinho depois de X segundos").
-- ---------------------------------------------------------------------
create table if not exists public.ig_scheduled (
  id             bigint generated always as identity primary key,
  ig_user_id     text not null,
  automation_id  uuid references public.ig_automations(id) on delete cascade,
  step_id        text not null,
  send_at        timestamptz not null,
  sent           boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists ig_scheduled_due on public.ig_scheduled (sent, send_at);

-- ---------------------------------------------------------------------
-- Biblioteca de arquivos (PDF, áudio, foto, vídeo).
-- ---------------------------------------------------------------------
create table if not exists public.ig_assets (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null,
  tipo           text not null check (tipo in ('image', 'audio', 'video', 'file')),
  public_url     text not null,
  attachment_id  text,             -- cache do Instagram (reaproveita o upload)
  size_bytes     bigint,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Situação do token (aparece nas métricas).
-- ---------------------------------------------------------------------
create table if not exists public.ig_token_status (
  id                 text primary key default 'main',
  expires_at         timestamptz,
  last_ok            boolean,
  last_error         text,
  last_refreshed_at  timestamptz,
  updated_at         timestamptz not null default now()
);
insert into public.ig_token_status (id) values ('main') on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Cofre do token renovado. O ig-token-refresh grava o token novo aqui,
-- porque uma Edge Function não consegue alterar os próprios segredos.
-- RLS ligado e SEM política: só as Edge Functions (service_role) enxergam.
-- ---------------------------------------------------------------------
create table if not exists public.ig_token_store (
  id            text primary key default 'main',
  access_token  text not null,
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Ids das mensagens que o PRÓPRIO sistema enviou (pra reconhecer os "echos").
-- ---------------------------------------------------------------------
create table if not exists public.ig_bot_sends (
  mid         text primary key,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- "Já processei esse evento": evita responder duas vezes o mesmo comentário.
-- ---------------------------------------------------------------------
create table if not exists public.ig_processed_events (
  id          text primary key,
  created_at  timestamptz not null default now()
);
