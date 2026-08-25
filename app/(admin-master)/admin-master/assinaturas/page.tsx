import AdminMasterSectionSimple from "@/components/admin-master/AdminMasterSectionSimple";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterAssinaturasPage() {
  const data = await getAdminMasterSection("assinaturas");
  return <AdminMasterSectionSimple data={data} />;
}
