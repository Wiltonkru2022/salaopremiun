"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  CreditCard,
  MessageCircle,
  ReceiptText,
  Send,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import {
  PainelButton,
  PainelPageHeader,
  PainelStatusBadge,
  PainelSurface,
} from "@/components/painel-ui";
import type {
  WhatsAppCreditosPainelData,
  WhatsAppCreditoStatus,
  WhatsAppMovimentacaoPainel,
} from "@/services/whatsappCreditosService";

type CheckoutState = {
  checkoutId: string;
  paymentId: string;
  billingType: "PIX" | "BOLETO" | "CREDIT_CARD";
  valorCentavos: number;
  invoiceUrl: string | null;
  bankSlipUrl: string | null;
  pixCopiaCola: string | null;
  qrCodeBase64: string | null;
  reused?: boolean;
} | null;

const PRESET_AMOUNTS = [2000, 5000, 10000, 20000];

const statusTone: Record<WhatsAppCreditoStatus, "success" | "warning" | "danger" | "default"> = {
  ativo: "success",
  configuracao_pendente: "warning",
  saldo_baixo: "warning",
  sem_saldo: "danger",
};

function formatMoney(valueCentavos: number) {
  return (valueCentavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value?: string | null) {
  if (!value) return "Ainda nao houve";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Ainda nao houve";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function movementTitle(item: WhatsAppMovimentacaoPainel) {
  if (item.descricao) return item.descricao;
  if (item.tipo === "recarga") return "Recarga de creditos";
  if (item.tipo === "consumo") return "Envio WhatsApp";
  if (item.tipo === "estorno") return "Estorno automatico";
  return "Ajuste administrativo";
}

function parseCustomCents(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(",", ".");
  const amount = Number(normalized || 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

function isCheckoutPayload(payload: unknown): payload is NonNullable<CheckoutState> {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      "checkoutId" in payload &&
      "paymentId" in payload &&
      "valorCentavos" in payload
  );
}

function getPayloadError(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("error" in payload)) return null;
  const error = (payload as { error?: unknown }).error;
  return typeof error === "string" ? error : null;
}

export default function WhatsAppCreditosClient({
  data,
}: {
  data: WhatsAppCreditosPainelData;
}) {
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(PRESET_AMOUNTS[1]);
  const [customAmount, setCustomAmount] = useState("");
  const [checkout, setCheckout] = useState<CheckoutState>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const customCents = useMemo(() => parseCustomCents(customAmount), [customAmount]);
  const rechargeAmount = customAmount.trim() ? customCents : selectedAmount;

  function openExtract() {
    document.getElementById("whatsapp-extrato")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function createCheckout() {
    setError(null);
    setCopied(false);

    startTransition(async () => {
      try {
        const response = await fetch("/api/whatsapp-creditos/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-idempotency-key": `whatsapp-creditos:${rechargeAmount}:${crypto.randomUUID()}`,
          },
          body: JSON.stringify({
            valorCentavos: rechargeAmount,
            billingType: "PIX",
          }),
        });

        const payload = (await response.json().catch(() => null)) as unknown;

        if (!response.ok || !isCheckoutPayload(payload)) {
          throw new Error(getPayloadError(payload) || "Nao foi possivel gerar a recarga.");
        }

        setCheckout(payload);
      } catch (checkoutError) {
        setError(
          checkoutError instanceof Error
            ? checkoutError.message
            : "Nao foi possivel gerar a recarga."
        );
      }
    });
  }

  async function copyPix() {
    if (!checkout?.pixCopiaCola) return;
    try {
      await navigator.clipboard.writeText(checkout.pixCopiaCola);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Nao foi possivel copiar o PIX agora.");
    }
  }

  return (
    <div className="space-y-4">
      <PainelPageHeader
        eyebrow="WhatsApp"
        title="WhatsApp e Creditos"
        description="Envie confirmacoes, lembretes e mensagens aos seus clientes com controle total de gastos."
        actions={
          <>
            <PainelStatusBadge tone={statusTone[data.status]} className="gap-1.5">
              {data.status === "ativo" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              {data.statusLabel}
            </PainelStatusBadge>
          </>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <PainelSurface className="overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="border-b border-zinc-200 p-5 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                <Wallet size={15} />
                Saldo WhatsApp atual
              </div>
              <div className="mt-3 text-4xl font-black tracking-normal text-zinc-950">
                {formatMoney(data.resumo.saldoCentavos)}
              </div>
              <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
                Saldo disponivel para envios pagos pelo WhatsApp.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <PainelButton type="button" onClick={() => setRechargeOpen(true)}>
                  <CreditCard size={16} />
                  Adicionar creditos
                </PainelButton>
                <PainelButton type="button" variant="secondary" onClick={openExtract}>
                  <ReceiptText size={16} />
                  Ver extrato
                </PainelButton>
              </div>
            </div>

            <div className="grid gap-2 p-5 sm:grid-cols-2">
              <Metric label="Gasto em 7 dias" value={formatMoney(data.resumo.gasto7dCentavos)} />
              <Metric label="Gasto no mes" value={formatMoney(data.resumo.gastoMesCentavos)} />
              <Metric label="Mensagens no mes" value={String(data.resumo.mensagensMes)} />
              <Metric label="Mensagens pagas" value={String(data.resumo.mensagensPagasMes)} />
              <Metric label="Ultima recarga" value={formatDate(data.resumo.ultimaRecargaEm)} className="sm:col-span-2" />
            </div>
          </div>
        </PainelSurface>

        <PainelSurface className="p-5">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
            <ShieldCheck size={15} />
            Status da integracao
          </div>
          <h2 className="mt-2 text-xl font-black text-zinc-950">{data.statusLabel}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">{data.statusDescription}</p>

          {data.recargasPendentes.length ? (
            <div className="mt-4 space-y-2">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                Pagamentos pendentes
              </div>
              {data.recargasPendentes.map((recarga) => (
                <div
                  key={recarga.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
                >
                  <span className="font-bold text-amber-900">
                    {formatMoney(recarga.valorCentavos)}
                  </span>
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-amber-700">
                    {recarga.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-500">
              Nenhuma recarga pendente no momento.
            </div>
          )}
        </PainelSurface>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <PainelSurface className="p-5">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
            <MessageCircle size={15} />
            Quanto custa cada mensagem?
          </div>
          <div className="mt-4 divide-y divide-zinc-100">
            {data.tarifas.map((tarifa) => (
              <div key={tarifa.id} className="grid gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="text-sm font-black text-zinc-950">{tarifa.nome}</div>
                  <div className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">
                    {tarifa.descricao}
                  </div>
                </div>
                <div className="text-left text-lg font-black text-zinc-950 sm:text-right">
                  {formatMoney(tarifa.precoVendaCentavos)}
                </div>
              </div>
            ))}
          </div>
        </PainelSurface>

        <PainelSurface className="overflow-hidden">
          <div className="border-b border-zinc-200 p-5">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
              <Send size={15} />
              Modelos de mensagem
            </div>
            <h2 className="mt-2 text-xl font-black text-zinc-950">
              Templates aprovados e disponiveis
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-[11px] font-black uppercase tracking-[0.14em] text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Nome do modelo</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Idioma</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ultima edicao</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.templates.length ? (
                  data.templates.map((template) => (
                    <tr key={template.id} className="align-top">
                      <td className="max-w-[260px] px-4 py-3">
                        <div className="font-black text-zinc-950">{template.nome}</div>
                        <div className="mt-1 line-clamp-1 text-xs text-zinc-500">
                          {template.conteudo}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-zinc-700">{template.categoria}</td>
                      <td className="px-4 py-3 text-zinc-600">Portuguese (BR)</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">
                          {template.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{formatDate(template.criadoEm)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-sm text-zinc-500" colSpan={5}>
                      Nenhum modelo cadastrado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </PainelSurface>
      </section>

      <PainelSurface id="whatsapp-extrato" className="overflow-hidden">
        <div className="border-b border-zinc-200 p-5">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
            Extrato visual
          </div>
          <h2 className="mt-2 text-xl font-black text-zinc-950">
            Ultimas movimentacoes
          </h2>
        </div>
        <div className="divide-y divide-zinc-100">
          {data.movimentacoes.length ? (
            data.movimentacoes.map((item) => (
              <div key={item.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="font-black text-zinc-950">{movementTitle(item)}</div>
                  <div className="mt-1 text-xs leading-5 text-zinc-500">
                    {formatDate(item.criadoEm)}
                    {item.categoria ? ` | ${item.categoria}` : ""}
                  </div>
                </div>
                <div className={item.valorCentavos >= 0 ? "font-black text-emerald-700" : "font-black text-rose-700"}>
                  {item.valorCentavos >= 0 ? "+" : "-"}
                  {formatMoney(Math.abs(item.valorCentavos))}
                </div>
              </div>
            ))
          ) : (
            <div className="px-5 py-8 text-sm text-zinc-500">
              Nenhuma movimentacao registrada ainda.
            </div>
          )}
        </div>
      </PainelSurface>

      {rechargeOpen ? (
        <div className="fixed inset-0 z-[520] flex items-center justify-center bg-zinc-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-5">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                  Recarga WhatsApp
                </div>
                <h2 className="mt-2 text-xl font-black text-zinc-950">
                  Adicionar creditos
                </h2>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  Escolha o valor e gere o PIX. O saldo entra quando o pagamento for confirmado.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRechargeOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[72vh] overflow-y-auto p-5">
              <div className="grid gap-2 sm:grid-cols-4">
                {PRESET_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => {
                      setSelectedAmount(amount);
                      setCustomAmount("");
                    }}
                    className={`rounded-lg border px-4 py-3 text-sm font-black transition ${
                      !customAmount.trim() && selectedAmount === amount
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
                    }`}
                  >
                    {formatMoney(amount)}
                  </button>
                ))}
              </div>

              <label className="mt-4 block">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                  Outro valor
                </span>
                <input
                  value={customAmount}
                  onChange={(event) => setCustomAmount(event.target.value)}
                  placeholder="Ex.: 75,00"
                  inputMode="decimal"
                  className="mt-2 h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-950 outline-none focus:border-zinc-950 focus:ring-4 focus:ring-zinc-100"
                />
              </label>

              <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                Valor selecionado: <strong className="text-zinc-950">{formatMoney(rechargeAmount)}</strong>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <PainelButton type="button" variant="secondary" onClick={() => setRechargeOpen(false)}>
                  Cancelar
                </PainelButton>
                <PainelButton type="button" onClick={createCheckout} loading={isPending}>
                  Gerar PIX
                </PainelButton>
              </div>

              {error ? (
                <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                  {error}
                </div>
              ) : null}

              {checkout ? (
                <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                    <CheckCircle2 size={14} />
                    PIX gerado
                  </div>
                  <div className="mt-2 text-lg font-black text-zinc-950">
                    {formatMoney(checkout.valorCentavos)}
                  </div>

                  {checkout.pixCopiaCola ? (
                    <div className="mt-3 rounded-lg border border-emerald-200 bg-white p-3">
                      <div className="break-all text-xs leading-5 text-zinc-600">
                        {checkout.pixCopiaCola}
                      </div>
                      <button
                        type="button"
                        onClick={copyPix}
                        className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-black text-zinc-800 transition hover:bg-zinc-50"
                      >
                        <Copy size={15} />
                        {copied ? "PIX copiado" : "Copiar PIX"}
                      </button>
                    </div>
                  ) : null}

                  {checkout.invoiceUrl ? (
                    <a
                      href={checkout.invoiceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-950 transition hover:bg-zinc-50"
                    >
                      Abrir fatura
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-zinc-200 bg-zinc-50 p-3 ${className || ""}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">
        {label}
      </div>
      <div className="mt-1 text-base font-black text-zinc-950">{value}</div>
    </div>
  );
}
