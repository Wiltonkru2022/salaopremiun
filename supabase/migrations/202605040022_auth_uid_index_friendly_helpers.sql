create or replace function public.usuario_tem_acesso_salao(p_id_salao uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.auth_user_id = (select auth.uid())
      and u.id_salao = p_id_salao
      and coalesce(u.status, 'ativo') = 'ativo'
  );
$$;

create or replace function public.usuario_pode_operar_caixa(p_id_salao uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.auth_user_id = (select auth.uid())
      and u.id_salao = p_id_salao
      and coalesce(u.status, 'ativo') = 'ativo'
      and lower(coalesce(u.nivel, '')) in ('admin', 'gerente')
  );
$$;

create or replace function public.usuario_pode_ver_suporte(p_id_salao uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.usuarios u
     where u.auth_user_id = (select auth.uid())
       and u.id_salao = p_id_salao
       and lower(coalesce(u.status, '')) = 'ativo'
       and lower(coalesce(u.nivel, '')) in ('admin', 'gerente', 'profissional', 'recepcao')
  );
$$;

create or replace function public.fn_usuario_pertence_ao_salao(p_id_salao uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.auth_user_id = (select auth.uid())
      and u.id_salao = p_id_salao
      and coalesce(u.status, 'ativo') = 'ativo'
  );
$$;

create index if not exists usuarios_auth_user_id_ativo_salao_idx
  on public.usuarios (auth_user_id, id_salao)
  where status = 'ativo';
