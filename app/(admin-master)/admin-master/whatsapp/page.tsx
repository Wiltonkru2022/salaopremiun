import Link from "next/link";
import { AlertTriangle, MessageSquareText, WalletCards } from "lucide-react";
import WhatsAppSupportClient from "@/components/admin-master/WhatsAppSupportClient";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getDatabaseAdmin } from "@/lib/db/admin";

export const dynamic = "force-dynamic";

export default async function AdminMasterWhatsAppPage() {
  await requireAdminMasterUser("whatsapp_ver");
  const supabase = getDatabaseAdmin() as any;
  const { count: recargasComFalha } = await supabase
    .from("whatsapp_creditos_recargas")
    .select("id", { count: "exact", head: true })
    .eq("status", "falhou")
    .not("pago_em", "is", null);

  return (
    <div className="space-y-4">
      {Number(recargasComFalha || 0) > 0 ? (
        <Link
          href="/admin-master/whatsapp/recargas"
          className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900 shadow-sm"
        >
          <AlertTriangle className="mt-0.5 shrink-0" size={19} />
          <div>
            <div className="text-sm font-black">Pagamento confirmado sem credito</div>
            <div className="mt-1 text-xs leading-5 opacity-80">
              {recargasComFalha} recarga(s) precisam de conciliacao. Abra para consultar o Asaas e reprocessar com seguranca.
            </div>
          </div>
        </Link>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Link
          href="/admin-master/whatsapp/recargas"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-800 shadow-sm transition hover:bg-zinc-50"
        >
          <WalletCards size={16} />
          Recargas PIX
        </Link>
        <Link
          href="/admin-master/whatsapp/templates"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-800 shadow-sm transition hover:bg-zinc-50"
        >
          <MessageSquareText size={16} />
          Templates WhatsApp
        </Link>
      </div>
      <WhatsAppSupportClient />
    </div>
  );
}
