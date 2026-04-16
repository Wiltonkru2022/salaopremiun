import { AdminSectionView } from "@/components/admin-master/AdminMasterViews";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterTicketsPage() {
  const data = await getAdminMasterSection("tickets");
  return <AdminSectionView data={data} />;
}
