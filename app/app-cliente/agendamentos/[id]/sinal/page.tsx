import QRCode from "qrcode";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  FileImage,
  ImageIcon,
  Scissors,
  Send,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
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

        <section className="mt-9">
          <h2 className="text-2xl font-black tracking-[-0.04em]">
            Comprovante de pagamento
          </h2>
          <p className="mt-3 text-lg leading-7 text-zinc-500">
            Envie uma imagem ou PDF do comprovante da transferência Pix.
          </p>

          <form action={enviarComprovanteSinalAction} className="mt-7 space-y-8">
            <input type="hidden" name="agendamento" value={String(agendamento.id)} />
            <label className="flex min-h-72 flex-col items-center justify-center rounded-[1.4rem] border border-dashed border-zinc-300 px-5 py-8 text-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <FileImage size={34} />
              </span>
              <span className="mt-6 text-xl font-black">
                Adicionar comprovante
              </span>
              <span className="mt-2 text-base text-zinc-500">
                Arraste ou selecione um arquivo
              </span>
              <span className="mt-7 flex h-16 w-full items-center justify-center gap-3 rounded-2xl border border-zinc-200 text-lg font-bold text-emerald-600">
                <ImageIcon size={26} />
                Selecionar da galeria
              </span>
              <input
                type="file"
                name="comprovante"
                accept="image/*,application/pdf"
                className="sr-only"
              />
            </label>

            <div className="flex gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5 text-emerald-950">
              <ShieldCheck size={28} className="shrink-0 text-emerald-600" />
              <div>
                <p className="text-lg font-semibold">Seus dados estão protegidos</p>
                <p className="mt-1 text-base leading-7 text-zinc-600">
                  Utilizamos criptografia para manter suas informações seguras.
                </p>
              </div>
            </div>

            <button
              type="submit"
              className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 text-xl font-black text-white shadow-[0_12px_30px_rgba(5,150,105,0.25)] transition hover:bg-emerald-700"
            >
              <Send size={27} />
              Enviar comprovante
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
