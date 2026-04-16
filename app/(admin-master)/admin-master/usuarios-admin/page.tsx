import { AdminSectionView } from "@/components/admin-master/AdminMasterViews";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterUsuariosAdminPage() {
  const data = await getAdminMasterSection("usuarios-admin");
  return <AdminSectionView data={data} />;
}
