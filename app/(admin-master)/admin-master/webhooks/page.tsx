import { AdminSectionView } from "@/components/admin-master/AdminMasterViews";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterWebhooksPage() {
  const data = await getAdminMasterSection("webhooks");
  return <AdminSectionView data={data} />;
}
