create extension if not exists pgcrypto;

create table if not exists public.cursos_usuarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null,
  cpf text not null,
  telefone text not null,
  data_nascimento date not null,
  cep text not null,
  endereco text not null,
  numero text not null,
  complemento text,
  bairro text not null,
  cidade text not null,
  estado text not null,
  responsavel_nome text,
  responsavel_cpf text,
  responsavel_email text,
  responsavel_telefone text,
  responsavel_parentesco text,
  password_hash text not null,
  role text not null default 'aluno' check (role in ('aluno','professor','admin')),
  marketing_aceito boolean not null default false,
  imagem_aceita boolean not null default false,
  termo_cadastro_aceito_em timestamptz,
  termo_cadastro_assinatura text,
  termo_cadastro_versao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint cursos_usuarios_email_unique unique (email),
  constraint cursos_usuarios_cpf_unique unique (cpf)
);

create table if not exists public.cursos_catalogo (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  resumo text not null,
  descricao text not null,
  carga_horaria integer not null check (carga_horaria > 0),
  valor_centavos integer not null default 0 check (valor_centavos >= 0),
  imagem_url text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.cursos_turmas (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.cursos_catalogo(id) on delete cascade,
  nome text not null,
  inicio_em timestamptz not null,
  fim_em timestamptz not null,
  local text not null,
  vagas integer not null check (vagas > 0),
  status text not null default 'rascunho' check (status in ('rascunho','aberta','encerrada')),
  criado_em timestamptz not null default now(),
  check (fim_em >= inicio_em)
);

create table if not exists public.cursos_matriculas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.cursos_usuarios(id) on delete restrict,
  curso_id uuid not null references public.cursos_catalogo(id) on delete restrict,
  turma_id uuid not null references public.cursos_turmas(id) on delete restrict,
  status text not null default 'pendente' check (status in ('pendente','confirmada','em_andamento','concluida','cancelada')),
  pagamento_status text not null default 'pendente' check (pagamento_status in ('pendente','pago','isento','estornado')),
  frequencia_percentual numeric(5,2) not null default 0 check (frequencia_percentual between 0 and 100),
  progresso_percentual numeric(5,2) not null default 0 check (progresso_percentual between 0 and 100),
  contrato_aceito_em timestamptz,
  concluido_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (aluno_id, turma_id)
);

create table if not exists public.cursos_contratos (
  id uuid primary key default gen_random_uuid(),
  matricula_id uuid not null unique references public.cursos_matriculas(id) on delete cascade,
  versao text not null,
  conteudo_snapshot text not null,
  assinatura_nome text not null,
  assinado_em timestamptz not null,
  criado_em timestamptz not null default now()
);

create table if not exists public.cursos_modulos (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.cursos_catalogo(id) on delete cascade,
  titulo text not null,
  descricao text,
  ordem integer not null default 1,
  criado_em timestamptz not null default now()
);

create table if not exists public.cursos_materiais (
  id uuid primary key default gen_random_uuid(),
  modulo_id uuid not null references public.cursos_modulos(id) on delete cascade,
  titulo text not null,
  tipo text not null check (tipo in ('arquivo','video','link')),
  storage_path text,
  url_externa text,
  criado_em timestamptz not null default now(),
  check (storage_path is not null or url_externa is not null)
);

create table if not exists public.cursos_certificados (
  id uuid primary key default gen_random_uuid(),
  matricula_id uuid not null unique references public.cursos_matriculas(id) on delete restrict,
  codigo text not null unique,
  emitido_em timestamptz not null default now(),
  revogado_em timestamptz
);

create table if not exists public.cursos_auditoria (
  id bigint generated always as identity primary key,
  ator_id uuid references public.cursos_usuarios(id) on delete set null,
  entidade text not null,
  entidade_id uuid,
  acao text not null,
  detalhes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists cursos_turmas_curso_inicio_idx on public.cursos_turmas(curso_id, inicio_em);
create index if not exists cursos_matriculas_aluno_idx on public.cursos_matriculas(aluno_id, criado_em desc);
create index if not exists cursos_matriculas_turma_idx on public.cursos_matriculas(turma_id, status);
create index if not exists cursos_modulos_curso_ordem_idx on public.cursos_modulos(curso_id, ordem);

alter table public.cursos_usuarios enable row level security;
alter table public.cursos_catalogo enable row level security;
alter table public.cursos_turmas enable row level security;
alter table public.cursos_matriculas enable row level security;
alter table public.cursos_contratos enable row level security;
alter table public.cursos_modulos enable row level security;
alter table public.cursos_materiais enable row level security;
alter table public.cursos_certificados enable row level security;
alter table public.cursos_auditoria enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cursos-materiais', 'cursos-materiais', false, 26214400, array['application/pdf','video/mp4','image/jpeg','image/png'])
on conflict (id) do update set public = false, file_size_limit = 26214400;
