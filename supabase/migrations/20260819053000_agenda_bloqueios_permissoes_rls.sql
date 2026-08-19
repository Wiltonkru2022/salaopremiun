-- Complementa o hardening da agenda para os bloqueios criados pelo painel.
-- A leitura continua seguindo a politica existente do mesmo salao.

drop policy if exists agenda_bloqueios_insert on public.agenda_bloqueios;
create policy agenda_bloqueios_insert
on public.agenda_bloqueios for insert to authenticated
with check (
  public.fn_usuario_tem_permissao('agenda_criar')
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists agenda_bloqueios_update on public.agenda_bloqueios;
create policy agenda_bloqueios_update
on public.agenda_bloqueios for update to authenticated
using (
  public.fn_usuario_tem_permissao('agenda_editar')
  and id_salao = (select public.fn_id_salao_atual())
)
with check (
  public.fn_usuario_tem_permissao('agenda_editar')
  and id_salao = (select public.fn_id_salao_atual())
);

drop policy if exists agenda_bloqueios_delete on public.agenda_bloqueios;
create policy agenda_bloqueios_delete
on public.agenda_bloqueios for delete to authenticated
using (
  public.fn_usuario_tem_permissao('agenda_excluir')
  and id_salao = (select public.fn_id_salao_atual())
);
