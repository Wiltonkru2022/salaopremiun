import WhatsAppSupportClient from "@/components/admin-master/WhatsAppSupportClient";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";

export const dynamic = "force-dynamic";

export default async function AdminMasterWhatsAppPage() {
  await requireAdminMasterUser("whatsapp_ver");
  return <WhatsAppSupportClient />;
}
