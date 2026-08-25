import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminMasterNovaCampanhaPage() {
  redirect("/admin-master/parcerias#campanhas");
}
