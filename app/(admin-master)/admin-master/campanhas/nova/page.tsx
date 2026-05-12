import { AdminCampaignEditor } from "@/components/admin-master/AdminMasterCommunicationEditor";
import { salvarCampanhaAdminMaster } from "@/app/(admin-master)/admin-master/campanhas/actions";

export const dynamic = "force-dynamic";

export default async function AdminMasterNovaCampanhaPage() {
  return (
    <AdminCampaignEditor
      rows={[]}
      salvarCampanha={salvarCampanhaAdminMaster}
    />
  );
}
