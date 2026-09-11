insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'salao-publico',
  'salao-publico',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists salao_publico_select_public on storage.objects;
create policy salao_publico_select_public
on storage.objects
for select
to public
using (bucket_id = 'salao-publico');

drop policy if exists salao_publico_insert_admin_salao on storage.objects;
create policy salao_publico_insert_admin_salao
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'salao-publico'
  and (select public.fn_usuario_admin())
  and split_part(name, '/', 1) = (select public.fn_id_salao_atual())::text
);

drop policy if exists salao_publico_update_admin_salao on storage.objects;
create policy salao_publico_update_admin_salao
on storage.objects
for update
to authenticated
using (
  bucket_id = 'salao-publico'
  and (select public.fn_usuario_admin())
  and split_part(name, '/', 1) = (select public.fn_id_salao_atual())::text
)
with check (
  bucket_id = 'salao-publico'
  and (select public.fn_usuario_admin())
  and split_part(name, '/', 1) = (select public.fn_id_salao_atual())::text
);

drop policy if exists salao_publico_delete_admin_salao on storage.objects;
create policy salao_publico_delete_admin_salao
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'salao-publico'
  and (select public.fn_usuario_admin())
  and split_part(name, '/', 1) = (select public.fn_id_salao_atual())::text
);
