create or replace function public.fn_ui_digits_only(p_value text)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog, public
as $$
  select case
    when p_value is null then null
    else regexp_replace(p_value, '[^0-9]', '', 'g')
  end;
$$;

create or replace function public.fn_normalize_masked_identity_fields()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  payload jsonb := to_jsonb(new);
  field_name text;
  raw_value text;
  normalized_value text;
begin
  foreach field_name in array array[
    'cpf',
    'cpf_cnpj',
    'telefone',
    'whatsapp',
    'cep',
    'sinal_whatsapp',
    'fornecedor_telefone',
    'fornecedor_whatsapp'
  ]
  loop
    if payload ? field_name then
      raw_value := payload ->> field_name;
      if raw_value is not null then
        normalized_value := public.fn_ui_digits_only(raw_value);
        payload := jsonb_set(
          payload,
          array[field_name],
          to_jsonb(normalized_value),
          true
        );
      end if;
    end if;
  end loop;

  if payload ? 'data_nascimento' then
    raw_value := payload ->> 'data_nascimento';
    if raw_value ~ '^\d{2}/\d{2}/\d{4}$' then
      normalized_value :=
        substring(raw_value from 7 for 4) || '-' ||
        substring(raw_value from 4 for 2) || '-' ||
        substring(raw_value from 1 for 2);
      payload := jsonb_set(
        payload,
        array['data_nascimento'],
        to_jsonb(normalized_value),
        true
      );
    end if;
  end if;

  new := jsonb_populate_record(new, payload);
  return new;
end;
$$;

revoke all on function public.fn_ui_digits_only(text) from public, anon, authenticated;
revoke all on function public.fn_normalize_masked_identity_fields() from public, anon, authenticated;

drop trigger if exists trg_normalize_masked_fields_clientes on public.clientes;
create trigger trg_normalize_masked_fields_clientes
before insert or update on public.clientes
for each row execute function public.fn_normalize_masked_identity_fields();

drop trigger if exists trg_normalize_masked_fields_clientes_app_auth on public.clientes_app_auth;
create trigger trg_normalize_masked_fields_clientes_app_auth
before insert or update on public.clientes_app_auth
for each row execute function public.fn_normalize_masked_identity_fields();

drop trigger if exists trg_normalize_masked_fields_profissionais on public.profissionais;
create trigger trg_normalize_masked_fields_profissionais
before insert or update on public.profissionais
for each row execute function public.fn_normalize_masked_identity_fields();

drop trigger if exists trg_normalize_masked_fields_profissionais_acessos on public.profissionais_acessos;
create trigger trg_normalize_masked_fields_profissionais_acessos
before insert or update on public.profissionais_acessos
for each row execute function public.fn_normalize_masked_identity_fields();

drop trigger if exists trg_normalize_masked_fields_saloes on public.saloes;
create trigger trg_normalize_masked_fields_saloes
before insert or update on public.saloes
for each row execute function public.fn_normalize_masked_identity_fields();

drop trigger if exists trg_normalize_masked_fields_reativar_salao on public.reativar_salao;
create trigger trg_normalize_masked_fields_reativar_salao
before insert or update on public.reativar_salao
for each row execute function public.fn_normalize_masked_identity_fields();

drop trigger if exists trg_normalize_masked_fields_produtos on public.produtos;
create trigger trg_normalize_masked_fields_produtos
before insert or update on public.produtos
for each row execute function public.fn_normalize_masked_identity_fields();

drop trigger if exists trg_normalize_masked_fields_configuracoes_salao on public.configuracoes_salao;
create trigger trg_normalize_masked_fields_configuracoes_salao
before insert or update on public.configuracoes_salao
for each row execute function public.fn_normalize_masked_identity_fields();

drop trigger if exists trg_normalize_masked_fields_agendamentos on public.agendamentos;
create trigger trg_normalize_masked_fields_agendamentos
before insert or update on public.agendamentos
for each row execute function public.fn_normalize_masked_identity_fields();
