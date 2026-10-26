-- =====================================================================
-- 03_rls.sql
-- Regras de acesso (RLS). Liga a tranca em TODAS as tabelas.
--
-- Quem pode o quê:
--  * Público anônimo: NADA.
--  * Usuário logado no painel (authenticated): lê e escreve as tabelas do painel.
--  * Edge Functions: usam a chave service_role, que ignora o RLS.
-- =====================================================================

alter table public.ig_automations      enable row level security;
alter table public.ig_leads            enable row level security;
alter table public.ig_deliveries       enable row level security;
alter table public.ig_send_queue       enable row level security;
alter table public.ig_send_budget      enable row level security;
alter table public.ig_scheduled        enable row level security;
alter table public.ig_assets           enable row level security;
alter table public.ig_token_status     enable row level security;
alter table public.ig_token_store      enable row level security;  -- sem política: o painel nunca lê o token
alter table public.ig_bot_sends        enable row level security;  -- sem política: só as funções
alter table public.ig_processed_events enable row level security;  -- sem política: só as funções

-- Painel: acesso total pra quem está logado.
do $$
declare t text;
begin
  foreach t in array array[
    'ig_automations', 'ig_leads', 'ig_deliveries', 'ig_send_queue',
    'ig_send_budget', 'ig_scheduled', 'ig_assets', 'ig_token_status'
  ] loop
    execute format('drop policy if exists painel_logado on public.%I', t);
    execute format(
      'create policy painel_logado on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Storage: pasta pública pros arquivos da biblioteca (o Instagram
-- precisa conseguir baixar o arquivo pela URL pública).
-- Só quem está logado pode enviar ou apagar.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('ig-assets', 'ig-assets', true)
on conflict (id) do nothing;

drop policy if exists ig_assets_upload on storage.objects;
create policy ig_assets_upload on storage.objects
  for insert to authenticated with check (bucket_id = 'ig-assets');

drop policy if exists ig_assets_delete on storage.objects;
create policy ig_assets_delete on storage.objects
  for delete to authenticated using (bucket_id = 'ig-assets');
