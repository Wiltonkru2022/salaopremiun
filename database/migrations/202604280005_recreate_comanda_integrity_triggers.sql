create or replace function public.comanda_status_bloqueado(p_id_comanda uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.comandas c
    where c.id = p_id_comanda
      and lower(coalesce(c.status, '')) in ('fechada', 'cancelada')
  );
$$;

create or replace function public.impedir_edicao_comanda_bloqueada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id_comanda uuid;
  v_allowed_comanda_keys text[] := array[
    'status',
    'updated_at',
    'fechada_em',
    'cancelada_em',
    'reaberta_em',
    'reopened_at',
    'reopened_by',
    'deleted_at',
    'deleted_by',
    'motivo_cancelamento',
    'motivo_reabertura',
    'motivo_exclusao'
  ];
  v_allowed_item_keys text[] := array[
    'id_servico',
    'custo_total',
    'comissao_percentual_aplicada',
    'comissao_valor_aplicado',
    'comissao_assistente_percentual_aplicada',
    'comissao_assistente_valor_aplicado',
    'base_calculo_aplicada',
    'desconta_taxa_maquininha_aplicada',
    'updated_at'
  ];
begin
  if TG_TABLE_NAME = 'comandas' then
    if TG_OP = 'UPDATE'
      and lower(coalesce(old.status, '')) in ('fechada', 'cancelada')
      and (to_jsonb(new) - v_allowed_comanda_keys) <>
          (to_jsonb(old) - v_allowed_comanda_keys)
    then
      raise exception 'Comanda fechada ou cancelada nao pode ter dados financeiros alterados.'
        using errcode = '23514';
    end if;

    return new;
  end if;

  if TG_OP = 'INSERT' then
    v_id_comanda := new.id_comanda;
  elsif TG_OP = 'UPDATE' then
    v_id_comanda := coalesce(new.id_comanda, old.id_comanda);
  else
    v_id_comanda := old.id_comanda;
  end if;

  if public.comanda_status_bloqueado(v_id_comanda) then
    if TG_TABLE_NAME = 'comanda_itens'
      and TG_OP = 'UPDATE'
      and (to_jsonb(new) - v_allowed_item_keys) =
          (to_jsonb(old) - v_allowed_item_keys)
    then
      return new;
    end if;

    raise exception 'Comanda fechada ou cancelada nao permite alterar %.', TG_TABLE_NAME
      using errcode = '23514';
  end if;

  if TG_OP = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_impedir_update_comanda_bloqueada on public.comandas;
create trigger trg_impedir_update_comanda_bloqueada
before update on public.comandas
for each row
execute function public.impedir_edicao_comanda_bloqueada();

drop trigger if exists trg_impedir_itens_comanda_bloqueada on public.comanda_itens;
create trigger trg_impedir_itens_comanda_bloqueada
before insert or update on public.comanda_itens
for each row
execute function public.impedir_edicao_comanda_bloqueada();

drop trigger if exists trg_impedir_pagamentos_comanda_bloqueada on public.comanda_pagamentos;
create trigger trg_impedir_pagamentos_comanda_bloqueada
before insert or update on public.comanda_pagamentos
for each row
execute function public.impedir_edicao_comanda_bloqueada();
