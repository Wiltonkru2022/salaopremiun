-- Mantém o token de cartão do Asaas exclusivamente no backend/service_role.
-- O navegador continua podendo ler/alterar os demais campos permitidos pela RLS,
-- mas não consegue consultar, inserir ou atualizar asaas_credit_card_token.

do $$
declare
  v_columns text;
begin
  revoke all privileges on table public.assinaturas from anon;

  revoke select, insert, update on table public.assinaturas from authenticated;

  select string_agg(format('%I', column_name), ', ' order by ordinal_position)
    into v_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'assinaturas'
    and column_name <> 'asaas_credit_card_token';

  if v_columns is null then
    raise exception 'Nao foi possivel obter as colunas seguras de public.assinaturas';
  end if;

  execute format(
    'grant select (%s) on table public.assinaturas to authenticated',
    v_columns
  );
  execute format(
    'grant insert (%s) on table public.assinaturas to authenticated',
    v_columns
  );
  execute format(
    'grant update (%s) on table public.assinaturas to authenticated',
    v_columns
  );
end
$$;

comment on column public.assinaturas.asaas_credit_card_token is
  'SEGREDO SERVER-ONLY: token de cartao retornado pelo Asaas. Nunca expor a anon/authenticated ou ao frontend.';
