-- SalaoPremiun Profissional PWA - schema inicial para Supabase
-- Login por CPF: crie o usuario no Supabase Auth com email tecnico:
-- somente numeros do CPF + '@profissional.salaopremiun.local'
-- Exemplo CPF 123.456.789-00 -> 12345678900@profissional.salaopremiun.local

create extension if not exists pgcrypto;

create or replace function public.app_profissional_login(p_cpf text, p_senha text)
returns table (
  id uuid,
  id_salao uuid,
  nome text,
  nome_exibicao text,
  cpf text,
  telefone text,
  email text,
  ativo boolean,
  intervalo_agenda_minutos integer,
  horario_funcionamento jsonb
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_acesso record;
begin
  select a.id, a.id_profissional, a.cpf, a.senha_hash, a.ativo
    into v_acesso
  from public.profissionais_acessos a
  where a.cpf = v_cpf
    and a.ativo = true
  limit 1;

  if v_acesso.id is null then
    return;
  end if;

  if crypt(coalesce(p_senha, ''), v_acesso.senha_hash) <> v_acesso.senha_hash then
    return;
  end if;

  update public.profissionais_acessos
     set ultimo_login_em = now()
   where profissionais_acessos.id = v_acesso.id;

  return query
  select
    p.id,
    p.id_salao,
    p.nome,
    p.nome_exibicao,
    v_acesso.cpf::text,
    p.telefone::text,
    p.email::text,
    p.ativo,
    coalesce(p.intervalo_agenda_minutos, 30),
    coalesce(p.dias_trabalho, '[]'::jsonb)
  from public.profissionais p
  where p.id = v_acesso.id_profissional
    and p.ativo = true
    and coalesce(p.tipo_profissional, 'profissional') <> 'assistente'
  limit 1;
end;
$$;

grant execute on function public.app_profissional_login(text, text) to anon, authenticated;

create or replace function public.app_profissional_dados(p_profissional_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
with prof as (
  select id, id_salao from public.profissionais where id = p_profissional_id and ativo = true limit 1
), ag as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'profissional_id', a.profissional_id,
    'cliente_id', a.cliente_id,
    'servico_id', a.servico_id,
    'data', a.data::text,
    'hora_inicio', left(a.hora_inicio::text, 5),
    'hora_fim', left(a.hora_fim::text, 5),
    'status', case when a.status = 'bloqueado' then 'bloqueado' when a.status = 'cancelado' then 'cancelado' when a.status = 'confirmado' then 'confirmado' else 'pendente' end,
    'titulo', null,
    'observacoes', a.observacoes,
    'clientes', case when c.id is null then null else jsonb_build_object('nome', c.nome, 'telefone', c.telefone) end,
    'servicos', case when s.id is null then null else jsonb_build_object('nome', s.nome, 'preco', coalesce(s.preco, s.preco_padrao, 0), 'duracao_minutos', coalesce(s.duracao_minutos, s.duracao, a.duracao_minutos, 30)) end
  ) order by a.data, a.hora_inicio), '[]'::jsonb) as data
  from public.agendamentos a
  join prof p on p.id = a.profissional_id
  left join public.clientes c on c.id = a.cliente_id
  left join public.servicos s on s.id = a.servico_id
  where a.data between (current_date - interval '45 days')::date and (current_date + interval '120 days')::date
), cl as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'profissional_id', p_profissional_id,
    'nome', c.nome,
    'telefone', c.telefone,
    'observacoes', c.observacoes,
    'created_at', coalesce(c.created_at, '')
  ) order by c.nome), '[]'::jsonb) as data
  from public.clientes c
  join prof p on p.id_salao = c.id_salao
  where c.deleted_at is null
), sv as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'profissional_id', ps.id_profissional,
    'nome', s.nome,
    'preco', coalesce(ps.preco_personalizado, s.preco, s.preco_padrao, 0),
    'duracao_minutos', coalesce(ps.duracao_minutos, s.duracao_minutos, s.duracao, 30),
    'ativo', coalesce(ps.ativo, s.ativo, true)
  ) order by coalesce(ps.ordem, 999), s.nome), '[]'::jsonb) as data
  from public.profissional_servicos ps
  join public.servicos s on s.id = ps.id_servico
  join prof p on p.id = ps.id_profissional
  where coalesce(ps.ativo, true) = true
)
select jsonb_build_object(
  'agendamentos', ag.data,
  'clientes', cl.data,
  'servicos', sv.data,
  'comandas', '[]'::jsonb,
  'itensComanda', '[]'::jsonb,
  'notificacoes', '[]'::jsonb
)
from ag, cl, sv;
$$;

grant execute on function public.app_profissional_dados(uuid) to anon, authenticated;

create table if not exists public.profissionais (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  nome text not null,
  cpf text not null unique,
  telefone text,
  email text,
  ativo boolean not null default true,
  intervalo_agenda_minutos integer not null default 30 check (intervalo_agenda_minutos in (30, 60, 120)),
  horario_funcionamento jsonb not null default '[
    {"dia":0,"ativo":false,"inicio":"08:00","fim":"18:00"},
    {"dia":1,"ativo":true,"inicio":"08:00","fim":"18:00"},
    {"dia":2,"ativo":true,"inicio":"08:00","fim":"18:00"},
    {"dia":3,"ativo":true,"inicio":"08:00","fim":"18:00"},
    {"dia":4,"ativo":true,"inicio":"08:00","fim":"18:00"},
    {"dia":5,"ativo":true,"inicio":"08:00","fim":"18:00"},
    {"dia":6,"ativo":true,"inicio":"08:00","fim":"12:00"}
  ]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  nome text not null,
  telefone text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.servicos (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  nome text not null,
  preco numeric(10,2) not null default 0,
  duracao_minutos integer not null default 30 check (duracao_minutos > 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  servico_id uuid references public.servicos(id) on delete set null,
  data date not null,
  hora_inicio time not null,
  hora_fim time not null,
  status text not null default 'pendente' check (status in ('pendente', 'confirmado', 'cancelado', 'bloqueado')),
  titulo text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agendamento_periodo_valido check (hora_fim > hora_inicio)
);

create table if not exists public.comandas (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  cliente_nome text not null default 'Consumidor Final',
  status text not null default 'aberta' check (status in ('aberta', 'fechada', 'cancelada')),
  total numeric(10,2) not null default 0,
  aberta_em timestamptz not null default now(),
  fechada_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.itens_comanda (
  id uuid primary key default gen_random_uuid(),
  comanda_id uuid not null references public.comandas(id) on delete cascade,
  servico_id uuid references public.servicos(id) on delete set null,
  tipo text not null default 'servico' check (tipo in ('servico', 'produto')),
  nome text not null,
  quantidade integer not null default 1 check (quantidade > 0),
  valor_unitario numeric(10,2) not null default 0,
  total numeric(10,2) generated always as (quantidade * valor_unitario) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  titulo text not null,
  mensagem text not null,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_clientes_profissional on public.clientes(profissional_id);
create index if not exists idx_servicos_profissional on public.servicos(profissional_id);
create index if not exists idx_agendamentos_profissional_data on public.agendamentos(profissional_id, data);
create index if not exists idx_comandas_profissional_status on public.comandas(profissional_id, status);
create index if not exists idx_notificacoes_profissional on public.notificacoes(profissional_id, lida, created_at desc);

create or replace function public.app_profissional_reagendar_agendamento(
  p_profissional_id uuid,
  p_agendamento_id uuid,
  p_data date,
  p_hora_inicio time,
  p_hora_fim time
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agendamento record;
begin
  select a.id, a.profissional_id, a.status, c.nome as cliente_nome
    into v_agendamento
  from public.agendamentos a
  left join public.clientes c on c.id = a.cliente_id
  where a.id = p_agendamento_id
    and a.profissional_id = p_profissional_id
    and a.status in ('pendente', 'confirmado')
  limit 1;

  if v_agendamento.id is null then
    raise exception 'Agendamento nao encontrado ou nao pode ser reagendado.';
  end if;

  update public.agendamentos
     set data = p_data,
         hora_inicio = p_hora_inicio,
         hora_fim = p_hora_fim,
         updated_at = now()
   where id = p_agendamento_id
     and profissional_id = p_profissional_id;

  if to_regclass('public.notificacoes') is not null then
    insert into public.notificacoes (profissional_id, titulo, mensagem)
    values (
      p_profissional_id,
      'Agendamento reagendado',
      coalesce(v_agendamento.cliente_nome, 'Cliente') || ' foi reagendado para ' || to_char(p_data, 'DD/MM/YYYY') || ' as ' || left(p_hora_inicio::text, 5)
    );
  end if;
end;
$$;

grant execute on function public.app_profissional_reagendar_agendamento(uuid, uuid, date, time, time) to anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profissionais_updated_at on public.profissionais;
create trigger set_profissionais_updated_at before update on public.profissionais
for each row execute function public.set_updated_at();

drop trigger if exists set_clientes_updated_at on public.clientes;
create trigger set_clientes_updated_at before update on public.clientes
for each row execute function public.set_updated_at();

drop trigger if exists set_servicos_updated_at on public.servicos;
create trigger set_servicos_updated_at before update on public.servicos
for each row execute function public.set_updated_at();

drop trigger if exists set_agendamentos_updated_at on public.agendamentos;
create trigger set_agendamentos_updated_at before update on public.agendamentos
for each row execute function public.set_updated_at();

drop trigger if exists set_comandas_updated_at on public.comandas;
create trigger set_comandas_updated_at before update on public.comandas
for each row execute function public.set_updated_at();

create or replace function public.recalcular_total_comanda()
returns trigger
language plpgsql
as $$
declare
  alvo uuid;
begin
  alvo := coalesce(new.comanda_id, old.comanda_id);

  update public.comandas
  set total = coalesce((select sum(total) from public.itens_comanda where comanda_id = alvo), 0)
  where id = alvo;

  return coalesce(new, old);
end;
$$;

drop trigger if exists recalcular_total_comanda_insert on public.itens_comanda;
create trigger recalcular_total_comanda_insert after insert or update or delete on public.itens_comanda
for each row execute function public.recalcular_total_comanda();

alter table public.profissionais enable row level security;
alter table public.clientes enable row level security;
alter table public.servicos enable row level security;
alter table public.agendamentos enable row level security;
alter table public.comandas enable row level security;
alter table public.itens_comanda enable row level security;
alter table public.notificacoes enable row level security;

create or replace function public.profissional_logado_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profissionais where auth_user_id = auth.uid() limit 1
$$;

drop policy if exists profissionais_select_own on public.profissionais;
create policy profissionais_select_own on public.profissionais
for select using (auth_user_id = auth.uid());

drop policy if exists profissionais_update_own on public.profissionais;
create policy profissionais_update_own on public.profissionais
for update using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

drop policy if exists clientes_crud_own on public.clientes;
create policy clientes_crud_own on public.clientes
for all using (profissional_id = public.profissional_logado_id())
with check (profissional_id = public.profissional_logado_id());

drop policy if exists servicos_crud_own on public.servicos;
create policy servicos_crud_own on public.servicos
for all using (profissional_id = public.profissional_logado_id())
with check (profissional_id = public.profissional_logado_id());

drop policy if exists agendamentos_crud_own on public.agendamentos;
create policy agendamentos_crud_own on public.agendamentos
for all using (profissional_id = public.profissional_logado_id())
with check (profissional_id = public.profissional_logado_id());

drop policy if exists comandas_crud_own on public.comandas;
create policy comandas_crud_own on public.comandas
for all using (profissional_id = public.profissional_logado_id())
with check (profissional_id = public.profissional_logado_id());

drop policy if exists itens_comanda_crud_own on public.itens_comanda;
create policy itens_comanda_crud_own on public.itens_comanda
for all using (
  exists (
    select 1 from public.comandas c
    where c.id = itens_comanda.comanda_id
      and c.profissional_id = public.profissional_logado_id()
  )
)
with check (
  exists (
    select 1 from public.comandas c
    where c.id = itens_comanda.comanda_id
      and c.profissional_id = public.profissional_logado_id()
  )
);

drop policy if exists notificacoes_crud_own on public.notificacoes;
create policy notificacoes_crud_own on public.notificacoes
for all using (profissional_id = public.profissional_logado_id())
with check (profissional_id = public.profissional_logado_id());
