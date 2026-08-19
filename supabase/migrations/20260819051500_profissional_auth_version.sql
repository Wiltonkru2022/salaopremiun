alter table public.profissionais_acessos
  add column if not exists auth_version integer not null default 1;

update public.profissionais_acessos
set auth_version = 1
where auth_version is null or auth_version < 1;

create or replace function public.bump_profissional_auth_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.senha_hash is distinct from old.senha_hash then
    new.auth_version := greatest(coalesce(old.auth_version, 1), 1) + 1;
  else
    new.auth_version := greatest(coalesce(new.auth_version, old.auth_version, 1), 1);
  end if;

  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists trg_profissionais_acessos_auth_version on public.profissionais_acessos;

create trigger trg_profissionais_acessos_auth_version
before update on public.profissionais_acessos
for each row
execute function public.bump_profissional_auth_version();
