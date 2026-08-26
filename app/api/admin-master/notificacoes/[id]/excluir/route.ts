import { NextResponse } from "next/server";
import { getAdminMasterAccess } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getDatabaseAdmin } from "@/lib/db/admin";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const access = await getAdminMasterAccess("notificacoes_editar");
  if (!access.ok) {
    return NextResponse.json(
      { ok: false, error: access.message },
      { status: access.status }
    );
  }

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json(
      { ok: false, error: "Notificação inválida." },
      { status: 400 }
    );
  }

  const supabase = getDatabaseAdmin() as any;
  const { data: current, error: currentError } = await supabase
    .from("notificacoes_globais")
    .select("id, titulo, status")
    .eq("id", id)
    .maybeSingle();

  if (currentError) {
    return NextResponse.json(
      { ok: false, error: "Não foi possível localizar a notificação." },
      { status: 500 }
    );
  }

  if (!current?.id) {
    return NextResponse.json(
      { ok: false, error: "Notificação não encontrada." },
      { status: 404 }
    );
  }

  const { error: deleteError } = await supabase
    .from("notificacoes_globais")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("[admin-master-notificacao] delete failed", deleteError);
    return NextResponse.json(
      { ok: false, error: "Não foi possível excluir a notificação." },
      { status: 500 }
    );
  }

  const { error: auditError } = await supabase
    .from("admin_master_auditoria")
    .insert({
      id_admin_usuario: access.usuario.id,
      acao: "notificacao_excluida",
      entidade: "notificacoes_globais",
      entidade_id: id,
      descricao: `Notificação excluída: ${String(current.titulo || "Sem título").slice(0, 120)}`,
      payload_json: {
        titulo: current.titulo || null,
        status: current.status || null,
      },
    });

  if (auditError) {
    console.error("[admin-master-notificacao] audit failed", auditError);
  }

  return NextResponse.json({ ok: true, resultado: { id } });
}
