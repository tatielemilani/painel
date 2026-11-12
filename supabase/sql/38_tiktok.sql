-- =====================================================================
-- 38_tiktok.sql
-- Aba TikTok: perfil, vídeos e a "foto do dia" dos números (o TikTok não
-- entrega histórico, então o painel guarda um retrato por dia).
-- O token e o "estado" do login ficam em tabelas SEM política: só as
-- funções (service_role) leem. O painel lê o perfil, os dias e os vídeos.
-- =====================================================================

create table if not exists public.tiktok_token (
  id                text primary key default 'main',
  open_id           text,
  access_token      text,
  refresh_token     text,
  expira_em         timestamptz,
  refresh_expira_em timestamptz,
  escopos           text,
  atualizado_em     timestamptz not null default now()
);
alter table public.tiktok_token enable row level security;

create table if not exists public.tiktok_oauth_estado (
  estado    text primary key,
  criado_em timestamptz not null default now()
);
alter table public.tiktok_oauth_estado enable row level security;

create table if not exists public.tiktok_perfil (
  id            text primary key default 'main',
  open_id       text,
  username      text,
  nome          text,
  avatar_url    text,
  bio           text,
  verificado    boolean,
  link          text,
  seguidores    bigint,
  seguindo      bigint,
  curtidas      bigint,
  videos        bigint,
  status        text,          -- ok | erro
  erro          text,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.tiktok_perfil_dia (
  data          date primary key,
  seguidores    bigint,
  seguindo      bigint,
  curtidas      bigint,
  videos        bigint,
  visualizacoes bigint,        -- soma das visualizações de todos os vídeos naquele dia
  atualizado_em timestamptz not null default now()
);

create table if not exists public.tiktok_videos (
  id                text primary key,
  titulo            text,
  descricao         text,
  capa_url          text,      -- o link da capa expira em poucos dias; o robô diário renova
  link              text,
  publicado_em      timestamptz,
  duracao           int,
  visualizacoes     bigint,
  curtidas          bigint,
  comentarios       bigint,
  compartilhamentos bigint,
  atualizado_em     timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['tiktok_perfil', 'tiktok_perfil_dia', 'tiktok_videos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists painel_le on public.%I', t);
    execute format('create policy painel_le on public.%I for select to authenticated using (true)', t);
  end loop;
end $$;

-- Robô diário: 6h da manhã (Brasília) = 9h UTC. Usa o mesmo endereço e a
-- mesma chave do robô ig-scheduler, só trocando o nome da função.
select cron.unschedule('tiktok-sync') where exists (select 1 from cron.job where jobname = 'tiktok-sync');
select cron.schedule('tiktok-sync', '0 9 * * *', replace(command, '/functions/v1/ig-scheduler', '/functions/v1/tiktok'))
  from cron.job where jobname = 'ig-scheduler';

-- Pra conferir: select jobname, schedule from cron.job;
