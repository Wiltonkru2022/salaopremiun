"use client";

import { useMemo, useState } from "react";

function parseNumberInput(value: string) {
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function MarketingPriceSimulator() {
  const [quantidadeMensagens, setQuantidadeMensagens] = useState("300");
  const [custoPorMensagem, setCustoPorMensagem] = useState("0,18");
  const [cobrancaPorMensagem, setCobrancaPorMensagem] = useState("0,35");

  const resumo = useMemo(() => {
    const quantidade = Math.max(Math.round(parseNumberInput(quantidadeMensagens)), 0);
    const custoUnitario = parseNumberInput(custoPorMensagem);
    const precoUnitario = parseNumberInput(cobrancaPorMensagem);
    const custoTotal = quantidade * custoUnitario;
    const faturamento = quantidade * precoUnitario;
    const margem = faturamento - custoTotal;
    const margemPercentual =
      faturamento > 0 ? Number(((margem / faturamento) * 100).toFixed(1)) : 0;

    return {
      quantidade,
      custoTotal,
      faturamento,
      margem,
      margemPercentual,
    };
  }, [cobrancaPorMensagem, custoPorMensagem, quantidadeMensagens]);

  return (
    <section className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            WhatsApp comercial
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.04em] text-zinc-950">
            Simulador de cobranca por mensagem
          </h2>
        </div>

        <div className="rounded-full bg-[rgba(199,162,92,0.14)] px-3 py-1 text-xs font-semibold text-[var(--app-accent-strong)]">
          Pronto para comercializar
        </div>
      </div>

      <p className="mt-3 text-sm text-zinc-500">
        Ajuste o custo da operacao e o valor cobrado do cliente para montar sua
        oferta de disparo por mensagem.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Field
          label="Mensagens no lote"
          value={quantidadeMensagens}
          onChange={setQuantidadeMensagens}
          placeholder="300"
        />

        <Field
          label="Custo por mensagem"
          value={custoPorMensagem}
          onChange={setCustoPorMensagem}
          placeholder="0,18"
        />

        <Field
          label="Preco cobrado por mensagem"
          value={cobrancaPorMensagem}
          onChange={setCobrancaPorMensagem}
          placeholder="0,35"
        />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Metric label="Faturamento previsto" value={formatCurrency(resumo.faturamento)} />
        <Metric label="Custo operacional" value={formatCurrency(resumo.custoTotal)} />
        <Metric
          label="Margem estimada"
          value={`${formatCurrency(resumo.margem)} (${resumo.margemPercentual}%)`}
        />
      </div>

      <div className="mt-5 rounded-[24px] border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-600">
        <strong className="text-zinc-950">{resumo.quantidade}</strong> mensagem(ns)
        projetadas no lote atual. Use isso para montar combos mensais, recorrencia
        de retorno e campanhas sazonais com precificacao clara.
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-zinc-700">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
      />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
        {label}
      </div>
      <div className="mt-2 text-xl font-bold text-zinc-950">{value}</div>
    </div>
  );
}
