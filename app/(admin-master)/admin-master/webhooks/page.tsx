import AdminMasterSectionSimple from "@/components/admin-master/AdminMasterSectionSimple";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterWebhooksPage() {
  const data = await getAdminMasterSection("webhooks");
  return (
    <AdminMasterSectionSimple
      data={{
        ...data,
        title: "Webhooks",
        description: "Entregas e falhas de integrações. Esta tela faz parte do Diagnóstico técnico da operação.",
      }}
    />
  );
}
