-- =====================================================================
-- 06_interacoes.sql
-- Visão usada pela aba "Interações" do painel: cada lead com o nome da
-- automação e quantas mensagens a automação já mandou pra pessoa.
-- security_invoker = true: a visão respeita o RLS das tabelas (só quem
-- está logado no painel enxerga; o público anônimo não vê nada).
-- =====================================================================

create or replace view public.ig_leads_resumo
with (security_invoker = true) as
select
  l.*,
  a.nome as automacao_nome,
  (select count(*) from public.ig_deliveries d
    where d.ig_user_id = l.ig_user_id and d.status = 'ok') as interacoes
from public.ig_leads l
left join public.ig_automations a on a.id = l.automation_id;
