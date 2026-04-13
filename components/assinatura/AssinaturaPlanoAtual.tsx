import type { AssinaturaRow, SalaoRow } from "./types";
import {
  formatarData,
  formatarDataHora,
  formatarMoeda,
  getFormaPagamentoLabel,
  getStatusBadgeClass,
  getStatusLabel,
  isStatusTrial,
} from "./utils";

type Props = {
  assinatura: AssinaturaRow | null;
  salao: SalaoRow | null;
  planoAtualNome: string;
  valorAtual: number;
};

export default function AssinaturaPlanoAtual({
  assinatura,
  salao,
  planoAtualNome,
  valorAtual,
}: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-400">
          Plano atual
        </div>
        <div className="mt-3 text-2xl font-bold text-zinc-950">{planoAtualNome}</div>
        <p className="mt-1 text-sm text-zinc-500">
          {assinatura?.limite_profissionais != null
            ? `${assinatura.limite_profissionais} profissionais`
            : "Sem plano definido"}
        </p>
      </div>

      <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-400">
          Status
        </div>
        <div className="mt-3">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${getStatusBadgeClass(
              assinatura?.status
            )}`}
          >
            {getStatusLabel(assinatura?.status)}
          </span>
        </div>
        <p className="mt-3 text-sm text-zinc-500">
          Forma atual: {getFormaPagamentoLabel(assinatura?.forma_pagamento_atual)}
        </p>
      </div>

      <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-400">
          Vencimento / Trial
        </div>
        <div className="mt-3 text-lg font-bold text-zinc-950">
          {formatarData(
            isStatusTrial(assinatura?.status)
              ? assinatura?.trial_fim_em || assinatura?.vencimento_em
              : assinatura?.vencimento_em || assinatura?.trial_fim_em
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Início:{" "}
          {formatarData(
            isStatusTrial(assinatura?.status)
              ? assinatura?.trial_inicio_em
              : assinatura?.created_at
          )}
        </p>
      </div>

      <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-400">
          Salão
        </div>
        <div className="mt-3 text-lg font-bold text-zinc-950">{salao?.nome || "-"}</div>
        <p className="mt-1 text-sm text-zinc-500">ID: {salao?.id || "-"}</p>
      </div>

      <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-400">
          Limite profissionais
        </div>
        <div className="mt-3 text-2xl font-bold text-zinc-950">
          {assinatura?.limite_profissionais ?? 0}
        </div>
      </div>

      <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-400">
          Limite usuários
        </div>
        <div className="mt-3 text-2xl font-bold text-zinc-950">
          {assinatura?.limite_usuarios ?? 0}
        </div>
      </div>

      <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-400">
          Criado em
        </div>
        <div className="mt-3 text-lg font-bold text-zinc-950">
          {formatarDataHora(assinatura?.created_at || salao?.created_at)}
        </div>
      </div>

      <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-400">
          Valor mensal
        </div>
        <div className="mt-3 text-2xl font-bold text-zinc-950">
          {formatarMoeda(valorAtual)}
        </div>
      </div>
    </div>
  );
}