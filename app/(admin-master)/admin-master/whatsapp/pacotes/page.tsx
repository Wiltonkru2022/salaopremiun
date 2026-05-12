import { AdminSectionView } from "@/components/admin-master/AdminMasterViews";
import { AdminWhatsappPackagesEditor } from "@/components/admin-master/AdminMasterCommunicationEditor";
import { salvarWhatsappPacoteAdminMaster } from "@/app/(admin-master)/admin-master/whatsapp/actions";
import { getAdminWhatsappEditorData } from "@/lib/admin-master/communication-editor";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterWhatsAppPacotesPage() {
  const [data, editorData] = await Promise.all([
    getAdminMasterSection("whatsapp"),
    getAdminWhatsappEditorData(),
  ]);

  return (
    <div className="space-y-6">
      <AdminSectionView data={{ ...data, title: "Pacotes de WhatsApp" }} />
      <AdminWhatsappPackagesEditor
        rows={editorData.packages}
        salvarPacote={salvarWhatsappPacoteAdminMaster}
      />
    </div>
  );
}
