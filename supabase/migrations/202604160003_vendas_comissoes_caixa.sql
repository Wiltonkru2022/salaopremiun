create extension if not exists pgcrypto;

create table if not exists public.comissoes_lancamentos (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null,
  id_comanda uuid,
  id_comanda_item uuid,
  id_profissional uuid,
  id_assistente uuid,
  tipo_destinatario text default 'profissional',
  tipo_profissional text default 'profissional',
  descricao text,
  percentual numeric(12, 4) default 0,
  percentual_aplicado numeric(12, 4) default 0,
  valor_base numeric(12, 2) default 0,
  valor_comissao numeric(12, 2) default 0,
  valor_comissao_assistente numeric(12, 2) default 0,
  status text default 'pendente',
  competencia_data date default current_date,
  pago_em timestamptz,
  observacoes text,
  origem_percentual text,
  criado_em timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.comissoes_lancamentos
  add column if not exists id_salao uuid,
  add column if not exists id_comanda uuid,
  add column if not exists id_comanda_item uuid,
  add column if not exists id_profissional uuid,
  add column if not exists id_assistente uuid,
  add column if not exists tipo_destinatario text default 'profissional',
  add column if not exists tipo_profissional text default 'profissional',
  add column if not exists descricao text,
  add column if not exists percentual numeric(12, 4) default 0,
  add column if not exists percentual_aplicado numeric(12, 4) default 0,
  add column if not exists valor_base numeric(12, 2) default 0,
  add column if not exists valor_comissao numeric(12, 2) default 0,
  add column if not exists valor_comissao_assistente numeric(12, 2) default 0,
  add column if not exists status text default 'pendente',
  add column if not exists competencia_data date default current_date,
  add column if not exists pago_em timestamptz,
  add column if not exists observacoes text,
  add column if not exists origem_percentual text,
  add column if not exists criado_em timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create index if not exists comissoes_lancamentos_salao_data_idx
  on public.comissoes_lancamentos (id_salao, competencia_data desc);

create index if not exists comissoes_lancamentos_comanda_idx
  on public.comissoes_lancamentos (id_comanda);

create index if not exists comissoes_lancamentos_profissional_status_idx
  on public.comissoes_lancamentos (id_profissional, status, competencia_data desc);

drop function if exists public.fn_gerar_comissoes_comanda(uuid) cascade;

create or replace function public.fn_gerar_comissoes_comanda(p_id_comanda uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comanda record;
  v_item record;
  v_base numeric(12, 2);
  v_percentual numeric(12, 4);
  v_percentual_assistente numeric(12, 4);
  v_valor numeric(12, 2);
  v_valor_assistente numeric(12, 2);
  v_competencia date;
  v_origem text;
begin
  select *
    into v_comanda
  from public.comandas
  where id = p_id_comanda;

  if not found then
    raise exception 'Comanda nao encontrada.'
      using errcode = 'P0001';
  end if;

  if lower(coalesce(v_comanda.status, '')) <> 'fechada' then
    return;
  end if;

  v_competencia := coalesce(v_comanda.fechada_em::date, current_date);

  delete from public.comissoes_lancamentos
  where id_comanda = p_id_comanda
    and lower(coalesce(status, 'pendente')) = 'pendente';

  for v_item in
    select *
    from public.comanda_itens
    where id_comanda = p_id_comanda
      and coalesce(ativo, true) = true
  loop
    if lower(coalesce(v_item.base_calculo_aplicada, 'bruto')) like 'liquido%' then
      v_base := greatest(
        round(coalesce(v_item.valor_total, 0)::numeric - coalesce(v_item.custo_total, 0)::numeric, 2),
        0
      );
    else
      v_base := round(coalesce(v_item.valor_total, 0)::numeric, 2);
    end if;

    v_percentual := coalesce(v_item.comissao_percentual_aplicada, 0)::numeric;
    v_percentual_assistente :=
      coalesce(v_item.comissao_assistente_percentual_aplicada, 0)::numeric;
    v_valor := round((v_base * v_percentual) / 100, 2);
    v_valor_assistente := round((v_base * v_percentual_assistente) / 100, 2);
    v_origem := case
      when v_percentual <= 0 then 'sem_regra'
      when v_item.id_servico is null then 'manual'
      else 'servico_padrao'
    end;

    update public.comanda_itens
    set
      comissao_valor_aplicado = v_valor,
      comissao_assistente_valor_aplicado = v_valor_assistente,
      updated_at = now()
    where id = v_item.id;

    if v_item.id_profissional is not null
      and (
        lower(coalesce(v_item.tipo_item, '')) = 'servico'
        or v_percentual > 0
      )
    then
      insert into public.comissoes_lancamentos (
        id,
        id_salao,
        id_comanda,
        id_comanda_item,
        id_profissional,
        id_assistente,
        tipo_destinatario,
        tipo_profissional,
        descricao,
        percentual,
        percentual_aplicado,
        valor_base,
        valor_comissao,
        valor_comissao_assistente,
        status,
        competencia_data,
        observacoes,
        origem_percentual,
        criado_em,
        updated_at
      )
      values (
        gen_random_uuid(),
        v_comanda.id_salao,
        p_id_comanda,
        v_item.id,
        v_item.id_profissional,
        null,
        'profissional',
        'profissional',
        coalesce(v_item.descricao, 'Servico'),
        v_percentual,
        v_percentual,
        v_base,
        v_valor,
        0,
        'pendente',
        v_competencia,
        case when v_percentual <= 0 then 'Lancamento sem percentual configurado.' else null end,
        v_origem,
        now(),
        now()
      );
    end if;

    if v_item.id_assistente is not null
      and (
        lower(coalesce(v_item.tipo_item, '')) = 'servico'
        or v_percentual_assistente > 0
      )
    then
      insert into public.comissoes_lancamentos (
        id,
        id_salao,
        id_comanda,
        id_comanda_item,
        id_profissional,
        id_assistente,
        tipo_destinatario,
        tipo_profissional,
        descricao,
        percentual,
        percentual_aplicado,
        valor_base,
        valor_comissao,
        valor_comissao_assistente,
        status,
        competencia_data,
        observacoes,
        origem_percentual,
        criado_em,
        updated_at
      )
      values (
        gen_random_uuid(),
        v_comanda.id_salao,
        p_id_comanda,
        v_item.id,
        v_item.id_assistente,
        v_item.id_assistente,
        'assistente',
        'assistente',
        coalesce(v_item.descricao, 'Servico') || ' - assistente',
        v_percentual_assistente,
        v_percentual_assistente,
        v_base,
        v_valor_assistente,
        v_valor_assistente,
        'pendente',
        v_competencia,
        case
          when v_percentual_assistente <= 0
            then 'Lancamento de assistente sem percentual configurado.'
          else null
        end,
        'assistente',
        now(),
        now()
      );
    end if;
  end loop;
end;
$$;

create or replace function public.fn_sync_comissoes_status_comanda()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(new.status, '')) = 'fechada'
    and lower(coalesce(old.status, '')) <> 'fechada'
  then
    perform public.fn_gerar_comissoes_comanda(new.id);
  elsif lower(coalesce(new.status, '')) in ('aberta', 'em_atendimento', 'aguardando_pagamento')
    and lower(coalesce(old.status, '')) = 'fechada'
  then
    delete from public.comissoes_lancamentos
    where id_comanda = new.id
      and lower(coalesce(status, 'pendente')) = 'pendente';
  elsif lower(coalesce(new.status, '')) = 'cancelada' then
    update public.comissoes_lancamentos
    set
      status = 'cancelado',
      updated_at = now()
    where id_comanda = new.id
      and lower(coalesce(status, 'pendente')) = 'pendente';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_comissoes_status_comanda on public.comandas;
create trigger trg_sync_comissoes_status_comanda
after update of status on public.comandas
for each row
execute function public.fn_sync_comissoes_status_comanda();

drop function if exists public.fn_fechar_comanda(uuid);

create function public.fn_fechar_comanda(p_id_comanda uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comanda record;
  v_total_pago numeric(12, 2);
begin
  select *
    into v_comanda
  from public.comandas
  where id = p_id_comanda
  for update;

  if not found then
    raise exception 'Comanda nao encontrada.'
      using errcode = 'P0001';
  end if;

  if lower(coalesce(v_comanda.status, '')) not in (
    'aberta',
    'em_atendimento',
    'aguardando_pagamento'
  ) then
    raise exception 'A comanda nao pode ser fechada no status atual.'
      using errcode = 'P0001';
  end if;

  select coalesce(round(sum(valor)::numeric, 2), 0)
    into v_total_pago
  from public.comanda_pagamentos
  where id_comanda = p_id_comanda;

  if v_total_pago + 0.009 < round(coalesce(v_comanda.total, 0)::numeric, 2) then
    raise exception 'A comanda ainda possui valor em aberto.'
      using errcode = 'P0001';
  end if;

  update public.comandas
  set
    status = 'fechada',
    fechada_em = coalesce(fechada_em, now()),
    updated_at = now()
  where id = p_id_comanda;

  update public.agendamentos
  set
    status = 'atendido',
    updated_at = now()
  where id_comanda = p_id_comanda
    and lower(coalesce(status, '')) not in ('cancelado', 'cancelada', 'faltou');
end;
$$;

drop view if exists public.vw_vendas_busca;

create view public.vw_vendas_busca as
select
  c.id,
  c.id_salao,
  c.numero,
  c.status,
  c.id_cliente,
  c.subtotal,
  c.desconto,
  c.acrescimo,
  c.total,
  c.aberta_em,
  c.fechada_em,
  c.cancelada_em,
  cl.nome as cliente_nome,
  coalesce(
    string_agg(distinct p.nome, ' | ') filter (where p.nome is not null),
    ''
  ) as profissionais_nomes,
  coalesce(
    string_agg(distinct ci.descricao, ' | ') filter (where ci.descricao is not null),
    ''
  ) as itens_descricoes,
  coalesce(
    string_agg(distinct cp.forma_pagamento, ' | ') filter (where cp.forma_pagamento is not null),
    ''
  ) as formas_pagamento
from public.comandas c
left join public.clientes cl on cl.id = c.id_cliente
left join public.comanda_itens ci
  on ci.id_comanda = c.id
  and coalesce(ci.ativo, true) = true
left join public.profissionais p
  on p.id in (ci.id_profissional, ci.id_assistente)
left join public.comanda_pagamentos cp on cp.id_comanda = c.id
where lower(coalesce(c.status, '')) in ('fechada', 'cancelada')
group by
  c.id,
  c.id_salao,
  c.numero,
  c.status,
  c.id_cliente,
  c.subtotal,
  c.desconto,
  c.acrescimo,
  c.total,
  c.aberta_em,
  c.fechada_em,
  c.cancelada_em,
  cl.nome;

drop view if exists public.vendas;

create view public.vendas as
select
  c.id,
  c.id_salao,
  c.numero,
  c.status,
  c.id_cliente,
  cl.nome as cliente_nome,
  c.subtotal,
  c.desconto,
  c.acrescimo,
  c.total,
  c.aberta_em,
  c.fechada_em,
  c.cancelada_em,
  c.created_at,
  c.updated_at
from public.comandas c
left join public.clientes cl on cl.id = c.id_cliente
where lower(coalesce(c.status, '')) in ('fechada', 'cancelada');

grant select on public.vw_vendas_busca to anon, authenticated, service_role;
grant select on public.vendas to anon, authenticated, service_role;
grant execute on function public.fn_gerar_comissoes_comanda(uuid) to authenticated, service_role;
grant execute on function public.fn_fechar_comanda(uuid) to authenticated, service_role;

select public.fn_gerar_comissoes_comanda(c.id)
from public.comandas c
where lower(coalesce(c.status, '')) = 'fechada';
