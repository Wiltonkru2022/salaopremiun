import { AdminSectionView } from "@/components/admin-master/AdminMasterViews";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterChecklistsPage() {
  const data = await getAdminMasterSection("checklists");
  return <AdminSectionView data={data} />;
}
