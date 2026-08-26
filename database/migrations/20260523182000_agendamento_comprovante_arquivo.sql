alter table public.agendamentos
  add column if not exists sinal_comprovante_path text,
  add column if not exists sinal_comprovante_nome text,
  add column if not exists sinal_comprovante_tipo text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'agendamento-comprovantes',
  'agendamento-comprovantes',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
