import AdminMasterSectionSimple from "@/components/admin-master/AdminMasterSectionSimple";
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
      <AdminMasterSectionSimple
        data={{
          ...data,
          title: "Templates de WhatsApp",
          description: "Modelos de mensagens do canal. Pacotes, tarifas e recargas ficam na mesma subnavegação.",
        }}
      />
      <AdminWhatsappTemplatesEditor rows={editorData.templates} salvarTemplate={salvarWhatsappTemplateAdminMaster} />
    </div>
  );
}
