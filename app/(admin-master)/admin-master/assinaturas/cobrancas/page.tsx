import { AdminSectionView } from "@/components/admin-master/AdminMasterViews";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterCobrancasPage() {
  const data = await getAdminMasterSection("cobrancas");
  return <AdminSectionView data={data} />;
}
