import { AdminSectionView } from "@/components/admin-master/AdminMasterViews";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterAssinaturasPage() {
  const data = await getAdminMasterSection("assinaturas");
  return <AdminSectionView data={data} />;
}
