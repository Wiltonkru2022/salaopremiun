alter table public.profissionais_acessos
  add column if not exists auth_version integer not null default 1;

create index if not exists idx_profissionais_acessos_profissional_auth_version
  on public.profissionais_acessos (id_profissional, auth_version)
  where ativo = true;

create or replace function public.app_profissional_trocar_senha(
  p_profissional_id uuid,
  p_senha text
)
returns boolean
language plpgsql
security definer
set search_path = 'public', 'extensions'
as $function$
begin
  if length(coalesce(p_senha, '')) < 6 then
    raise exception 'A senha precisa ter pelo menos 6 caracteres.';
  end if;

  update public.profissionais_acessos
     set senha_hash = crypt(p_senha, gen_salt('bf')),
         auth_version = auth_version + 1,
         atualizado_em = now()
   where id_profissional = p_profissional_id
     and ativo = true;

  return found;
end;
$function$;

create or replace function public.bump_profissional_auth_version_on_password_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.senha_hash is distinct from old.senha_hash
     and new.auth_version = old.auth_version then
    new.auth_version := old.auth_version + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profissionais_acessos_auth_version
  on public.profissionais_acessos;
create trigger trg_profissionais_acessos_auth_version
before update of senha_hash on public.profissionais_acessos
for each row
execute function public.bump_profissional_auth_version_on_password_change();

revoke all on function public.bump_profissional_auth_version_on_password_change()
  from public, anon, authenticated;
grant execute on function public.bump_profissional_auth_version_on_password_change()
  to service_role;
