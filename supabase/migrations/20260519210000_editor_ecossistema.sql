create table if not exists public.editor_pastas (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  nome text not null,
  cor text,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.editor_templates (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid references public.saloes(id) on delete cascade,
  nome text not null,
  categoria text not null default 'geral',
  formato text not null default 'post',
  largura integer not null default 1080,
  altura integer not null default 1080,
  preview_url text,
  payload_json jsonb not null default '{}'::jsonb,
  publico boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.editor_projetos (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  id_usuario uuid references public.usuarios(id) on delete set null,
  id_pasta uuid references public.editor_pastas(id) on delete set null,
  id_template uuid references public.editor_templates(id) on delete set null,
  nome text not null default 'Projeto sem titulo',
  formato text not null default 'post',
  largura integer not null default 1080,
  altura integer not null default 1080,
  thumbnail_url text,
  payload_json jsonb not null default '{}'::jsonb,
  versao integer not null default 1,
  status text not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.editor_projeto_versoes (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  id_projeto uuid not null references public.editor_projetos(id) on delete cascade,
  id_usuario uuid references public.usuarios(id) on delete set null,
  versao integer not null,
  payload_json jsonb not null default '{}'::jsonb,
  thumbnail_url text,
  created_at timestamptz not null default now(),
  unique (id_projeto, versao)
);

create table if not exists public.editor_assets (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid references public.saloes(id) on delete cascade,
  nome text not null,
  categoria text not null default 'geral',
  tipo text not null default 'sticker',
  origem text not null default 'salaopremiun',
  url text not null,
  preview_url text,
  tags text[] not null default '{}'::text[],
  payload_json jsonb not null default '{}'::jsonb,
  publico boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.editor_uploads (
  id uuid primary key default gen_random_uuid(),
  id_salao uuid not null references public.saloes(id) on delete cascade,
  id_usuario uuid references public.usuarios(id) on delete set null,
  nome_arquivo text not null,
  bucket text not null default 'editor-assets',
  path text not null,
  url text,
  mime_type text,
  tamanho_bytes bigint,
  largura integer,
  altura integer,
  created_at timestamptz not null default now()
);

create index if not exists editor_pastas_salao_idx on public.editor_pastas(id_salao, ordem, nome);
create index if not exists editor_templates_publicos_idx on public.editor_templates(publico, ativo, categoria, formato);
create index if not exists editor_templates_salao_idx on public.editor_templates(id_salao, ativo, categoria, formato);
create index if not exists editor_projetos_salao_idx on public.editor_projetos(id_salao, status, updated_at desc);
create index if not exists editor_projeto_versoes_projeto_idx on public.editor_projeto_versoes(id_projeto, versao desc);
create index if not exists editor_assets_publicos_idx on public.editor_assets(publico, ativo, categoria, tipo);
create index if not exists editor_assets_salao_idx on public.editor_assets(id_salao, ativo, categoria, tipo);
create index if not exists editor_uploads_salao_idx on public.editor_uploads(id_salao, created_at desc);

alter table public.editor_pastas enable row level security;
alter table public.editor_templates enable row level security;
alter table public.editor_projetos enable row level security;
alter table public.editor_projeto_versoes enable row level security;
alter table public.editor_assets enable row level security;
alter table public.editor_uploads enable row level security;

create policy editor_pastas_select_membros
  on public.editor_pastas for select to authenticated
  using ((select public.usuario_tem_acesso_salao(id_salao)));
create policy editor_pastas_insert_membros
  on public.editor_pastas for insert to authenticated
  with check ((select public.usuario_tem_acesso_salao(id_salao)));
create policy editor_pastas_update_membros
  on public.editor_pastas for update to authenticated
  using ((select public.usuario_tem_acesso_salao(id_salao)))
  with check ((select public.usuario_tem_acesso_salao(id_salao)));
create policy editor_pastas_delete_membros
  on public.editor_pastas for delete to authenticated
  using ((select public.usuario_tem_acesso_salao(id_salao)));

create policy editor_templates_select_membros_ou_publicos
  on public.editor_templates for select to authenticated
  using (publico is true or (id_salao is not null and (select public.usuario_tem_acesso_salao(id_salao))));
create policy editor_templates_insert_membros
  on public.editor_templates for insert to authenticated
  with check (id_salao is not null and (select public.usuario_tem_acesso_salao(id_salao)));
create policy editor_templates_update_membros
  on public.editor_templates for update to authenticated
  using (id_salao is not null and (select public.usuario_tem_acesso_salao(id_salao)))
  with check (id_salao is not null and (select public.usuario_tem_acesso_salao(id_salao)));
create policy editor_templates_delete_membros
  on public.editor_templates for delete to authenticated
  using (id_salao is not null and (select public.usuario_tem_acesso_salao(id_salao)));

create policy editor_projetos_select_membros
  on public.editor_projetos for select to authenticated
  using ((select public.usuario_tem_acesso_salao(id_salao)));
create policy editor_projetos_insert_membros
  on public.editor_projetos for insert to authenticated
  with check ((select public.usuario_tem_acesso_salao(id_salao)));
create policy editor_projetos_update_membros
  on public.editor_projetos for update to authenticated
  using ((select public.usuario_tem_acesso_salao(id_salao)))
  with check ((select public.usuario_tem_acesso_salao(id_salao)));
create policy editor_projetos_delete_membros
  on public.editor_projetos for delete to authenticated
  using ((select public.usuario_tem_acesso_salao(id_salao)));

create policy editor_projeto_versoes_select_membros
  on public.editor_projeto_versoes for select to authenticated
  using ((select public.usuario_tem_acesso_salao(id_salao)));
create policy editor_projeto_versoes_insert_membros
  on public.editor_projeto_versoes for insert to authenticated
  with check ((select public.usuario_tem_acesso_salao(id_salao)));
create policy editor_projeto_versoes_delete_membros
  on public.editor_projeto_versoes for delete to authenticated
  using ((select public.usuario_tem_acesso_salao(id_salao)));

create policy editor_assets_select_membros_ou_publicos
  on public.editor_assets for select to authenticated
  using (publico is true or (id_salao is not null and (select public.usuario_tem_acesso_salao(id_salao))));
create policy editor_assets_insert_membros
  on public.editor_assets for insert to authenticated
  with check (id_salao is not null and (select public.usuario_tem_acesso_salao(id_salao)));
create policy editor_assets_update_membros
  on public.editor_assets for update to authenticated
  using (id_salao is not null and (select public.usuario_tem_acesso_salao(id_salao)))
  with check (id_salao is not null and (select public.usuario_tem_acesso_salao(id_salao)));
create policy editor_assets_delete_membros
  on public.editor_assets for delete to authenticated
  using (id_salao is not null and (select public.usuario_tem_acesso_salao(id_salao)));

create policy editor_uploads_select_membros
  on public.editor_uploads for select to authenticated
  using ((select public.usuario_tem_acesso_salao(id_salao)));
create policy editor_uploads_insert_membros
  on public.editor_uploads for insert to authenticated
  with check ((select public.usuario_tem_acesso_salao(id_salao)));
create policy editor_uploads_delete_membros
  on public.editor_uploads for delete to authenticated
  using ((select public.usuario_tem_acesso_salao(id_salao)));

grant select, insert, update, delete on public.editor_pastas to authenticated;
grant select, insert, update, delete on public.editor_templates to authenticated;
grant select, insert, update, delete on public.editor_projetos to authenticated;
grant select, insert, delete on public.editor_projeto_versoes to authenticated;
grant select, insert, update, delete on public.editor_assets to authenticated;
grant select, insert, delete on public.editor_uploads to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'editor-assets',
  'editor-assets',
  true,
  26214400,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml',
    'application/pdf'
  ]::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy editor_assets_storage_select
  on storage.objects for select to authenticated
  using (bucket_id = 'editor-assets');

create policy editor_assets_storage_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'editor-assets'
    and (select public.usuario_tem_acesso_salao((storage.foldername(name))[1]::uuid))
  );

create policy editor_assets_storage_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'editor-assets'
    and (select public.usuario_tem_acesso_salao((storage.foldername(name))[1]::uuid))
  )
  with check (
    bucket_id = 'editor-assets'
    and (select public.usuario_tem_acesso_salao((storage.foldername(name))[1]::uuid))
  );

create policy editor_assets_storage_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'editor-assets'
    and (select public.usuario_tem_acesso_salao((storage.foldername(name))[1]::uuid))
  );
