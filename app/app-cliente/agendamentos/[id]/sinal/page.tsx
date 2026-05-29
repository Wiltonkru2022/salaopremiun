import QRCode from "qrcode";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Scissors, WalletCards } from "lucide-react";
import ClientSignalReceiptForm from "@/components/client-app/ClientSignalReceiptForm";
import { requireClienteAppContext } from "@/lib/client-context.server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildPixPayload } from "@/lib/pix/brcode";

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
    .select("id, cliente_id, id_salao, data, hora_inicio, status, sinal_valor, sinal_percentual, sinal_pix_chave, sinal_pix_recebedor, sinal_pix_cidade, reserva_expira_em, servicos(nome, preco_padrao, preco), profissionais(nome, nome_exibicao)")
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
  const profissional = agendamento.profissionais as
    | { nome?: string | null; nome_exibicao?: string | null }
    | null;
  const profissionalNome =
    profissional?.nome_exibicao || profissional?.nome || "Profissional";
  const valorTotal = Number(servico?.preco_padrao ?? servico?.preco ?? 0);
  const payload = buildPixPayload({
    chave: String(agendamento.sinal_pix_chave || ""),
    nomeRecebedor: String(agendamento.sinal_pix_recebedor || "SalaoPremium"),
    cidade: String(agendamento.sinal_pix_cidade || "Brasil"),
    valor,
    descricao: "Sinal de agendamento",
    txid: String(agendamento.id).replace(/-/g, "").slice(0, 25),
  });
  await QRCode.toDataURL(payload, { margin: 1, width: 180 });

  return (
    <main className="min-h-dvh bg-white px-5 pb-32 pt-[calc(env(safe-area-inset-top)+1.25rem)] text-zinc-950">
      <div className="mx-auto max-w-md">
        <header className="grid grid-cols-[44px_1fr] gap-3">
          <Link
            href="/app-cliente/agendamentos"
            aria-label="Voltar"
            className="mt-1 flex h-11 w-11 items-center justify-center rounded-full text-zinc-950"
          >
            <ArrowLeft size={30} />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-[-0.04em]">
              Enviar comprovante
            </h1>
            <p className="mt-4 text-[1.05rem] leading-7 text-zinc-500">
              Envie o comprovante do pagamento do sinal para o salão confirmar
              seu horário.
            </p>
          </div>
        </header>

        <section className="mt-10 rounded-[1.5rem] border border-zinc-200 bg-white p-6 shadow-[0_14px_35px_rgba(15,23,42,0.04)]">
          <div className="grid grid-cols-[56px_1fr] gap-x-4 gap-y-8">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
              <CalendarDays size={24} />
            </span>
            <div>
              <p className="text-sm font-bold text-zinc-500">Atendimento</p>
              <p className="mt-1 text-lg font-black">
                {String(agendamento.data || "").slice(0, 10)} às{" "}
                {String(agendamento.hora_inicio || "").slice(0, 5)}
              </p>
            </div>

            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
              <Scissors size={24} />
            </span>
            <div>
              <p className="text-sm font-bold text-zinc-500">Serviço</p>
              <p className="mt-1 text-lg font-black">
                {servico?.nome || "Serviço"}
              </p>
              <p className="mt-1 text-sm font-semibold text-zinc-500">
                Profissional: {profissionalNome}
              </p>
            </div>

            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
              <WalletCards size={24} />
            </span>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-zinc-500">Sinal</p>
                <p className="mt-1 text-lg font-black">{formatCurrency(valor)}</p>
              </div>
              <div className="border-l border-zinc-200 pl-6">
                <p className="text-sm text-zinc-500">Valor total</p>
                <p className="mt-1 text-lg font-black">
                  {formatCurrency(valorTotal)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-[1.5rem] border border-emerald-100 bg-emerald-50/50 p-5">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-emerald-700">
            Recebedor
          </p>
          <p className="mt-2 text-xl font-black">
            {String(agendamento.sinal_pix_recebedor || "SalaoPremium")}
          </p>
          <p className="mt-2 break-words text-base font-semibold text-zinc-700">
            Chave Pix: {String(agendamento.sinal_pix_chave || "")}
          </p>
        </section>

        <section className="mt-9">
          <h2 className="text-2xl font-black tracking-[-0.04em]">
            Comprovante de pagamento
          </h2>
          <p className="mt-3 text-lg leading-7 text-zinc-500">
            Envie uma imagem ou PDF do comprovante da transferência Pix.
          </p>

          <ClientSignalReceiptForm agendamentoId={String(agendamento.id)} />
        </section>
      </div>
    </main>
  );
}
