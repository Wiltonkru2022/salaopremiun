alter table public.caixa_sessoes
  add column if not exists valor_previsto_fechamento numeric(12, 2),
  add column if not exists valor_diferenca_fechamento numeric(12, 2),
  add column if not exists tipo_fechamento text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'caixa_sessoes_tipo_fechamento_check'
  ) then
    alter table public.caixa_sessoes
      add constraint caixa_sessoes_tipo_fechamento_check
      check (
        tipo_fechamento is null
        or tipo_fechamento in ('confere', 'sobra', 'quebra')
      );
  end if;
end;
$$;

with totais as (
  select
    s.id,
    round(
      coalesce(s.valor_abertura, 0)
      + coalesce(
          sum(
            case
              when m.tipo in ('suprimento', 'venda') then m.valor
              when m.tipo in ('sangria', 'vale_profissional') then -m.valor
              else 0
            end
          ),
          0
        ),
      2
    ) as valor_previsto
  from public.caixa_sessoes s
  left join public.caixa_movimentacoes m
    on m.id_sessao = s.id
   and m.id_salao = s.id_salao
  group by s.id, s.valor_abertura
)
update public.caixa_sessoes s
set
  valor_previsto_fechamento = t.valor_previsto,
  valor_diferenca_fechamento = case
    when s.valor_fechamento_informado is null then null
    else round(coalesce(s.valor_fechamento_informado, 0) - t.valor_previsto, 2)
  end,
  tipo_fechamento = case
    when s.valor_fechamento_informado is null then null
    when abs(round(coalesce(s.valor_fechamento_informado, 0) - t.valor_previsto, 2)) < 0.009
      then 'confere'
    when round(coalesce(s.valor_fechamento_informado, 0) - t.valor_previsto, 2) > 0
      then 'sobra'
    else 'quebra'
  end
from totais t
where s.id = t.id;

create or replace function public.fn_caixa_fechar_sessao(
  p_id_salao uuid,
  p_id_sessao uuid,
  p_id_usuario uuid,
  p_valor_fechamento numeric,
  p_observacoes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sessao_id uuid;
  v_valor_abertura numeric(12, 2);
  v_valor_previsto numeric(12, 2);
  v_valor_fechamento numeric(12, 2);
  v_valor_diferenca numeric(12, 2);
  v_tipo_fechamento text;
begin
  if p_id_salao is null or p_id_sessao is null then
    raise exception 'Salao e sessao obrigatorios para fechar o caixa.'
      using errcode = 'P0001';
  end if;

  if coalesce(p_valor_fechamento, 0) < 0 then
    raise exception 'Valor de fechamento invalido.'
      using errcode = 'P0001';
  end if;

  select s.id, round(coalesce(s.valor_abertura, 0), 2)
    into v_sessao_id, v_valor_abertura
  from public.caixa_sessoes s
  where s.id = p_id_sessao
    and s.id_salao = p_id_salao
    and s.status = 'aberto'
  for update;

  if v_sessao_id is null then
    raise exception 'Sessao de caixa aberta nao encontrada para fechamento.'
      using errcode = 'P0001';
  end if;

  select round(
    coalesce(v_valor_abertura, 0)
    + coalesce(
        sum(
          case
            when m.tipo in ('suprimento', 'venda') then m.valor
            when m.tipo in ('sangria', 'vale_profissional') then -m.valor
            else 0
          end
        ),
        0
      ),
    2
  )
    into v_valor_previsto
  from public.caixa_movimentacoes m
  where m.id_salao = p_id_salao
    and m.id_sessao = p_id_sessao;

  v_valor_fechamento := round(coalesce(p_valor_fechamento, 0)::numeric, 2);
  v_valor_diferenca := round(v_valor_fechamento - coalesce(v_valor_previsto, 0), 2);
  v_tipo_fechamento := case
    when abs(v_valor_diferenca) < 0.009 then 'confere'
    when v_valor_diferenca > 0 then 'sobra'
    else 'quebra'
  end;

  update public.caixa_sessoes
  set
    id_usuario_fechamento = p_id_usuario,
    valor_fechamento_informado = v_valor_fechamento,
    valor_previsto_fechamento = coalesce(v_valor_previsto, 0),
    valor_diferenca_fechamento = v_valor_diferenca,
    tipo_fechamento = v_tipo_fechamento,
    observacoes = nullif(trim(coalesce(p_observacoes, '')), ''),
    status = 'fechado',
    fechado_em = coalesce(fechado_em, now()),
    updated_at = now()
  where id = p_id_sessao
    and id_salao = p_id_salao
    and status = 'aberto';

  return v_sessao_id;
end;
$$;
