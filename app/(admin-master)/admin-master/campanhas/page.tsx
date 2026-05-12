import { AdminSectionView } from "@/components/admin-master/AdminMasterViews";
import { AdminCampaignEditor } from "@/components/admin-master/AdminMasterCommunicationEditor";
import { salvarCampanhaAdminMaster } from "@/app/(admin-master)/admin-master/campanhas/actions";
import { getAdminCampaignEditorData } from "@/lib/admin-master/communication-editor";
import { getAdminMasterSection } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterCampanhasPage() {
  const [data, editorRows] = await Promise.all([
    getAdminMasterSection("campanhas"),
    getAdminCampaignEditorData(),
  ]);

  return (
    <div className="space-y-6">
      <AdminSectionView data={data} />
      <AdminCampaignEditor
        rows={editorRows}
        salvarCampanha={salvarCampanhaAdminMaster}
      />
    </div>
  );
}
