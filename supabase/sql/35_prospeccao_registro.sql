-- =====================================================================
-- 35_prospeccao_registro.sql
-- Registro da abordagem na ficha de prospecção.
-- clientes.canal:              por onde a abordagem começou
--                              (Instagram, e-mail, WhatsApp, Pinterest, TikTok).
-- cliente_interacoes.direcao:  'enviei' (você mandou) ou 'recebi' (a marca respondeu/chamou).
-- cliente_interacoes.followup: essa mensagem foi um follow-up.
-- Novos tipos de interação: instagram, pinterest e tiktok.
-- =====================================================================

alter table public.clientes add column if not exists canal text
  check (canal in ('instagram', 'email', 'whatsapp', 'pinterest', 'tiktok'));

alter table public.cliente_interacoes drop constraint if exists cliente_interacoes_tipo_check;
alter table public.cliente_interacoes add constraint cliente_interacoes_tipo_check
  check (tipo in ('email', 'whatsapp', 'ligacao', 'reuniao', 'proposta', 'nota', 'instagram', 'pinterest', 'tiktok'));
alter table public.cliente_interacoes add column if not exists direcao text check (direcao in ('enviei', 'recebi'));
alter table public.cliente_interacoes add column if not exists followup boolean not null default false;
