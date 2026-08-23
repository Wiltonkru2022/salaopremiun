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
  expiraEm: string | null;
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

function dateTime(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const visual = {
  pendente: {
    title: "Aguardando pagamento",
    description: "O PIX foi gerado e fica disponivel por 24 horas. O saldo entra somente depois da confirmacao do pagamento.",
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
    description: "Nao faca outro pagamento. O suporte consegue conferir o pagamento e reprocessar o credito com seguranca.",
    className: "border-rose-200 bg-rose-50 text-rose-900",
    Icon: AlertCircle,
  },
  expirado: {
    title: "PIX expirado",
    description: "As 24 horas de validade terminaram. Gere uma nova recarga para obter um novo PIX.",
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

      if (!cancelled) timer = setTimeout(load, 15000);
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
  const expiresLabel = latest.status === "pendente" ? dateTime(latest.expiraEm) : null;

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
          {expiresLabel ? (
            <p className="mt-1 text-[11px] font-bold leading-4 opacity-75">Valido ate {expiresLabel}.</p>
          ) : null}
          {latest.status === "falhou" && latest.erro ? (
            <p className="mt-1 text-[11px] leading-4 opacity-70">Referencia tecnica registrada para o suporte.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
