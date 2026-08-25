import AdminMasterSectionSimple from "@/components/admin-master/AdminMasterSectionSimple";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterSaloesPage() {
  const data = await getAdminMasterSection("saloes");
  return (
    <AdminMasterSectionSimple
      data={{
        ...data,
        description: "Contas, situação e uso da plataforma. Abra um salão para acessar o Raio-X organizado em abas.",
      }}
    />
  );
}
