import Link from "next/link";
import { Handshake, Plus } from "lucide-react";
import AdminMasterSectionSimple from "@/components/admin-master/AdminMasterSectionSimple";
import { getAdvertisingCampaignsSection } from "@/lib/admin-master/advertising-campaigns";

export const dynamic = "force-dynamic";

export default async function AdminMasterCampanhasPage() {
  const data = await getAdvertisingCampaignsSection();

  return (
    <div className="space-y-6">
      <AdminMasterSectionSimple
        data={data}
        headerActions={
          <>
            <Link
              href="/admin-master/parcerias#campanhas"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-700 px-4 text-sm font-bold text-white transition hover:bg-violet-800"
            >
              <Plus size={16} /> Nova campanha
            </Link>
            <Link
              href="/admin-master/parcerias"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 text-sm font-bold text-violet-700 transition hover:bg-violet-100"
            >
              <Handshake size={16} /> Parcerias
            </Link>
          </>
        }
      />
    </div>
  );
}
