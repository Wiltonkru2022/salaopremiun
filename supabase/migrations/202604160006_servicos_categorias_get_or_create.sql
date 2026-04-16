create or replace function public.fn_get_or_create_servico_categoria(
  p_id_salao uuid,
  p_nome text
)
returns table (
  id uuid,
  nome text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text := nullif(trim(coalesce(p_nome, '')), '');
  v_id uuid;
begin
  if p_id_salao is null then
    raise exception 'Salao nao informado.'
      using errcode = '22023';
  end if;

  if v_nome is null then
    raise exception 'Nome da categoria nao informado.'
      using errcode = '22023';
  end if;

  if coalesce(auth.role(), '') <> 'service_role'
    and not public.usuario_tem_acesso_salao(p_id_salao)
  then
    raise exception 'Usuario sem acesso ao salao.'
      using errcode = '42501';
  end if;

  select c.id
    into v_id
  from public.servicos_categorias c
  where c.id_salao = p_id_salao
    and lower(trim(c.nome)) = lower(v_nome)
  order by coalesce(c.ativo, true) desc, c.created_at asc
  limit 1;

  if v_id is not null then
    update public.servicos_categorias c
    set
      ativo = true,
      updated_at = now()
    where c.id = v_id;

    return query
    select c.id, c.nome
    from public.servicos_categorias c
    where c.id = v_id;

    return;
  end if;

  begin
    insert into public.servicos_categorias (id_salao, nome, ativo)
    values (p_id_salao, v_nome, true)
    returning servicos_categorias.id into v_id;
  exception
    when unique_violation then
      select c.id
        into v_id
      from public.servicos_categorias c
      where c.id_salao = p_id_salao
        and lower(trim(c.nome)) = lower(v_nome)
      order by coalesce(c.ativo, true) desc, c.created_at asc
      limit 1;

      if v_id is null then
        raise;
      end if;

      update public.servicos_categorias c
      set
        ativo = true,
        updated_at = now()
      where c.id = v_id;
  end;

  return query
  select c.id, c.nome
  from public.servicos_categorias c
  where c.id = v_id;
end;
$$;

grant execute on function public.fn_get_or_create_servico_categoria(uuid, text)
to authenticated, service_role;
