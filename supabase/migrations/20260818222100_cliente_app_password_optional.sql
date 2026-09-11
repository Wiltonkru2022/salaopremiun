-- Ativação do cadastro sem senha do App Cliente.
-- Esta migration vem depois da preparação de identidade e do código novo.
alter table public.clientes_app_auth
  alter column senha_hash drop not null;
