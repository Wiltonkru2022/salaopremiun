"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Copy, LoaderCircle, MessageSquareMore } from "lucide-react";

type PacoteRow = {
  id: string;
  nome: string;
  quantidadeCreditos: number;
  preco: number;
};

type CheckoutState = {
  pacoteId: string;
  paymentId: string;
  billingType: "PIX" | "BOLETO";
  valor: number;
  quantidadeCreditos: number;
  invoiceUrl: string | null;
  bankSlipUrl: string | null;
  pixCopiaCola: string | null;
  qrCodeBase64: string | null;
  reused?: boolean;
} | null;

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function WhatsAppPackagesCard({
  pacotes,
  saldoAtual,
  recursoAtivo,
  marketingLiberado,
  compraInicial,
}: {
  pacotes: PacoteRow[];
  saldoAtual: number;
  recursoAtivo: boolean;
  marketingLiberado: boolean;
  compraInicial: CheckoutState;
}) {
  const [checkout, setCheckout] = useState<CheckoutState>(compraInicial);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function comprarPacote(pacoteId: string) {
    setErro(null);
    setPendingId(pacoteId);

    startTransition(async () => {
      try {
        const response = await fetch("/api/marketing/whatsapp/pacotes/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-idempotency-key": `whatsapp:${pacoteId}:pix`,
          },
          body: JSON.stringify({
            pacoteId,
            billingType: "PIX",
          }),
        });

        const json = (await response.json()) as
          | (CheckoutState & { error?: never })
          | { error?: string };

        if (!response.ok) {
          throw new Error(json && "error" in json ? json.error : "Erro ao gerar checkout.");
        }

        if (json && "paymentId" in json) {
          setCheckout(json);
        }
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Erro ao gerar checkout.");
      } finally {
        setPendingId(null);
      }
    });
  }

  async function copiarPix() {
    if (!checkout?.pixCopiaCola) return;

    try {
      await navigator.clipboard.writeText(checkout.pixCopiaCola);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1800);
    } catch {
      setErro("Nao foi possivel copiar o PIX agora.");
    }
  }

  return (
    <section className="overflow-hidden rounded-[30px] border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 p-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          <MessageSquareMore size={14} />
          Pacotes de WhatsApp
        </div>
        <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.04em] text-zinc-950">
          Compre creditos e ative o envio comercial
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          O credito entra automaticamente no salao depois que o pagamento do PIX
          for confirmado no webhook.
        </p>
      </div>

      <div className="grid gap-3 border-b border-zinc-100 p-5 sm:grid-cols-3">
        <MiniStat label="Saldo atual" value={`${saldoAtual}`} />
        <MiniStat label="Recurso WhatsApp" value={recursoAtivo ? "Ativo" : "Inativo"} />
        <MiniStat
          label="Marketing no plano"
          value={marketingLiberado ? "Liberado" : "Limitado"}
        />
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-3">
        {pacotes.map((pacote) => {
          const isLoading = isPending && pendingId === pacote.id;

          return (
            <article
              key={pacote.id}
              className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Pacote
              </div>
              <h3 className="mt-2 font-display text-xl font-bold text-zinc-950">
                {pacote.nome}
              </h3>
              <div className="mt-3 text-3xl font-black tracking-[-0.05em] text-zinc-950">
                {pacote.quantidadeCreditos}
              </div>
              <div className="text-sm text-zinc-500">creditos de envio</div>
              <div className="mt-4 text-lg font-bold text-[var(--app-accent-strong)]">
                {formatMoney(pacote.preco)}
              </div>
              <button
                type="button"
                onClick={() => comprarPacote(pacote.id)}
                disabled={isLoading}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? <LoaderCircle size={16} className="animate-spin" /> : null}
                Comprar com PIX
              </button>
            </article>
          );
        })}
      </div>

      {checkout ? (
        <div className="border-t border-zinc-100 p-5">
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              <CheckCircle2 size={14} />
              Checkout {checkout.reused ? "reaproveitado" : "gerado"}
            </div>
            <h3 className="mt-2 text-xl font-bold">
              Pagamento pronto para ativar {checkout.quantidadeCreditos} credito(s)
            </h3>
            <p className="mt-2 text-sm text-emerald-800">
              Assim que o PIX for confirmado, o pacote entra no saldo do salao e o
              recurso WhatsApp fica habilitado automaticamente.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <MiniStat label="Payment ID" value={checkout.paymentId} />
              <MiniStat label="Valor" value={formatMoney(checkout.valor)} />
              <MiniStat label="Forma" value={checkout.billingType} />
            </div>

            {checkout.pixCopiaCola ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  PIX copia e cola
                </div>
                <div className="mt-2 break-all text-sm text-zinc-700">
                  {checkout.pixCopiaCola}
                </div>
                <button
                  type="button"
                  onClick={copiarPix}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
                >
                  <Copy size={15} />
                  {copiado ? "PIX copiado" : "Copiar PIX"}
                </button>
              </div>
            ) : null}

            {checkout.invoiceUrl ? (
              <a
                href={checkout.invoiceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-zinc-950 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
              >
                Abrir fatura
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {erro ? (
        <div className="border-t border-zinc-100 px-5 py-4 text-sm text-rose-700">
          {erro}
        </div>
      ) : null}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold text-zinc-950">{value}</div>
    </div>
  );
}
