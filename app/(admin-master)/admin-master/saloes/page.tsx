import AdminMasterSectionSimple from "@/components/admin-master/AdminMasterSectionSimple";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterSaloesPage() {
  const data = await getAdminMasterSection("saloes");
  const columns = data.columns.includes("acao") ? data.columns : [...data.columns, "acao"];
  const rows = data.rows.map((row) => ({
    ...row,
    acao: row.acao_id ? "Ver Raio-X" : row.acao || "-",
    acao_tipo: row.acao_id ? "salao_detail" : row.acao_tipo,
  }));

  return (
    <AdminMasterSectionSimple
      data={{
        ...data,
        rows,
        columns,
        description:
          "Contas, situação e uso da plataforma. Use Ver Raio-X para abrir a ficha completa do salão, assinatura, suporte, atividade e notas.",
      }}
    />
  );
}
