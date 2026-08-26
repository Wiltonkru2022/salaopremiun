create table if not exists public.reativar_salao (
  id uuid primary key default gen_random_uuid(),
  id_salao_original uuid,
  nome_salao text not null,
  nome_responsavel text,
  email text,
  telefone text,
  whatsapp text,
  cpf_cnpj text,
  endereco_completo text,
  cidade text,
  estado text,
  bairro text,
  cep text,
  data_exclusao timestamptz not null default now(),
  motivo text,
  origem text not null default 'perfil_salao',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists reativar_salao_data_exclusao_idx
  on public.reativar_salao (data_exclusao desc);

create index if not exists reativar_salao_id_salao_original_idx
  on public.reativar_salao (id_salao_original);

alter table public.reativar_salao enable row level security;

revoke all on table public.reativar_salao from anon, authenticated;
grant select, insert on table public.reativar_salao to service_role;

create or replace function public.excluir_salao_definitivo(
  p_id_salao uuid,
  p_actor_usuario_id uuid default null,
  p_motivo text default null,
  p_origem text default 'perfil_salao'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_salao public.saloes%rowtype;
  v_table text;
  v_deleted integer;
  v_counts jsonb := '{}'::jsonb;
  v_pass integer;
  v_endereco_completo text;
  v_remaining integer := 0;
begin
  select *
    into v_salao
    from public.saloes
    where id = p_id_salao
    for update;

  if not found then
    raise exception 'Salao nao encontrado para exclusao.'
      using errcode = 'P0002';
  end if;

  v_endereco_completo := trim(both ' ' from concat_ws(
    ' ',
    nullif(trim(coalesce(v_salao.endereco, '')), ''),
    nullif(trim(coalesce(v_salao.numero, '')), ''),
    nullif(trim(coalesce(v_salao.bairro, '')), ''),
    nullif(trim(coalesce(v_salao.cidade, '')), ''),
    nullif(trim(coalesce(v_salao.estado, '')), ''),
    nullif(trim(coalesce(v_salao.cep, '')), '')
  ));

  insert into public.reativar_salao (
    id_salao_original,
    nome_salao,
    nome_responsavel,
    email,
    telefone,
    whatsapp,
    cpf_cnpj,
    endereco_completo,
    cidade,
    estado,
    bairro,
    cep,
    data_exclusao,
    motivo,
    origem,
    metadata
  )
  values (
    v_salao.id,
    coalesce(nullif(trim(v_salao.nome), ''), 'Salao excluido'),
    nullif(trim(coalesce(v_salao.responsavel, '')), ''),
    nullif(trim(coalesce(v_salao.email, '')), ''),
    nullif(trim(coalesce(v_salao.telefone, '')), ''),
    nullif(trim(coalesce(v_salao.telefone, '')), ''),
    nullif(trim(coalesce(v_salao.cpf_cnpj, '')), ''),
    nullif(v_endereco_completo, ''),
    nullif(trim(coalesce(v_salao.cidade, '')), ''),
    nullif(trim(coalesce(v_salao.estado, '')), ''),
    nullif(trim(coalesce(v_salao.bairro, '')), ''),
    nullif(trim(coalesce(v_salao.cep, '')), ''),
    now(),
    nullif(trim(coalesce(p_motivo, '')), ''),
    coalesce(nullif(trim(p_origem), ''), 'perfil_salao'),
    jsonb_build_object(
      'plano', v_salao.plano,
      'status', v_salao.status,
      'logo_url', v_salao.logo_url,
      'foto_capa_url', v_salao.foto_capa_url,
      'app_cliente_slug', v_salao.app_cliente_slug,
      'actor_usuario_id', p_actor_usuario_id
    )
  );

  for v_pass in 1..8 loop
    for v_table in
      select c.table_name
      from information_schema.columns c
      join information_schema.tables t
        on t.table_schema = c.table_schema
       and t.table_name = c.table_name
      where c.table_schema = 'public'
        and c.column_name = 'id_salao'
        and t.table_type = 'BASE TABLE'
        and c.table_name not in ('saloes', 'reativar_salao')
      order by c.table_name
    loop
      begin
        execute format('delete from public.%I where id_salao = $1', v_table)
          using p_id_salao;
        get diagnostics v_deleted = row_count;

        if v_deleted > 0 then
          v_counts := v_counts || jsonb_build_object(
            v_table,
            coalesce((v_counts ->> v_table)::integer, 0) + v_deleted
          );
        end if;
      exception
        when foreign_key_violation then
          null;
      end;
    end loop;
  end loop;

  select count(*)
    into v_remaining
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema
     and t.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'id_salao'
      and t.table_type = 'BASE TABLE'
      and c.table_name not in ('saloes', 'reativar_salao');

  delete from public.saloes where id = p_id_salao;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('saloes', v_deleted);

  return jsonb_build_object(
    'ok', true,
    'id_salao', p_id_salao,
    'tables_checked', v_remaining,
    'deleted', v_counts
  );
end;
$$;

revoke all on function public.excluir_salao_definitivo(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.excluir_salao_definitivo(uuid, uuid, text, text)
  to service_role;
