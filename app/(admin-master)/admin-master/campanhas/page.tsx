import Link from "next/link";
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">Nova fonte de receita</div>
          <div className="mt-1 font-bold text-zinc-950">Publicidade e parcerias diretas</div>
          <div className="mt-1 text-sm text-zinc-600">Cadastre anunciantes, campanhas patrocinadas e contratos comerciais.</div>
        </div>
        <Link href="/admin-master/parcerias" className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white transition hover:bg-zinc-800">
          Abrir parcerias
        </Link>
      </div>
      <AdminMasterSectionSimple data={data} />
      <AdminCampaignEditor
        rows={editorRows}
        salvarCampanha={salvarCampanhaAdminMaster}
      />
    </div>
  );
}
