-- =====================================================================
-- 20_clientes_tipos.sql
-- Clientes: nicho, pessoa responsável e data do próximo follow-up.
-- Campanhas: tipos novos (Embaixadora, Permuta, Afiliado, Presença VIP, Outro).
-- =====================================================================

alter table public.clientes add column if not exists nicho       text;
alter table public.clientes add column if not exists responsavel text;
alter table public.clientes add column if not exists followup    date;

alter table public.campanhas drop constraint if exists campanhas_tipo_check;
alter table public.campanhas add constraint campanhas_tipo_check
  check (tipo in ('publi', 'ugc', 'embaixadora', 'permuta', 'afiliado', 'vip', 'outro'));
