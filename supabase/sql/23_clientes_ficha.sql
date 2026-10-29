-- =====================================================================
-- 23_clientes_ficha.sql
-- Ficha do cliente: dados da empresa, gestão, tags e notas internas,
-- e o histórico de interações (email, WhatsApp, ligação, reunião...).
-- Só quem está logado no painel lê e escreve. O público não vê nada.
-- =====================================================================

alter table public.clientes add column if not exists cnpj            text;
alter table public.clientes add column if not exists tiktok          text;
alter table public.clientes add column if not exists ultimo_contato  date;
alter table public.clientes add column if not exists recorrente      boolean not null default false;
alter table public.clientes add column if not exists valor_potencial numeric(12, 2);
alter table public.clientes add column if not exists tags            jsonb not null default '[]'::jsonb;
alter table public.clientes add column if not exists notas_internas  text;

create table if not exists public.cliente_interacoes (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references public.clientes (id) on delete cascade,
  tipo          text not null default 'nota'
                check (tipo in ('email', 'whatsapp', 'ligacao', 'reuniao', 'proposta', 'nota')),
  texto         text not null,
  proxima_acao  text,
  proxima_data  date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists cliente_interacoes_cliente_idx on public.cliente_interacoes (cliente_id, created_at desc);

alter table public.cliente_interacoes enable row level security;
create policy painel_logado on public.cliente_interacoes for all to authenticated using (true) with check (true);

-- Status "permuta" (cliente que paga em produtos ou serviços)
alter table public.clientes drop constraint if exists clientes_status_check;
alter table public.clientes add constraint clientes_status_check
  check (status in ('prospect', 'ativo', 'permuta', 'inativo'));
