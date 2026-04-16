import { AdminSectionView } from "@/components/admin-master/AdminMasterViews";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterWhatsAppPacotesPage() {
  const data = await getAdminMasterSection("whatsapp");
  return <AdminSectionView data={{ ...data, title: "Pacotes de WhatsApp" }} />;
}
