create extension if not exists pgcrypto;

create or replace function public.app_profissional_login(p_cpf text, p_senha text)
returns table (
  id uuid,
  id_salao uuid,
  nome text,
  nome_exibicao text,
  cpf text,
  telefone text,
  email text,
  ativo boolean,
  intervalo_agenda_minutos integer,
  horario_funcionamento jsonb
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_acesso record;
begin
  select
    a.id,
    a.id_profissional,
    a.cpf,
    a.senha_hash,
    a.ativo,
    p.cpf as profissional_cpf
  into v_acesso
  from public.profissionais_acessos a
  join public.profissionais p on p.id = a.id_profissional
  where a.ativo = true
    and p.ativo = true
    and coalesce(p.tipo_profissional, 'profissional') <> 'assistente'
    and coalesce(p.nivel_acesso, 'proprio') <> 'sem_acesso'
    and coalesce(p.pode_usar_sistema, true) = true
    and a.senha_hash <> ''
    and (
      a.cpf = v_cpf
      or regexp_replace(coalesce(p.cpf, ''), '\D', '', 'g') = v_cpf
    )
  order by
    case when a.cpf = v_cpf then 0 else 1 end,
    a.atualizado_em desc
  limit 1;

  if v_acesso.id is null then
    return;
  end if;

  if crypt(coalesce(p_senha, ''), v_acesso.senha_hash) <> v_acesso.senha_hash then
    return;
  end if;

  update public.profissionais_acessos
     set ultimo_login_em = now()
   where profissionais_acessos.id = v_acesso.id;

  return query
  select
    p.id,
    p.id_salao,
    p.nome,
    p.nome_exibicao,
    coalesce(nullif(v_acesso.cpf, ''), regexp_replace(coalesce(p.cpf, ''), '\D', '', 'g'))::text,
    p.telefone::text,
    p.email::text,
    p.ativo,
    coalesce(p.intervalo_agenda_minutos, 30),
    coalesce(p.dias_trabalho, '[]'::jsonb)
  from public.profissionais p
  where p.id = v_acesso.id_profissional
    and p.ativo = true
    and coalesce(p.tipo_profissional, 'profissional') <> 'assistente'
    and coalesce(p.nivel_acesso, 'proprio') <> 'sem_acesso'
    and coalesce(p.pode_usar_sistema, true) = true
  limit 1;
end;
$$;

grant execute on function public.app_profissional_login(text, text) to anon, authenticated;
