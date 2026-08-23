"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  MessageCircle,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  UserRoundCheck,
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

type AutomationKey =
  | "confirmacao_agendamento"
  | "lembrete_agendamento"
  | "agendamento_alterado"
  | "agendamento_cancelado"
  | "profissional_confirmado"
  | "pagamento_confirmado";

type AutomationPreferences = Record<AutomationKey, boolean>;

type AutomationItem = {
  key: AutomationKey;
  title: string;
  description: string;
  example: string;
  icon: typeof CalendarCheck;
};

const PRESET_AMOUNTS = [2000, 5000, 10000, 20000];

const AUTOMATIONS: AutomationItem[] = [
  {
    key: "confirmacao_agendamento",
    title: "Confirmação de agendamento",
    description: "Avisa a cliente assim que o horário for confirmado.",
    example: "Seu agendamento foi confirmado para a data e horário escolhidos.",
    icon: CalendarCheck,
  },
  {
    key: "lembrete_agendamento",
    title: "Lembrete de agendamento",
    description: "Lembra a cliente antes do horário marcado.",
    example: "Passando para lembrar do seu atendimento de hoje.",
    icon: Clock3,
  },
  {
    key: "agendamento_alterado",
    title: "Alteração de agendamento",
    description: "Avisa quando data, horário ou profissional forem alterados.",
    example: "Seu agendamento foi atualizado. Confira os novos dados.",
    icon: RefreshCw,
  },
  {
    key: "agendamento_cancelado",
    title: "Cancelamento de agendamento",
    description: "Informa a cliente quando um horário for cancelado.",
    example: "Seu agendamento foi cancelado. Você pode marcar um novo horário.",
    icon: X,
  },
  {
    key: "profissional_confirmado",
    title: "Profissional confirmado",
    description: "Confirma quem realizará o atendimento da cliente.",
    example: "O profissional do seu próximo atendimento está confirmado.",
    icon: UserRoundCheck,
  },
  {
    key: "pagamento_confirmado",
    title: "Pagamento confirmado",
    description: "Avisa a cliente quando o pagamento for confirmado.",
    example: "Recebemos a confirmação do seu pagamento.",
    icon: CheckCircle2,
  },
];

const DEFAULT_AUTOMATIONS: AutomationPreferences = {
  confirmacao_agendamento: true,
  lembrete_agendamento: true,
  agendamento_alterado: true,
  agendamento_cancelado: true,
  profissional_confirmado: true,
  pagamento_confirmado: true,
};

const statusTone: Record<
  WhatsAppCreditoStatus,
  "success" | "warning" | "danger" | "default"
> = {
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
  if (!value) return "Ainda não houve";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Ainda não houve";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function movementTitle(item: WhatsAppMovimentacaoPainel) {
  if (item.descricao) return item.descricao;
  if (item.tipo === "recarga") return "Recarga de créditos";
  if (item.tipo === "consumo") return "Envio WhatsApp";
  if (item.tipo === "estorno") return "Estorno automático";
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
  const [automations, setAutomations] =
    useState<AutomationPreferences>(DEFAULT_AUTOMATIONS);
  const [automationsLoading, setAutomationsLoading] = useState(true);
  const [automationError, setAutomationError] = useState<string | null>(null);
  const [savingAutomation, setSavingAutomation] = useState<AutomationKey | null>(null);
  const [isPending, startTransition] = useTransition();

  const customCents = useMemo(() => parseCustomCents(customAmount), [customAmount]);
  const rechargeAmount = customAmount.trim() ? customCents : selectedAmount;
  const visibleTarifas = useMemo(
    () =>
      data.tarifas.filter(
        (tarifa) =>
          tarifa.tipoInterno !== "codigo_verificacao" &&
          tarifa.tipoInterno !== "marketing" &&
          tarifa.categoriaMeta !== "authentication" &&
          tarifa.categoriaMeta !== "marketing"
      ),
    [data.tarifas]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadAutomations() {
      try {
        const response = await fetch("/api/whatsapp-creditos/automacoes", {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | { preferences?: AutomationPreferences; error?: string }
          | null;

        if (!response.ok || !payload?.preferences) {
          throw new Error(payload?.error || "Não foi possível carregar as mensagens automáticas.");
        }

        if (!cancelled) setAutomations(payload.preferences);
      } catch (loadError) {
        if (!cancelled) {
          setAutomationError(
            loadError instanceof Error
              ? loadError.message
              : "Não foi possível carregar as mensagens automáticas."
          );
        }
      } finally {
        if (!cancelled) setAutomationsLoading(false);
      }
    }

    void loadAutomations();
    return () => {
      cancelled = true;
    };
  }, []);

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
          throw new Error(getPayloadError(payload) || "Não foi possível gerar a recarga.");
        }

        setCheckout(payload);
      } catch (checkoutError) {
        setError(
          checkoutError instanceof Error
            ? checkoutError.message
            : "Não foi possível gerar a recarga."
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
      setError("Não foi possível copiar o PIX agora.");
    }
  }

  async function toggleAutomation(key: AutomationKey, enabled: boolean) {
    const previous = automations;
    setAutomationError(null);
    setSavingAutomation(key);
    setAutomations((current) => ({ ...current, [key]: enabled }));

    try {
      const response = await fetch("/api/whatsapp-creditos/automacoes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { preferences?: AutomationPreferences; error?: string }
        | null;

      if (!response.ok || !payload?.preferences) {
        throw new Error(payload?.error || "Não foi possível salvar esta preferência.");
      }

      setAutomations(payload.preferences);
    } catch (saveError) {
      setAutomations(previous);
      setAutomationError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível salvar esta preferência."
      );
    } finally {
      setSavingAutomation(null);
    }
  }

  return (
    <div className="space-y-4">
      <PainelPageHeader
        eyebrow="WhatsApp"
        title="WhatsApp e Créditos"
        description="Coloque créditos e escolha quais avisos o SalãoPremium deve enviar automaticamente aos seus clientes."
        actions={
          <PainelStatusBadge tone={statusTone[data.status]} className="gap-1.5">
            {data.status === "ativo" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {data.statusLabel}
          </PainelStatusBadge>
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
                Créditos disponíveis para os avisos enviados aos seus clientes.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <PainelButton type="button" onClick={() => setRechargeOpen(true)}>
                  <CreditCard size={16} />
                  Adicionar créditos
                </PainelButton>
                <PainelButton type="button" variant="secondary" onClick={openExtract}>
                  <ReceiptText size={16} />
                  Ver extrato
                </PainelButton>
              </div>
            </div>

            <div className="grid gap-2 p-5 sm:grid-cols-2">
              <Metric label="Gasto em 7 dias" value={formatMoney(data.resumo.gasto7dCentavos)} />
              <Metric label="Gasto no mês" value={formatMoney(data.resumo.gastoMesCentavos)} />
              <Metric label="Mensagens no mês" value={String(data.resumo.mensagensMes)} />
              <Metric label="Mensagens pagas" value={String(data.resumo.mensagensPagasMes)} />
              <Metric label="Última recarga" value={formatDate(data.resumo.ultimaRecargaEm)} className="sm:col-span-2" />
            </div>
          </div>
        </PainelSurface>

        <PainelSurface className="p-5">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
            <ShieldCheck size={15} />
            Status do WhatsApp
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

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <PainelSurface className="p-5">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
            <MessageCircle size={15} />
            Quanto custa cada aviso?
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Você vê somente os avisos usados pelo seu salão. Recursos internos do SalãoPremium não aparecem aqui.
          </p>
          <div className="mt-4 divide-y divide-zinc-100">
            {visibleTarifas.map((tarifa) => (
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
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
              <CheckCircle2 size={15} />
              Mensagens automáticas
            </div>
            <h2 className="mt-2 text-xl font-black text-zinc-950">
              Escolha quais avisos seus clientes recebem
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              O SalãoPremium cuida do envio. Você só precisa ativar ou desativar cada aviso.
            </p>
          </div>

          <div className="divide-y divide-zinc-100">
            {automationsLoading ? (
              <div className="px-5 py-8 text-sm text-zinc-500">Carregando preferências...</div>
            ) : (
              AUTOMATIONS.map((item) => {
                const Icon = item.icon;
                const enabled = automations[item.key];
                const saving = savingAutomation === item.key;

                return (
                  <div key={item.key} className="grid gap-4 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="flex min-w-0 gap-3">
                      <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${enabled ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-black text-zinc-950">{item.title}</div>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${enabled ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                            {enabled ? "Ativado" : "Desativado"}
                          </span>
                        </div>
                        <div className="mt-1 text-sm leading-6 text-zinc-500">{item.description}</div>
                        <details className="mt-2 text-xs text-zinc-500">
                          <summary className="cursor-pointer font-bold text-zinc-700">Ver exemplo</summary>
                          <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 leading-5">
                            {item.example}
                          </div>
                        </details>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      disabled={saving}
                      onClick={() => void toggleAutomation(item.key, !enabled)}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:cursor-wait disabled:opacity-60 ${enabled ? "bg-emerald-600" : "bg-zinc-300"}`}
                      aria-label={`${enabled ? "Desativar" : "Ativar"} ${item.title}`}
                    >
                      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${enabled ? "left-6" : "left-1"}`} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {automationError ? (
            <div className="border-t border-rose-100 bg-rose-50 px-5 py-3 text-sm font-bold text-rose-700">
              {automationError}
            </div>
          ) : null}
        </PainelSurface>
      </section>

      <PainelSurface id="whatsapp-extrato" className="overflow-hidden">
        <div className="border-b border-zinc-200 p-5">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
            Extrato
          </div>
          <h2 className="mt-2 text-xl font-black text-zinc-950">
            Últimas movimentações
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
              Nenhuma movimentação registrada ainda.
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
                  Adicionar créditos
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
