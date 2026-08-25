import AdminMasterSectionSimple from "@/components/admin-master/AdminMasterSectionSimple";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterNotificacoesPage() {
  const data = await getAdminMasterSection("notificacoes");
  const rows = data.rows.map((row) => {
    const id = String(row.acao_id || "").trim();
    return {
      ...row,
      excluir_acao: id ? "Excluir" : "-",
      excluir_acao_tipo: id ? "notificacao_delete" : null,
      excluir_acao_id: id || null,
    };
  });
  const columns = data.columns.includes("excluir_acao")
    ? data.columns
    : [...data.columns, "excluir_acao"];

  return (
    <AdminMasterSectionSimple
      data={{
        ...data,
        rows,
        columns,
        title: "Notificações",
        description: "Envios, histórico e falhas de comunicação em uma subárea de Campanhas.",
      }}
    />
  );
}
