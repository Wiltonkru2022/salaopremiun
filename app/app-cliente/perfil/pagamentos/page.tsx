import Link from "next/link";
import { ArrowLeft, ReceiptText } from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import { listClienteAppReceipts } from "@/lib/client-app/queries";
import { requireClienteAppContext } from "@/lib/client-context.server";

export const metadata = {
  title: "Pagamentos | Salão Premium",
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value: string | null) {
  if (!value) return "Data em atualização";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function ClienteProfilePaymentsPage() {
  const session = await requireClienteAppContext();
  const receipts = await listClienteAppReceipts({ idConta: session.idConta });

  return (
    <ClientAppFrame title="Pagamentos" subtitle="Recibos reais dos salões.">
      <section className="mx-auto max-w-3xl px-4 py-4 md:px-6">
        <Link
          href="/app-cliente/perfil"
          className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-950 shadow-sm"
          aria-label="Voltar"
        >
          <ArrowLeft size={24} />
        </Link>

        <h1 className="text-3xl font-black tracking-[-0.04em] text-zinc-950">
          Seus recibos
        </h1>
        <p className="mt-2 text-base leading-7 text-zinc-500">
          Tudo que o salão finalizar no caixa aparece aqui para você consultar.
        </p>

        {receipts.length ? (
          <div className="mt-7 space-y-3">
            {receipts.map((receipt) => (
              <article
                key={receipt.id}
                className="rounded-[1.4rem] border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                      Recibo #{receipt.numero || receipt.id.slice(0, 6)}
                    </div>
                    <h2 className="mt-1 truncate text-lg font-black text-zinc-950">
                      {receipt.salaoNome}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      {formatDate(receipt.data)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xl font-black text-zinc-950">
                      {formatCurrency(receipt.total)}
                    </div>
                    <div className="mt-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold capitalize text-zinc-600">
                      {receipt.status}
                    </div>
                  </div>
                </div>

                {receipt.itens ? (
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-600">
                    {receipt.itens.replaceAll("|", ", ")}
                  </p>
                ) : null}

                {receipt.formasPagamento ? (
                  <div className="mt-3 text-xs font-semibold text-zinc-500">
                    Pagamento: {receipt.formasPagamento.replaceAll("|", ", ")}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-[2rem] border border-zinc-200 bg-zinc-50 text-zinc-300">
              <ReceiptText size={54} />
            </div>
            <h2 className="text-2xl font-black text-zinc-800">
              Nenhum recibo ainda
            </h2>
            <p className="mt-3 max-w-md text-base leading-7 text-zinc-500">
              Quando uma comanda for fechada no caixa, o recibo aparece aqui.
            </p>
          </div>
        )}
      </section>
    </ClientAppFrame>
  );
}
