-- =====================================================================
-- 19_campanhas.sql
-- Conteúdo > Profissional: campanhas de publi e UGC (cliente, valor,
-- prazo de pagamento, roteiro e as datas do fluxo de trabalho).
-- "Criar tarefas automaticamente" põe cada data no Calendário
-- (cal_eventos com campanha_id; apagar a campanha apaga as tarefas).
-- Só quem está logado no painel lê e escreve. O público não vê nada.
-- =====================================================================

create table if not exists public.campanhas (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null,
  cliente     text,
  tipo        text not null default 'publi' check (tipo in ('publi', 'ugc')),
  status      text not null default 'briefing'
              check (status in ('briefing', 'roteiro', 'gravacao', 'aprovacao', 'postagem', 'faturamento', 'finalizada')),
  qtd         integer not null default 1 check (qtd >= 0),
  valor       numeric(12, 2) not null default 0,
  prazo_pgto  integer not null default 30,   -- dias depois do faturamento (0 = à vista)
  pago        boolean not null default false,
  favorita    boolean not null default false,
  roteiro     text,
  datas       jsonb not null default '{}'::jsonb, -- { briefing, roteiro, gravacao, aprovacao, postagem, faturamento }
  link        text,                               -- link do conteúdo entregue
  notas       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.cal_eventos
  add column if not exists campanha_id uuid references public.campanhas (id) on delete cascade;
create index if not exists cal_eventos_campanha_idx on public.cal_eventos (campanha_id);

alter table public.campanhas enable row level security;
create policy painel_logado on public.campanhas for all to authenticated using (true) with check (true);
