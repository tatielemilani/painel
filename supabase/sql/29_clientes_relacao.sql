-- =====================================================================
-- 29_clientes_relacao.sql
-- Etiqueta da coluna Tag escolhida à mão: já trabalhei, trabalhando,
-- em abordagem ou novo contato. Vazio = o painel decide sozinho.
-- =====================================================================

alter table public.clientes add column if not exists relacao text
  check (relacao in ('ja_trabalhei', 'trabalhando', 'abordagem', 'novo'));
