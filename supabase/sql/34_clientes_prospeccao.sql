-- =====================================================================
-- 34_clientes_prospeccao.sql
-- Ficha de prospecção (aba Em Abordagem): em que etapa está a conversa
-- com a marca e qual serviço/campanha está sendo oferecido.
-- =====================================================================

alter table public.clientes add column if not exists etapa text
  check (etapa in ('quero', 'contato', 'conversa', 'proposta', 'negociacao', 'fechado', 'nao_avancou'));
alter table public.clientes add column if not exists servico text;
alter table public.clientes add column if not exists etapa_em date; -- quando mudou de etapa (conta os fechados do mês)

update public.clientes set etapa = 'quero'
where etapa is null and status_lista ? 'prospect';
