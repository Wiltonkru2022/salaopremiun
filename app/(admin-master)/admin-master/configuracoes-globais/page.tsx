import { AdminSectionView } from "@/components/admin-master/AdminMasterViews";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterConfiguracoesGlobaisPage() {
  const data = await getAdminMasterSection("configuracoes-globais");
  return <AdminSectionView data={data} />;
}
