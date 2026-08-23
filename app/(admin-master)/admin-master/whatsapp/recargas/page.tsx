import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, WalletCards } from "lucide-react";
import {
  consultarRecargaWhatsappAsaasAdminMaster,
  reprocessarRecargaWhatsappAdminMaster,
} from "@/app/(admin-master)/admin-master/whatsapp/actions";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function money(value: unknown) {
  return (Number(value || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function statusStyle(status: string) {
  if (status === "pago") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "falhou") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "processando") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "pendente") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

export default async function AdminMasterWhatsappRecargasPage() {
  await requireAdminMasterUser("whatsapp_ver");
  const supabase = getSupabaseAdmin() as any;
  const now = new Date().toISOString();

  await supabase
    .from("whatsapp_creditos_recargas")
    .update({ status: "expirado", atualizado_em: now })
    .eq("status", "pendente")
    .lte("expira_em", now);

  const { data: recargas, error } = await supabase
    .from("whatsapp_creditos_recargas")
    .select(
      "id, id_salao, status, valor_centavos, billing_type, asaas_payment_id, criado_em, expira_em, pago_em, creditado_em, erro_texto, atualizado_em"
    )
    .order("criado_em", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message || "Nao foi possivel carregar as recargas WhatsApp.");

  const rows = (recargas || []) as Array<Record<string, unknown>>;
  const salaoIds = [...new Set(rows.map((row) => String(row.id_salao || "")).filter(Boolean))];
  const { data: saloes } = salaoIds.length
    ? await supabase.from("saloes").select("id, nome, responsavel").in("id", salaoIds)
    : { data: [] };
  const salaoMap = new Map(
    (saloes || []).map((salao: Record<string, unknown>) => [
      String(salao.id),
      String(salao.nome || salao.responsavel || "Salao"),
    ])
  );

  const falhasPagas = rows.filter(
    (row) => String(row.status || "") === "falhou" && Boolean(row.pago_em)
  );
  const pendentes = rows.filter((row) => String(row.status || "") === "pendente");
  const pagos = rows.filter((row) => String(row.status || "") === "pago");

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] bg-zinc-950 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">WhatsApp</div>
            <h1 className="mt-2 text-3xl font-black">Recargas e conciliacao PIX</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-300">
              Acompanhe quem pagou, quem ainda esta aguardando e recupere com seguranca um credito que nao entrou automaticamente.
            </p>
          </div>
          <Link href="/admin-master/whatsapp" className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-black hover:bg-white/15">
            Voltar ao WhatsApp
          </Link>
        </div>
      </section>

      {falhasPagas.length ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5" size={20} />
            <div>
              <div className="font-black">Pagamento confirmado sem credito</div>
              <p className="mt-1 text-sm leading-6">
                Existem {falhasPagas.length} recarga(s) que registraram pagamento, mas falharam ao liberar saldo. Revise e use “Reprocessar credito”.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <Clock3 size={18} className="text-amber-600" />
          <div className="mt-3 text-2xl font-black text-zinc-950">{pendentes.length}</div>
          <div className="text-xs font-bold text-zinc-500">Aguardando pagamento</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <div className="mt-3 text-2xl font-black text-zinc-950">{pagos.length}</div>
          <div className="text-xs font-bold text-zinc-500">Pagas e creditadas</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <AlertTriangle size={18} className="text-rose-600" />
          <div className="mt-3 text-2xl font-black text-zinc-950">{falhasPagas.length}</div>
          <div className="text-xs font-bold text-zinc-500">Exigem atencao</div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-5 py-4">
          <div className="flex items-center gap-2 font-black text-zinc-950">
            <WalletCards size={18} /> Ultimas recargas
          </div>
          <p className="mt-1 text-xs text-zinc-500">PIX do SalaoPremium expira 24 horas apos ser gerado. Sao exibidas as 100 recargas mais recentes.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-[11px] font-black uppercase tracking-[0.12em] text-zinc-500">
              <tr>
                <th className="px-4 py-3">Salao</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Gerado / expira</th>
                <th className="px-4 py-3">Pagamento / credito</th>
                <th className="px-4 py-3">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((row) => {
                const id = String(row.id);
                const status = String(row.status || "pendente");
                const idSalao = String(row.id_salao || "");
                return (
                  <tr key={id} className="align-top">
                    <td className="px-4 py-4">
                      <div className="font-black text-zinc-950">{salaoMap.get(idSalao) || "Salao"}</div>
                      <div className="mt-1 text-[11px] text-zinc-400">{idSalao.slice(0, 8)}</div>
                    </td>
                    <td className="px-4 py-4 font-black text-zinc-950">{money(row.valor_centavos)}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${statusStyle(status)}`}>
                        {status}
                      </span>
                      {row.erro_texto ? <div className="mt-2 max-w-[260px] text-xs leading-5 text-rose-600">Falha registrada para suporte.</div> : null}
                    </td>
                    <td className="px-4 py-4 text-xs leading-6 text-zinc-600">
                      <div>{dateTime(String(row.criado_em || ""))}</div>
                      <div className="font-bold">Expira: {dateTime(String(row.expira_em || ""))}</div>
                    </td>
                    <td className="px-4 py-4 text-xs leading-6 text-zinc-600">
                      <div>Pago: {dateTime(row.pago_em ? String(row.pago_em) : null)}</div>
                      <div>Creditado: {dateTime(row.creditado_em ? String(row.creditado_em) : null)}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex min-w-[190px] flex-col gap-2">
                        <form action={consultarRecargaWhatsappAsaasAdminMaster}>
                          <input type="hidden" name="id" value={id} />
                          <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-800 hover:bg-zinc-50">
                            <RefreshCw size={14} /> Consultar no Asaas
                          </button>
                        </form>
                        {status === "falhou" && row.pago_em ? (
                          <form action={reprocessarRecargaWhatsappAdminMaster}>
                            <input type="hidden" name="id" value={id} />
                            <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-3 py-2 text-xs font-black text-white hover:bg-zinc-800">
                              Reprocessar credito
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!rows.length ? (
                <tr><td colSpan={6} className="px-5 py-8 text-sm text-zinc-500">Nenhuma recarga registrada.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
