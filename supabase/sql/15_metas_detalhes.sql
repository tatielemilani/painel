-- =====================================================================
-- 15_metas_detalhes.sql
-- Janela "Detalhes da Meta": descrição, status, horizonte, impacto,
-- meta numérica, reflexão estratégica e checklist.
-- =====================================================================

alter table public.metas_ano
  add column if not exists descricao   text,
  add column if not exists status      text check (status in ('construcao', 'progresso', 'concluida')),
  add column if not exists horizonte   text check (horizonte in ('curto', 'medio', 'longo')),
  add column if not exists impacto     text check (impacto in ('baixo', 'medio', 'alto')),
  add column if not exists valor_meta  numeric,
  add column if not exists valor_atual numeric,
  add column if not exists por_que     text,   -- Por que essa meta é importante?
  add column if not exists mudanca     text,   -- Como sua vida muda ao concluir?
  add column if not exists obstaculos  text,   -- O que pode te atrapalhar?
  add column if not exists micro_passo text,   -- Qual é o próximo micro passo?
  add column if not exists checklist   jsonb not null default '[]';  -- [{ "texto": "...", "feita": false }]
