import AdminMasterWhatsAppCreditosEditor from "@/components/admin-master/AdminMasterWhatsAppCreditosEditor";
import {
  ajustarWhatsappSaldoAdminMaster,
  salvarWhatsappTarifaAdminMaster,
} from "@/app/(admin-master)/admin-master/whatsapp/actions";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getAdminWhatsappCreditosData } from "@/lib/admin-master/whatsapp-creditos";

export const dynamic = "force-dynamic";

export default async function AdminMasterWhatsAppTarifasPage() {
  await requireAdminMasterUser("whatsapp_ver");
  const data = await getAdminWhatsappCreditosData();

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="text-xs font-black uppercase tracking-[0.24em] text-amber-600">
          AdminMaster
        </div>
        <h1 className="mt-2 text-3xl font-black text-zinc-950">
          WhatsApp | Creditos e Tarifas
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
          Configure preco de venda, custo de referencia, saldo por salao e
          ajustes auditados da carteira WhatsApp.
        </p>
      </section>

      <AdminMasterWhatsAppCreditosEditor
        tarifas={data.tarifas}
        saldos={data.saldos}
        saloesOptions={data.saloesOptions}
        salvarTarifa={salvarWhatsappTarifaAdminMaster}
        ajustarSaldo={ajustarWhatsappSaldoAdminMaster}
      />
    </div>
  );
}
