alter table public.comanda_itens
  add column if not exists idempotency_key text;

create unique index if not exists comanda_itens_idempotency_key_idx
  on public.comanda_itens (id_salao, idempotency_key)
  where idempotency_key is not null;

drop function if exists public.fn_adicionar_item_comanda_idempotente(
  uuid,
  uuid,
  text,
  uuid,
  uuid,
  uuid,
  text,
  numeric,
  numeric,
  numeric,
  uuid,
  uuid,
  numeric,
  numeric,
  text,
  boolean,
  text,
  text,
  numeric,
  numeric,
  text
);

create or replace function public.fn_adicionar_item_comanda_idempotente(
  p_id_salao uuid,
  p_id_comanda uuid,
  p_tipo_item text,
  p_id_agendamento uuid,
  p_id_servico uuid,
  p_id_produto uuid,
  p_descricao text,
  p_quantidade numeric,
  p_valor_unitario numeric,
  p_custo_total numeric,
  p_id_profissional uuid,
  p_id_assistente uuid,
  p_comissao_percentual numeric,
  p_comissao_assistente_percentual numeric,
  p_base_calculo text,
  p_desconta_taxa_maquininha boolean,
  p_origem text,
  p_observacoes text,
  p_desconto numeric default null,
  p_acrescimo numeric default null,
  p_idempotency_key text default null
)
returns table (
  id_item uuid,
  ja_existia boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_idempotency_key text;
  v_item_id uuid;
begin
  v_idempotency_key := nullif(left(trim(coalesce(p_idempotency_key, '')), 160), '');

  if v_idempotency_key is null then
    v_item_id := public.fn_adicionar_item_comanda(
      p_id_salao,
      p_id_comanda,
      p_tipo_item,
      p_id_agendamento,
      p_id_servico,
      p_id_produto,
      p_descricao,
      p_quantidade,
      p_valor_unitario,
      p_custo_total,
      p_id_profissional,
      p_id_assistente,
      p_comissao_percentual,
      p_comissao_assistente_percentual,
      p_base_calculo,
      p_desconta_taxa_maquininha,
      p_origem,
      p_observacoes,
      p_desconto,
      p_acrescimo
    );

    return query select v_item_id, false;
    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('comanda_item_idem:' || p_id_salao::text || ':' || v_idempotency_key, 0)
  );

  select ci.id
    into v_item_id
  from public.comanda_itens ci
  where ci.id_salao = p_id_salao
    and ci.idempotency_key = v_idempotency_key
  limit 1;

  if v_item_id is not null then
    return query select v_item_id, true;
    return;
  end if;

  v_item_id := public.fn_adicionar_item_comanda(
    p_id_salao,
    p_id_comanda,
    p_tipo_item,
    p_id_agendamento,
    p_id_servico,
    p_id_produto,
    p_descricao,
    p_quantidade,
    p_valor_unitario,
    p_custo_total,
    p_id_profissional,
    p_id_assistente,
    p_comissao_percentual,
    p_comissao_assistente_percentual,
    p_base_calculo,
    p_desconta_taxa_maquininha,
    p_origem,
    p_observacoes,
    p_desconto,
    p_acrescimo
  );

  update public.comanda_itens
  set idempotency_key = v_idempotency_key,
      updated_at = now()
  where id = v_item_id
    and id_salao = p_id_salao;

  return query select v_item_id, false;
end;
$$;

revoke all on function public.fn_adicionar_item_comanda_idempotente(
  uuid,
  uuid,
  text,
  uuid,
  uuid,
  uuid,
  text,
  numeric,
  numeric,
  numeric,
  uuid,
  uuid,
  numeric,
  numeric,
  text,
  boolean,
  text,
  text,
  numeric,
  numeric,
  text
) from public, anon, authenticated;

grant execute on function public.fn_adicionar_item_comanda_idempotente(
  uuid,
  uuid,
  text,
  uuid,
  uuid,
  uuid,
  text,
  numeric,
  numeric,
  numeric,
  uuid,
  uuid,
  numeric,
  numeric,
  text,
  boolean,
  text,
  text,
  numeric,
  numeric,
  text
) to service_role;
