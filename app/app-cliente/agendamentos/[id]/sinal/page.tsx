import QRCode from "qrcode";
import { redirect } from "next/navigation";
import { Copy, MessageCircle } from "lucide-react";
import { requireClienteAppContext } from "@/lib/client-context.server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildPixPayload } from "@/lib/pix/brcode";
import { enviarComprovanteSinalAction } from "./actions";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default async function ClienteAgendamentoSinalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireClienteAppContext();
  const supabaseAdmin = getSupabaseAdmin();

  const { data: agendamento } = await (supabaseAdmin as any)
    .from("agendamentos")
    .select("id, cliente_id, id_salao, data, hora_inicio, status, sinal_valor, sinal_percentual, sinal_pix_chave, sinal_pix_recebedor, sinal_pix_cidade, reserva_expira_em, servicos(nome, preco_padrao, preco)")
    .eq("id", id)
    .maybeSingle();

  if (!agendamento?.id) redirect("/app-cliente/agendamentos");

  const { data: vinculo } = await (supabaseAdmin as any)
    .from("clientes_auth")
    .select("id_cliente")
    .eq("id_cliente", agendamento.cliente_id)
    .eq("app_conta_id", session.idConta)
    .maybeSingle();

  if (!vinculo?.id_cliente) redirect("/app-cliente/agendamentos");

  const valor = Number(agendamento.sinal_valor || 0);
  if (!valor || !agendamento.sinal_pix_chave) {
    redirect("/app-cliente/agendamentos");
  }

  const servico = agendamento.servicos as
    | { nome?: string | null; preco_padrao?: number | null; preco?: number | null }
    | null;
  const valorTotal = Number(servico?.preco_padrao ?? servico?.preco ?? 0);
  const payload = buildPixPayload({
    chave: String(agendamento.sinal_pix_chave || ""),
    nomeRecebedor: String(agendamento.sinal_pix_recebedor || "SalaoPremium"),
    cidade: String(agendamento.sinal_pix_cidade || "Brasil"),
    valor,
    descricao: "Sinal de agendamento",
    txid: String(agendamento.id).replace(/-/g, "").slice(0, 25),
  });
  const qrCode = await QRCode.toDataURL(payload, { margin: 1, width: 280 });

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950">
      <div className="mx-auto max-w-xl overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <div className="border-b border-zinc-100 p-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">
            Horário pré-reservado
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-[-0.04em]">
            Pague o sinal pelo Pix
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Seu horário fica reservado até o prazo indicado. Depois do pagamento,
            envie o comprovante para o salão confirmar.
          </p>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-zinc-50 p-3">
              <div className="text-xs font-bold text-zinc-500">Serviço</div>
              <div className="mt-1 text-sm font-black">{servico?.nome || "Serviço"}</div>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-3">
              <div className="text-xs font-bold text-zinc-500">Atendimento</div>
              <div className="mt-1 text-sm font-black">
                {String(agendamento.data || "").slice(0, 10)} às {String(agendamento.hora_inicio || "").slice(0, 5)}
              </div>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-3">
              <div className="text-xs font-bold text-zinc-500">Valor total</div>
              <div className="mt-1 text-sm font-black">{formatCurrency(valorTotal)}</div>
            </div>
            <div className="rounded-2xl bg-amber-50 p-3">
              <div className="text-xs font-bold text-amber-700">Sinal</div>
              <div className="mt-1 text-lg font-black text-amber-950">{formatCurrency(valor)}</div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-4 text-center">
            <img src={qrCode} alt="QR Code Pix do sinal" className="mx-auto h-64 w-64" />
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-zinc-500">
              <Copy size={14} />
              Pix copia e cola
            </div>
            <p className="break-all text-xs leading-5 text-zinc-700">{payload}</p>
          </div>

          <form action={enviarComprovanteSinalAction}>
            <input type="hidden" name="agendamento" value={String(agendamento.id)} />
            <button
              type="submit"
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-base font-black text-white shadow-sm transition hover:bg-emerald-700"
            >
              <MessageCircle size={20} />
              Enviar comprovante para o salão
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
