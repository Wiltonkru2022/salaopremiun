import AdminMasterSectionSimple from "@/components/admin-master/AdminMasterSectionSimple";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterPlanoDetailPage() {
  const data = await getAdminMasterSection("planos");
  return <AdminMasterSectionSimple data={{ ...data, title: "Detalhe do plano" }} />;
}
