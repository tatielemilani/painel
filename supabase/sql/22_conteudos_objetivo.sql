-- =====================================================================
-- 22_conteudos_objetivo.sql
-- Conteúdo > Pessoal: objetivo de cada ideia (atração, conexão ou conversão).
-- =====================================================================

alter table public.conteudos add column if not exists objetivo text
  check (objetivo in ('atracao', 'conexao', 'conversao'));
