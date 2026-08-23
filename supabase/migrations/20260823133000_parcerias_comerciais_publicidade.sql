create table if not exists public.parceiros_comerciais (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  nome_fantasia text,
  cpf_cnpj text,
  email text,
  whatsapp text,
  telefone text,
  site_url text,
  instagram text,
  segmento text,
  cidade text,
  uf text,
  status text not null default 'prospect' check (status in ('prospect','negociacao','ativo','pausado','encerrado')),
  observacoes text,
  criado_por uuid references public.admin_master_usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.parceria_campanhas (
  id uuid primary key default gen_random_uuid(),
  id_parceiro uuid not null references public.parceiros_comerciais(id) on delete cascade,
  id_campanha uuid references public.campanhas(id) on delete set null,
  nome text not null,
  descricao text,
  publico text[] not null default array['salao']::text[],
  regioes jsonb not null default '{}'::jsonb,
  locais_exibicao text[] not null default array['dashboard']::text[],
  destino_url text,
  cupom_codigo text,
  modelo_cobranca text not null default 'mensal' check (modelo_cobranca in ('mensal','periodo','cpm','cpc','cpa','permuta')),
  valor_contratado numeric(12,2) not null default 0,
  inicio_em timestamptz,
  fim_em timestamptz,
  status text not null default 'rascunho' check (status in ('rascunho','aguardando_contrato','agendada','ativa','pausada','encerrada','cancelada')),
  criado_por uuid references public.admin_master_usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint parceria_campanhas_periodo check (fim_em is null or inicio_em is null or fim_em >= inicio_em)
);

create table if not exists public.parceria_criativos (
  id uuid primary key default gen_random_uuid(),
  id_campanha uuid not null references public.parceria_campanhas(id) on delete cascade,
  titulo text,
  subtitulo text,
  imagem_url text,
  alt_text text,
  cta_texto text,
  destino_url text,
  formato text not null default 'banner',
  ordem integer not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.parceria_contratos (
  id uuid primary key default gen_random_uuid(),
  id_parceiro uuid not null references public.parceiros_comerciais(id) on delete restrict,
  id_campanha uuid references public.parceria_campanhas(id) on delete set null,
  numero text not null unique,
  versao text not null default '1.0',
  titulo text not null default 'Contrato de Publicidade e Parceria Comercial',
  conteudo_snapshot text not null,
  valor numeric(12,2) not null default 0,
  inicio_vigencia date,
  fim_vigencia date,
  status text not null default 'rascunho' check (status in ('rascunho','enviado','visualizado','assinado','recusado','cancelado','expirado')),
  provedor_assinatura text,
  envelope_externo_id text,
  url_assinatura text,
  hash_documento_sha256 text,
  signatario_nome text,
  signatario_email text,
  signatario_cpf text,
  assinado_em timestamptz,
  evidencia_assinatura jsonb not null default '{}'::jsonb,
  criado_por uuid references public.admin_master_usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.parceria_metricas_diarias (
  id_campanha uuid not null references public.parceria_campanhas(id) on delete cascade,
  data date not null,
  local_exibicao text not null,
  impressoes bigint not null default 0 check (impressoes >= 0),
  cliques bigint not null default 0 check (cliques >= 0),
  conversoes bigint not null default 0 check (conversoes >= 0),
  cupons_utilizados bigint not null default 0 check (cupons_utilizados >= 0),
  atualizado_em timestamptz not null default now(),
  primary key (id_campanha, data, local_exibicao)
);

create index if not exists idx_parceiros_comerciais_status on public.parceiros_comerciais(status);
create index if not exists idx_parceria_campanhas_parceiro_status on public.parceria_campanhas(id_parceiro,status);
create index if not exists idx_parceria_campanhas_periodo on public.parceria_campanhas(inicio_em,fim_em) where status in ('agendada','ativa');
create index if not exists idx_parceria_contratos_parceiro_status on public.parceria_contratos(id_parceiro,status);

alter table public.parceiros_comerciais enable row level security;
alter table public.parceria_campanhas enable row level security;
alter table public.parceria_criativos enable row level security;
alter table public.parceria_contratos enable row level security;
alter table public.parceria_metricas_diarias enable row level security;

revoke all on public.parceiros_comerciais from anon, authenticated;
revoke all on public.parceria_campanhas from anon, authenticated;
revoke all on public.parceria_criativos from anon, authenticated;
revoke all on public.parceria_contratos from anon, authenticated;
revoke all on public.parceria_metricas_diarias from anon, authenticated;

comment on table public.parceiros_comerciais is 'Parceiros comerciais e anunciantes do Salao Premium. Acesso administrativo via backend service role.';
comment on table public.parceria_campanhas is 'Campanhas publicitarias diretas vinculadas a parceiros comerciais.';
comment on table public.parceria_contratos is 'Snapshots e trilha de assinatura de contratos comerciais; nao armazena segredo de provedor.';
comment on table public.parceria_metricas_diarias is 'Metricas agregadas por dia para reduzir volume e custo no Supabase.';
