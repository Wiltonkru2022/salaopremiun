import { AdminSectionView } from "@/components/admin-master/AdminMasterViews";
import { AdminWhatsappTemplatesEditor } from "@/components/admin-master/AdminMasterCommunicationEditor";
import { salvarWhatsappTemplateAdminMaster } from "@/app/(admin-master)/admin-master/whatsapp/actions";
import { getAdminWhatsappEditorData } from "@/lib/admin-master/communication-editor";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterWhatsAppTemplatesPage() {
  const [data, editorData] = await Promise.all([
    getAdminMasterSection("whatsapp"),
    getAdminWhatsappEditorData(),
  ]);

  return (
    <div className="space-y-6">
      <AdminSectionView data={{ ...data, title: "Templates de WhatsApp" }} />
      <AdminWhatsappTemplatesEditor
        rows={editorData.templates}
        salvarTemplate={salvarWhatsappTemplateAdminMaster}
      />
    </div>
  );
}
