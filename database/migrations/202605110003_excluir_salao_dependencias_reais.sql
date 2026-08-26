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
  v_tables_checked integer := 0;
  v_fk record;
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

  for v_pass in 1..10 loop
    if to_regclass('public.ticket_eventos') is not null
      and to_regclass('public.tickets') is not null
    then
      delete from public.ticket_eventos te
      using public.tickets t
      where te.id_ticket = t.id
        and t.id_salao = p_id_salao;
      get diagnostics v_deleted = row_count;
      if v_deleted > 0 then
        v_counts := v_counts || jsonb_build_object(
          'ticket_eventos',
          coalesce((v_counts ->> 'ticket_eventos')::integer, 0) + v_deleted
        );
      end if;
    end if;

    if to_regclass('public.ticket_mensagens') is not null
      and to_regclass('public.tickets') is not null
    then
      delete from public.ticket_mensagens tm
      using public.tickets t
      where tm.id_ticket = t.id
        and t.id_salao = p_id_salao;
      get diagnostics v_deleted = row_count;
      if v_deleted > 0 then
        v_counts := v_counts || jsonb_build_object(
          'ticket_mensagens',
          coalesce((v_counts ->> 'ticket_mensagens')::integer, 0) + v_deleted
        );
      end if;
    end if;

    if to_regclass('public.ticket_mensagens') is not null
      and to_regclass('public.profissionais') is not null
    then
      delete from public.ticket_mensagens tm
      using public.profissionais p
      where tm.id_profissional = p.id
        and p.id_salao = p_id_salao;
      get diagnostics v_deleted = row_count;
      if v_deleted > 0 then
        v_counts := v_counts || jsonb_build_object(
          'ticket_mensagens',
          coalesce((v_counts ->> 'ticket_mensagens')::integer, 0) + v_deleted
        );
      end if;
    end if;

    if to_regclass('public.ticket_mensagens') is not null
      and to_regclass('public.usuarios') is not null
    then
      delete from public.ticket_mensagens tm
      using public.usuarios u
      where tm.id_usuario_salao = u.id
        and u.id_salao = p_id_salao;
      get diagnostics v_deleted = row_count;
      if v_deleted > 0 then
        v_counts := v_counts || jsonb_build_object(
          'ticket_mensagens',
          coalesce((v_counts ->> 'ticket_mensagens')::integer, 0) + v_deleted
        );
      end if;
    end if;

    if to_regclass('public.profissionais_acessos') is not null
      and to_regclass('public.profissionais') is not null
    then
      delete from public.profissionais_acessos pa
      using public.profissionais p
      where pa.id_profissional = p.id
        and p.id_salao = p_id_salao;
      get diagnostics v_deleted = row_count;
      if v_deleted > 0 then
        v_counts := v_counts || jsonb_build_object(
          'profissionais_acessos',
          coalesce((v_counts ->> 'profissionais_acessos')::integer, 0) + v_deleted
        );
      end if;
    end if;

    if to_regclass('public.suporte_mensagens') is not null
      and to_regclass('public.suporte_conversas') is not null
    then
      delete from public.suporte_mensagens sm
      using public.suporte_conversas sc
      where sm.id_conversa = sc.id
        and sc.id_salao = p_id_salao;
      get diagnostics v_deleted = row_count;
      if v_deleted > 0 then
        v_counts := v_counts || jsonb_build_object(
          'suporte_mensagens',
          coalesce((v_counts ->> 'suporte_mensagens')::integer, 0) + v_deleted
        );
      end if;
    end if;

    for v_fk in
      select
        child.relname as child_table,
        child_col.attname as child_column,
        parent.relname as parent_table,
        parent_col.attname as parent_column
      from pg_constraint con
      join pg_class child on child.oid = con.conrelid
      join pg_namespace child_ns on child_ns.oid = child.relnamespace
      join pg_class parent on parent.oid = con.confrelid
      join pg_namespace parent_ns on parent_ns.oid = parent.relnamespace
      join pg_attribute child_col
        on child_col.attrelid = child.oid
       and child_col.attnum = con.conkey[1]
      join pg_attribute parent_col
        on parent_col.attrelid = parent.oid
       and parent_col.attnum = con.confkey[1]
      where con.contype = 'f'
        and array_length(con.conkey, 1) = 1
        and array_length(con.confkey, 1) = 1
        and child_ns.nspname = 'public'
        and parent_ns.nspname = 'public'
        and child.relkind = 'r'
        and parent.relkind = 'r'
        and not exists (
          select 1
          from information_schema.columns c
          where c.table_schema = 'public'
            and c.table_name = child.relname
            and c.column_name = 'id_salao'
        )
        and (
          parent.relname = 'saloes'
          or exists (
            select 1
            from information_schema.columns c
            where c.table_schema = 'public'
              and c.table_name = parent.relname
              and c.column_name = 'id_salao'
          )
        )
      order by child.relname
    loop
      begin
        if v_fk.parent_table = 'saloes' then
          execute format(
            'delete from public.%I child where child.%I = $1',
            v_fk.child_table,
            v_fk.child_column
          )
          using p_id_salao;
        else
          execute format(
            'delete from public.%I child using public.%I parent where child.%I = parent.%I and parent.id_salao = $1',
            v_fk.child_table,
            v_fk.parent_table,
            v_fk.child_column,
            v_fk.parent_column
          )
          using p_id_salao;
        end if;

        get diagnostics v_deleted = row_count;

        if v_deleted > 0 then
          v_counts := v_counts || jsonb_build_object(
            v_fk.child_table,
            coalesce((v_counts ->> v_fk.child_table)::integer, 0) + v_deleted
          );
        end if;
      exception
        when foreign_key_violation then
          null;
      end;
    end loop;

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
    into v_tables_checked
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
    'tables_checked', v_tables_checked,
    'deleted', v_counts
  );
end;
$$;

revoke all on function public.excluir_salao_definitivo(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.excluir_salao_definitivo(uuid, uuid, text, text)
  to service_role;
