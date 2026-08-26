create extension if not exists pgcrypto;

create table if not exists public.whatsapp_tarifas (
  id uuid primary key default gen_random_uuid(),
  tipo_interno text not null unique,
  categoria_meta text not null,
  nome text not null,
  descricao text not null,
  custo_base_meta_centavos integer not null default 0 check (custo_base_meta_centavos >= 0),
  preco_venda_centavos integer not null default 0 check (preco_venda_centavos >= 0),
  margem_centavos integer generated always as (preco_venda_centavos - custo_base_meta_centavos) stored,
  ativo boolean not null default true,
  ordem integer not null default 0,
  criado_em timestamptz not null default timezone('utc', now()),
  atualizado_em timestamptz not null default timezone('utc', now())
);

create table if not exists public.whatsapp_creditos_saloes (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  saldo_centavos bigint not null default 0 check (saldo_centavos >= 0),
  total_recarregado_centavos bigint not null default 0 check (total_recarregado_centavos >= 0),
  total_consumido_centavos bigint not null default 0 check (total_consumido_centavos >= 0),
  alerta_saldo_baixo_centavos integer not null default 1000 check (alerta_saldo_baixo_centavos >= 0),
  ultima_recarga_em timestamptz,
  ultima_notificacao_saldo_baixo_em timestamptz,
  criado_em timestamptz not null default timezone('utc', now()),
  atualizado_em timestamptz not null default timezone('utc', now()),
  unique (id_salao)
);

create table if not exists public.whatsapp_creditos_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  tipo text not null check (tipo in ('recarga', 'consumo', 'estorno', 'ajuste_admin')),
  valor_centavos bigint not null,
  saldo_antes_centavos bigint not null check (saldo_antes_centavos >= 0),
  saldo_depois_centavos bigint not null check (saldo_depois_centavos >= 0),
  categoria text,
  tipo_interno text,
  id_mensagem uuid references public.whatsapp_envios(id) on delete set null,
  id_agendamento uuid references public.agendamentos(id) on delete set null,
  id_movimentacao_origem uuid references public.whatsapp_creditos_movimentacoes(id) on delete set null,
  id_admin_usuario uuid references public.admin_master_usuarios(id) on delete set null,
  descricao text,
  referencia_externa text,
  criado_em timestamptz not null default timezone('utc', now())
);

create table if not exists public.whatsapp_creditos_recargas (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'expirado', 'cancelado')),
  valor_centavos integer not null check (valor_centavos >= 0),
  billing_type text not null default 'PIX',
  idempotency_key text,
  external_reference text not null unique,
  asaas_customer_id text,
  asaas_payment_id text,
  invoice_url text,
  bank_slip_url text,
  pix_copia_cola text,
  qr_code_base64 text,
  response_json jsonb not null default '{}'::jsonb,
  pago_em timestamptz,
  criado_em timestamptz not null default timezone('utc', now()),
  atualizado_em timestamptz not null default timezone('utc', now())
);

alter table public.whatsapp_envios
  add column if not exists wamid text,
  add column if not exists categoria_meta text,
  add column if not exists tipo_interno text,
  add column if not exists sem_custo boolean not null default false,
  add column if not exists custo_meta_estimado_centavos integer not null default 0,
  add column if not exists preco_venda_centavos integer not null default 0,
  add column if not exists margem_centavos integer not null default 0,
  add column if not exists id_credito_movimentacao uuid references public.whatsapp_creditos_movimentacoes(id) on delete set null,
  add column if not exists idempotency_key text,
  add column if not exists estornado boolean not null default false,
  add column if not exists estornado_em timestamptz,
  add column if not exists entregue_em timestamptz,
  add column if not exists lido_em timestamptz,
  add column if not exists falhou_em timestamptz;

create index if not exists whatsapp_tarifas_ativo_ordem_idx
  on public.whatsapp_tarifas (ativo, ordem);

create index if not exists whatsapp_creditos_movimentacoes_salao_criado_idx
  on public.whatsapp_creditos_movimentacoes (id_salao, criado_em desc);

create index if not exists whatsapp_creditos_movimentacoes_mensagem_idx
  on public.whatsapp_creditos_movimentacoes (id_mensagem)
  where id_mensagem is not null;

create unique index if not exists whatsapp_creditos_movimentacoes_referencia_uidx
  on public.whatsapp_creditos_movimentacoes (id_salao, tipo, referencia_externa)
  where referencia_externa is not null;

create index if not exists whatsapp_creditos_recargas_salao_status_idx
  on public.whatsapp_creditos_recargas (id_salao, status, criado_em desc);

create unique index if not exists whatsapp_creditos_recargas_idempotency_uidx
  on public.whatsapp_creditos_recargas (id_salao, idempotency_key)
  where idempotency_key is not null;

create index if not exists whatsapp_envios_tipo_interno_idx
  on public.whatsapp_envios (id_salao, tipo_interno, criado_em desc)
  where tipo_interno is not null;

create unique index if not exists whatsapp_envios_idempotency_uidx
  on public.whatsapp_envios (id_salao, idempotency_key)
  where id_salao is not null and idempotency_key is not null;

insert into public.whatsapp_tarifas (
  tipo_interno,
  categoria_meta,
  nome,
  descricao,
  custo_base_meta_centavos,
  preco_venda_centavos,
  ativo,
  ordem
)
values
  ('agendamento_confirmacao', 'utility', 'Confirmacao de agendamento', 'Mensagem de confirmacao enviada ao cliente.', 4, 6, true, 10),
  ('lembrete_agendamento', 'utility', 'Lembrete de agendamento', 'Aviso enviado antes do horario marcado.', 4, 6, true, 20),
  ('agendamento_alteracao', 'utility', 'Alteracao de agendamento', 'Aviso quando data, horario ou profissional muda.', 4, 6, true, 30),
  ('agendamento_cancelamento', 'utility', 'Cancelamento', 'Aviso quando um horario e cancelado.', 4, 6, true, 40),
  ('pagamento_confirmacao', 'utility', 'Confirmacao de pagamento', 'Comprovante ou aviso de pagamento confirmado.', 4, 6, true, 50),
  ('codigo_verificacao', 'authentication', 'Codigo de verificacao', 'Codigo de acesso ou verificacao de identidade.', 4, 6, true, 60),
  ('atendimento_cliente', 'utility', 'Atendimento ao cliente', 'Mensagem operacional enviada pela equipe do salao.', 4, 6, true, 70),
  ('marketing', 'marketing', 'Marketing', 'Campanhas, divulgacao e acoes de retorno.', 37, 49, true, 80)
on conflict (tipo_interno) do update set
  categoria_meta = excluded.categoria_meta,
  nome = excluded.nome,
  descricao = excluded.descricao,
  custo_base_meta_centavos = excluded.custo_base_meta_centavos,
  preco_venda_centavos = excluded.preco_venda_centavos,
  ativo = excluded.ativo,
  ordem = excluded.ordem,
  atualizado_em = timezone('utc', now());

create or replace function public.touch_whatsapp_creditos_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_touch_whatsapp_tarifas_atualizado_em
  on public.whatsapp_tarifas;
create trigger trg_touch_whatsapp_tarifas_atualizado_em
before update on public.whatsapp_tarifas
for each row
execute function public.touch_whatsapp_creditos_atualizado_em();

drop trigger if exists trg_touch_whatsapp_creditos_saloes_atualizado_em
  on public.whatsapp_creditos_saloes;
create trigger trg_touch_whatsapp_creditos_saloes_atualizado_em
before update on public.whatsapp_creditos_saloes
for each row
execute function public.touch_whatsapp_creditos_atualizado_em();

drop trigger if exists trg_touch_whatsapp_creditos_recargas_atualizado_em
  on public.whatsapp_creditos_recargas;
create trigger trg_touch_whatsapp_creditos_recargas_atualizado_em
before update on public.whatsapp_creditos_recargas
for each row
execute function public.touch_whatsapp_creditos_atualizado_em();

insert into public.whatsapp_creditos_saloes (
  id_salao,
  saldo_centavos,
  total_recarregado_centavos,
  total_consumido_centavos,
  ultima_recarga_em
)
select
  id_salao,
  greatest(coalesce(sum(creditos_saldo), 0), 0)::bigint * 6,
  greatest(coalesce(sum(creditos_total), 0), 0)::bigint * 6,
  greatest(coalesce(sum(creditos_usados), 0), 0)::bigint * 6,
  max(comprado_em)
from public.whatsapp_pacote_saloes
group by id_salao
on conflict (id_salao) do nothing;

insert into public.whatsapp_creditos_movimentacoes (
  id_salao,
  tipo,
  valor_centavos,
  saldo_antes_centavos,
  saldo_depois_centavos,
  categoria,
  tipo_interno,
  descricao,
  referencia_externa
)
select
  id_salao,
  'ajuste_admin',
  saldo_centavos,
  0,
  saldo_centavos,
  'migracao',
  'saldo_inicial',
  'Saldo inicial migrado dos pacotes antigos de WhatsApp.',
  'migracao:whatsapp_pacote_saloes'
from public.whatsapp_creditos_saloes
where saldo_centavos > 0
on conflict do nothing;

create or replace function public.fn_whatsapp_creditos_registrar_recarga(
  p_id_salao uuid,
  p_valor_centavos bigint,
  p_referencia_externa text,
  p_descricao text default 'Recarga de creditos WhatsApp'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.whatsapp_creditos_saloes%rowtype;
  v_movimentacao_id uuid;
  v_referencia text := nullif(trim(coalesce(p_referencia_externa, '')), '');
begin
  if p_id_salao is null then
    raise exception 'Salao obrigatorio.';
  end if;

  if coalesce(p_valor_centavos, 0) <= 0 then
    raise exception 'Valor de recarga invalido.';
  end if;

  if v_referencia is not null then
    select id
      into v_movimentacao_id
    from public.whatsapp_creditos_movimentacoes
    where id_salao = p_id_salao
      and tipo = 'recarga'
      and referencia_externa = v_referencia
    limit 1;

    if v_movimentacao_id is not null then
      return v_movimentacao_id;
    end if;
  end if;

  insert into public.whatsapp_creditos_saloes (id_salao)
  values (p_id_salao)
  on conflict (id_salao) do nothing;

  select *
    into v_wallet
  from public.whatsapp_creditos_saloes
  where id_salao = p_id_salao
  for update;

  update public.whatsapp_creditos_saloes
  set
    saldo_centavos = v_wallet.saldo_centavos + p_valor_centavos,
    total_recarregado_centavos = v_wallet.total_recarregado_centavos + p_valor_centavos,
    ultima_recarga_em = timezone('utc', now())
  where id = v_wallet.id;

  insert into public.whatsapp_creditos_movimentacoes (
    id_salao,
    tipo,
    valor_centavos,
    saldo_antes_centavos,
    saldo_depois_centavos,
    categoria,
    tipo_interno,
    descricao,
    referencia_externa
  )
  values (
    p_id_salao,
    'recarga',
    p_valor_centavos,
    v_wallet.saldo_centavos,
    v_wallet.saldo_centavos + p_valor_centavos,
    'recarga',
    'recarga_whatsapp',
    coalesce(nullif(trim(p_descricao), ''), 'Recarga de creditos WhatsApp'),
    v_referencia
  )
  returning id into v_movimentacao_id;

  return v_movimentacao_id;
end;
$$;

create or replace function public.fn_whatsapp_creditos_debitar(
  p_id_salao uuid,
  p_tipo_interno text,
  p_idempotency_key text,
  p_id_mensagem uuid default null,
  p_id_agendamento uuid default null,
  p_descricao text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.whatsapp_creditos_saloes%rowtype;
  v_tarifa public.whatsapp_tarifas%rowtype;
  v_movimentacao_id uuid;
  v_referencia text := nullif(trim(coalesce(p_idempotency_key, '')), '');
  v_tipo text := nullif(trim(coalesce(p_tipo_interno, '')), '');
begin
  if p_id_salao is null then
    raise exception 'Salao obrigatorio.';
  end if;

  if v_tipo is null then
    raise exception 'Tipo de mensagem WhatsApp obrigatorio.';
  end if;

  if v_referencia is null then
    raise exception 'Chave de idempotencia obrigatoria.';
  end if;

  select id
    into v_movimentacao_id
  from public.whatsapp_creditos_movimentacoes
  where id_salao = p_id_salao
    and tipo = 'consumo'
    and referencia_externa = v_referencia
  limit 1;

  if v_movimentacao_id is not null then
    return jsonb_build_object(
      'ok', true,
      'duplicado', true,
      'movimentacaoId', v_movimentacao_id
    );
  end if;

  select *
    into v_tarifa
  from public.whatsapp_tarifas
  where tipo_interno = v_tipo
  limit 1;

  if not found then
    raise exception 'Tarifa WhatsApp nao configurada.';
  end if;

  if v_tarifa.ativo is not true then
    raise exception 'Tarifa WhatsApp inativa.';
  end if;

  insert into public.whatsapp_creditos_saloes (id_salao)
  values (p_id_salao)
  on conflict (id_salao) do nothing;

  select *
    into v_wallet
  from public.whatsapp_creditos_saloes
  where id_salao = p_id_salao
  for update;

  if v_tarifa.preco_venda_centavos > 0
     and v_wallet.saldo_centavos < v_tarifa.preco_venda_centavos then
    raise exception 'Saldo WhatsApp insuficiente. Adicione creditos para enviar.';
  end if;

  update public.whatsapp_creditos_saloes
  set
    saldo_centavos = v_wallet.saldo_centavos - v_tarifa.preco_venda_centavos,
    total_consumido_centavos = total_consumido_centavos + v_tarifa.preco_venda_centavos
  where id = v_wallet.id;

  insert into public.whatsapp_creditos_movimentacoes (
    id_salao,
    tipo,
    valor_centavos,
    saldo_antes_centavos,
    saldo_depois_centavos,
    categoria,
    tipo_interno,
    id_mensagem,
    id_agendamento,
    descricao,
    referencia_externa
  )
  values (
    p_id_salao,
    'consumo',
    -v_tarifa.preco_venda_centavos,
    v_wallet.saldo_centavos,
    v_wallet.saldo_centavos - v_tarifa.preco_venda_centavos,
    v_tarifa.categoria_meta,
    v_tarifa.tipo_interno,
    p_id_mensagem,
    p_id_agendamento,
    coalesce(nullif(trim(p_descricao), ''), v_tarifa.nome),
    v_referencia
  )
  returning id into v_movimentacao_id;

  return jsonb_build_object(
    'ok', true,
    'duplicado', false,
    'movimentacaoId', v_movimentacao_id,
    'tipoInterno', v_tarifa.tipo_interno,
    'categoriaMeta', v_tarifa.categoria_meta,
    'custoMetaEstimadoCentavos', v_tarifa.custo_base_meta_centavos,
    'precoVendaCentavos', v_tarifa.preco_venda_centavos,
    'margemCentavos', v_tarifa.margem_centavos,
    'semCusto', v_tarifa.preco_venda_centavos = 0,
    'saldoDepoisCentavos', v_wallet.saldo_centavos - v_tarifa.preco_venda_centavos
  );
end;
$$;

create or replace function public.fn_whatsapp_creditos_estornar(
  p_id_salao uuid,
  p_movimentacao_id uuid,
  p_idempotency_key text,
  p_descricao text default 'Estorno de envio WhatsApp'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.whatsapp_creditos_saloes%rowtype;
  v_origem public.whatsapp_creditos_movimentacoes%rowtype;
  v_movimentacao_id uuid;
  v_referencia text := nullif(trim(coalesce(p_idempotency_key, '')), '');
  v_valor bigint;
begin
  if p_id_salao is null or p_movimentacao_id is null then
    raise exception 'Dados do estorno incompletos.';
  end if;

  if v_referencia is null then
    v_referencia := 'estorno:' || p_movimentacao_id::text;
  end if;

  select id
    into v_movimentacao_id
  from public.whatsapp_creditos_movimentacoes
  where id_salao = p_id_salao
    and tipo = 'estorno'
    and referencia_externa = v_referencia
  limit 1;

  if v_movimentacao_id is not null then
    return jsonb_build_object('ok', true, 'duplicado', true, 'movimentacaoId', v_movimentacao_id);
  end if;

  select *
    into v_origem
  from public.whatsapp_creditos_movimentacoes
  where id = p_movimentacao_id
    and id_salao = p_id_salao
  for update;

  if not found or v_origem.tipo <> 'consumo' or v_origem.valor_centavos >= 0 then
    raise exception 'Movimentacao de consumo invalida para estorno.';
  end if;

  v_valor := abs(v_origem.valor_centavos);

  insert into public.whatsapp_creditos_saloes (id_salao)
  values (p_id_salao)
  on conflict (id_salao) do nothing;

  select *
    into v_wallet
  from public.whatsapp_creditos_saloes
  where id_salao = p_id_salao
  for update;

  update public.whatsapp_creditos_saloes
  set
    saldo_centavos = v_wallet.saldo_centavos + v_valor,
    total_consumido_centavos = greatest(total_consumido_centavos - v_valor, 0)
  where id = v_wallet.id;

  insert into public.whatsapp_creditos_movimentacoes (
    id_salao,
    tipo,
    valor_centavos,
    saldo_antes_centavos,
    saldo_depois_centavos,
    categoria,
    tipo_interno,
    id_mensagem,
    id_agendamento,
    id_movimentacao_origem,
    descricao,
    referencia_externa
  )
  values (
    p_id_salao,
    'estorno',
    v_valor,
    v_wallet.saldo_centavos,
    v_wallet.saldo_centavos + v_valor,
    v_origem.categoria,
    v_origem.tipo_interno,
    v_origem.id_mensagem,
    v_origem.id_agendamento,
    v_origem.id,
    coalesce(nullif(trim(p_descricao), ''), 'Estorno de envio WhatsApp'),
    v_referencia
  )
  returning id into v_movimentacao_id;

  return jsonb_build_object(
    'ok', true,
    'duplicado', false,
    'movimentacaoId', v_movimentacao_id,
    'valorCentavos', v_valor,
    'saldoDepoisCentavos', v_wallet.saldo_centavos + v_valor
  );
end;
$$;

create or replace function public.fn_whatsapp_creditos_ajuste_admin(
  p_id_salao uuid,
  p_valor_centavos bigint,
  p_motivo text,
  p_id_admin_usuario uuid,
  p_referencia_externa text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.whatsapp_creditos_saloes%rowtype;
  v_movimentacao_id uuid;
  v_referencia text := nullif(trim(coalesce(p_referencia_externa, '')), '');
  v_motivo text := nullif(trim(coalesce(p_motivo, '')), '');
begin
  if p_id_salao is null or p_id_admin_usuario is null then
    raise exception 'Salao e admin sao obrigatorios.';
  end if;

  if coalesce(p_valor_centavos, 0) = 0 then
    raise exception 'Valor de ajuste invalido.';
  end if;

  if v_motivo is null then
    raise exception 'Motivo do ajuste obrigatorio.';
  end if;

  insert into public.whatsapp_creditos_saloes (id_salao)
  values (p_id_salao)
  on conflict (id_salao) do nothing;

  select *
    into v_wallet
  from public.whatsapp_creditos_saloes
  where id_salao = p_id_salao
  for update;

  if v_wallet.saldo_centavos + p_valor_centavos < 0 then
    raise exception 'Ajuste deixaria saldo WhatsApp negativo.';
  end if;

  update public.whatsapp_creditos_saloes
  set saldo_centavos = v_wallet.saldo_centavos + p_valor_centavos
  where id = v_wallet.id;

  insert into public.whatsapp_creditos_movimentacoes (
    id_salao,
    tipo,
    valor_centavos,
    saldo_antes_centavos,
    saldo_depois_centavos,
    categoria,
    tipo_interno,
    id_admin_usuario,
    descricao,
    referencia_externa
  )
  values (
    p_id_salao,
    'ajuste_admin',
    p_valor_centavos,
    v_wallet.saldo_centavos,
    v_wallet.saldo_centavos + p_valor_centavos,
    'ajuste_admin',
    'ajuste_admin',
    p_id_admin_usuario,
    v_motivo,
    v_referencia
  )
  returning id into v_movimentacao_id;

  return v_movimentacao_id;
end;
$$;

create or replace function public.fn_whatsapp_creditos_resumo(p_id_salao uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.whatsapp_creditos_saloes%rowtype;
  v_inicio_mes timestamptz := date_trunc('month', timezone('utc', now()));
  v_inicio_7d timestamptz := timezone('utc', now()) - interval '7 days';
  v_gasto_7d bigint := 0;
  v_gasto_mes bigint := 0;
  v_mensagens_mes bigint := 0;
  v_mensagens_pagas_mes bigint := 0;
  v_mensagens_sem_custo_mes bigint := 0;
begin
  if p_id_salao is null then
    raise exception 'Salao obrigatorio.';
  end if;

  insert into public.whatsapp_creditos_saloes (id_salao)
  values (p_id_salao)
  on conflict (id_salao) do nothing;

  select *
    into v_wallet
  from public.whatsapp_creditos_saloes
  where id_salao = p_id_salao;

  select
    coalesce(sum(preco_venda_centavos) filter (
      where criado_em >= v_inicio_7d
        and lower(coalesce(status, '')) not in ('erro', 'falhou', 'cancelado')
    ), 0),
    coalesce(sum(preco_venda_centavos) filter (
      where criado_em >= v_inicio_mes
        and lower(coalesce(status, '')) not in ('erro', 'falhou', 'cancelado')
    ), 0),
    coalesce(count(*) filter (where criado_em >= v_inicio_mes), 0),
    coalesce(count(*) filter (
      where criado_em >= v_inicio_mes
        and preco_venda_centavos > 0
        and lower(coalesce(status, '')) not in ('erro', 'falhou', 'cancelado')
    ), 0),
    coalesce(count(*) filter (
      where criado_em >= v_inicio_mes
        and preco_venda_centavos = 0
        and lower(coalesce(status, '')) not in ('erro', 'falhou', 'cancelado')
    ), 0)
  into
    v_gasto_7d,
    v_gasto_mes,
    v_mensagens_mes,
    v_mensagens_pagas_mes,
    v_mensagens_sem_custo_mes
  from public.whatsapp_envios
  where id_salao = p_id_salao;

  return jsonb_build_object(
    'saldoCentavos', v_wallet.saldo_centavos,
    'totalRecarregadoCentavos', v_wallet.total_recarregado_centavos,
    'totalConsumidoCentavos', v_wallet.total_consumido_centavos,
    'alertaSaldoBaixoCentavos', v_wallet.alerta_saldo_baixo_centavos,
    'ultimaRecargaEm', v_wallet.ultima_recarga_em,
    'gasto7dCentavos', v_gasto_7d,
    'gastoMesCentavos', v_gasto_mes,
    'mensagensMes', v_mensagens_mes,
    'mensagensPagasMes', v_mensagens_pagas_mes,
    'mensagensSemCustoMes', v_mensagens_sem_custo_mes
  );
end;
$$;

alter table public.whatsapp_tarifas enable row level security;
alter table public.whatsapp_creditos_saloes enable row level security;
alter table public.whatsapp_creditos_movimentacoes enable row level security;
alter table public.whatsapp_creditos_recargas enable row level security;

revoke all on table public.whatsapp_tarifas from anon, authenticated;
revoke all on table public.whatsapp_creditos_saloes from anon, authenticated;
revoke all on table public.whatsapp_creditos_movimentacoes from anon, authenticated;
revoke all on table public.whatsapp_creditos_recargas from anon, authenticated;

grant all on table public.whatsapp_tarifas to service_role;
grant all on table public.whatsapp_creditos_saloes to service_role;
grant all on table public.whatsapp_creditos_movimentacoes to service_role;
grant all on table public.whatsapp_creditos_recargas to service_role;

revoke all on function public.touch_whatsapp_creditos_atualizado_em() from public, anon, authenticated;
revoke all on function public.fn_whatsapp_creditos_registrar_recarga(uuid, bigint, text, text) from public, anon, authenticated;
revoke all on function public.fn_whatsapp_creditos_debitar(uuid, text, text, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.fn_whatsapp_creditos_estornar(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.fn_whatsapp_creditos_ajuste_admin(uuid, bigint, text, uuid, text) from public, anon, authenticated;
revoke all on function public.fn_whatsapp_creditos_resumo(uuid) from public, anon, authenticated;

grant execute on function public.fn_whatsapp_creditos_registrar_recarga(uuid, bigint, text, text) to service_role;
grant execute on function public.fn_whatsapp_creditos_debitar(uuid, text, text, uuid, uuid, text) to service_role;
grant execute on function public.fn_whatsapp_creditos_estornar(uuid, uuid, text, text) to service_role;
grant execute on function public.fn_whatsapp_creditos_ajuste_admin(uuid, bigint, text, uuid, text) to service_role;
grant execute on function public.fn_whatsapp_creditos_resumo(uuid) to service_role;
