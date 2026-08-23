"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, LoaderCircle } from "lucide-react";

type Recarga = {
  id: string;
  status: string;
  valorCentavos: number;
  pagoEm: string | null;
  creditadoEm: string | null;
  erro: string | null;
  criadoEm: string;
  atualizadoEm: string;
};

type Payload = {
  ok: boolean;
  saldoCentavos?: number;
  recargas?: Recarga[];
};

function money(value: number) {
  return (value / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const visual = {
  pendente: {
    title: "Aguardando pagamento",
    description: "O PIX foi gerado, mas o pagamento ainda nao foi confirmado. O saldo so entra depois da confirmacao.",
    className: "border-amber-200 bg-amber-50 text-amber-900",
    Icon: Clock3,
  },
  processando: {
    title: "Pagamento confirmado — creditando saldo",
    description: "Recebemos a confirmacao do pagamento. Aguarde alguns instantes enquanto os creditos sao liberados.",
    className: "border-sky-200 bg-sky-50 text-sky-900",
    Icon: LoaderCircle,
  },
  pago: {
    title: "Creditos adicionados com sucesso",
    description: "A recarga foi confirmada e o valor ja esta disponivel para os envios do WhatsApp.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
    Icon: CheckCircle2,
  },
  falhou: {
    title: "Pagamento confirmado, mas o credito nao foi concluido",
    description: "Nao faca outro pagamento. O saldo ainda nao foi liberado; se a mensagem persistir, entre em contato com o suporte.",
    className: "border-rose-200 bg-rose-50 text-rose-900",
    Icon: AlertCircle,
  },
  expirado: {
    title: "Cobranca expirada",
    description: "Esse pagamento nao foi concluido dentro do prazo. Gere uma nova recarga se ainda quiser adicionar creditos.",
    className: "border-zinc-200 bg-zinc-50 text-zinc-800",
    Icon: AlertCircle,
  },
  cancelado: {
    title: "Cobranca cancelada",
    description: "Essa recarga foi cancelada e nenhum credito foi adicionado.",
    className: "border-zinc-200 bg-zinc-50 text-zinc-800",
    Icon: AlertCircle,
  },
} as const;

export default function WhatsappRecargaStatusBanner() {
  const [payload, setPayload] = useState<Payload | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      try {
        const response = await fetch("/api/whatsapp-creditos/recargas/status", {
          cache: "no-store",
        });
        const next = (await response.json().catch(() => null)) as Payload | null;
        if (!cancelled && response.ok && next?.ok) setPayload(next);
      } catch {
        // O banner e auxiliar; falha de consulta nao bloqueia o painel.
      }

      if (!cancelled) timer = setTimeout(load, 5000);
    }

    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const latest = useMemo(() => payload?.recargas?.[0] || null, [payload]);
  if (!latest) return null;

  const config = visual[latest.status as keyof typeof visual] || visual.pendente;
  const Icon = config.Icon;

  return (
    <div className={`rounded-lg border px-4 py-3 ${config.className}`} role="status" aria-live="polite">
      <div className="flex items-start gap-3">
        <Icon
          size={18}
          className={latest.status === "processando" ? "mt-0.5 animate-spin" : "mt-0.5"}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong className="text-sm font-black">{config.title}</strong>
            <span className="text-sm font-black">{money(latest.valorCentavos)}</span>
          </div>
          <p className="mt-1 text-xs leading-5 opacity-80">{config.description}</p>
          {latest.status === "falhou" && latest.erro ? (
            <p className="mt-1 text-[11px] leading-4 opacity-70">Referencia tecnica registrada para o suporte.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
