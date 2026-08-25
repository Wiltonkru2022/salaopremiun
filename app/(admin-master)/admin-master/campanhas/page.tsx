import Link from "next/link";
import { Handshake } from "lucide-react";
import AdminMasterSectionSimple from "@/components/admin-master/AdminMasterSectionSimple";
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
      <AdminMasterSectionSimple
        data={data}
        headerActions={
          <Link href="/admin-master/parcerias" className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-700 px-4 text-sm font-bold text-white transition hover:bg-violet-800">
            <Handshake size={16} /> Parcerias e anúncios
          </Link>
        }
      />
      <AdminCampaignEditor rows={editorRows} salvarCampanha={salvarCampanhaAdminMaster} />
    </div>
  );
}
