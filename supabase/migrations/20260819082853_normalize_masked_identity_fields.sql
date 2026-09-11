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
begin
  case tg_table_name
    when 'clientes' then
      new.cpf := public.fn_ui_digits_only(new.cpf);
      new.telefone := public.fn_ui_digits_only(new.telefone);
      new.whatsapp := public.fn_ui_digits_only(new.whatsapp);
      new.cep := public.fn_ui_digits_only(new.cep);
      if new.data_nascimento ~ '^\d{2}/\d{2}/\d{4}$' then
        new.data_nascimento :=
          substring(new.data_nascimento from 7 for 4) || '-' ||
          substring(new.data_nascimento from 4 for 2) || '-' ||
          substring(new.data_nascimento from 1 for 2);
      end if;

    when 'clientes_app_auth' then
      new.cpf := public.fn_ui_digits_only(new.cpf);
      new.telefone := public.fn_ui_digits_only(new.telefone);
      new.whatsapp := public.fn_ui_digits_only(new.whatsapp);

    when 'profissionais' then
      new.cpf := public.fn_ui_digits_only(new.cpf);
      new.telefone := public.fn_ui_digits_only(new.telefone);
      new.whatsapp := public.fn_ui_digits_only(new.whatsapp);
      new.cep := public.fn_ui_digits_only(new.cep);
      new.sinal_whatsapp := public.fn_ui_digits_only(new.sinal_whatsapp);

    when 'profissionais_acessos' then
      new.cpf := public.fn_ui_digits_only(new.cpf);

    when 'saloes' then
      new.cpf_cnpj := public.fn_ui_digits_only(new.cpf_cnpj);
      new.telefone := public.fn_ui_digits_only(new.telefone);
      new.whatsapp := public.fn_ui_digits_only(new.whatsapp);
      new.cep := public.fn_ui_digits_only(new.cep);

    when 'reativar_salao' then
      new.cpf_cnpj := public.fn_ui_digits_only(new.cpf_cnpj);
      new.telefone := public.fn_ui_digits_only(new.telefone);
      new.whatsapp := public.fn_ui_digits_only(new.whatsapp);
      new.cep := public.fn_ui_digits_only(new.cep);

    when 'produtos' then
      new.fornecedor_telefone := public.fn_ui_digits_only(new.fornecedor_telefone);
      new.fornecedor_whatsapp := public.fn_ui_digits_only(new.fornecedor_whatsapp);

    when 'configuracoes_salao' then
      new.sinal_whatsapp := public.fn_ui_digits_only(new.sinal_whatsapp);

    when 'agendamentos' then
      new.sinal_whatsapp := public.fn_ui_digits_only(new.sinal_whatsapp);
  end case;

  return new;
end;
$$;

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
