"use client";

import { type ReactNode, useState } from "react";
import { CreditCard, ReceiptText, WalletCards } from "lucide-react";
import CaixaPagamentos from "@/components/caixa/CaixaPagamentos";
import CaixaResumo from "@/components/caixa/CaixaResumo";
import CaixaSessaoPanel from "@/components/caixa/CaixaSessaoPanel";
import type {
  CaixaMovimentacao,
  CaixaMovimentacaoTipo,
  CaixaSessao,
} from "@/lib/caixa/sessaoCaixa";
import type {
  ComandaDetalhe,
  ComandaPagamento,
  ConfigCaixaSalao,
  ProfissionalResumo,
} from "@/components/caixa/types";

type SidebarTab = "receber" | "venda" | "sessao";

type Props = {
  comandaSelecionada: ComandaDetalhe | null;
  configCaixa: ConfigCaixaSalao | null;
  pagamentos: ComandaPagamento[];
  formaPagamento: string;
  setFormaPagamento: (value: string) => void;
  valorPagamento: string;
  setValorPagamento: (value: string) => void;
  parcelas: string;
  setParcelas: (value: string) => void;
  taxaPercentual: string;
  setTaxaPercentual: (value: string) => void;
  observacaoPagamento: string;
  setObservacaoPagamento: (value: string) => void;
  totalPago: number;
  faltaReceber: number;
  troco: number;
  descontoInput: string;
  setDescontoInput: (value: string) => void;
  acrescimoInput: string;
  setAcrescimoInput: (value: string) => void;
  saving: boolean;
  podeEditarCaixa: boolean;
  podeGerenciarPagamentos: boolean;
  onSalvarResumo: () => void;
  onAdicionarPagamento: () => void;
  onRemoverPagamento: (idPagamento: string) => void;
  sessao: CaixaSessao | null;
  movimentacoes: CaixaMovimentacao[];
  schemaReady: boolean;
  schemaError?: string;
  profissionais: ProfissionalResumo[];
  podeOperarCaixa: boolean;
  onAbrirCaixa: (payload: {
    valorAbertura: number;
    observacoes: string;
  }) => void;
  onFecharCaixa: (payload: {
    valorFechamento: number;
    observacoes: string;
  }) => void;
  onLancamento: (payload: {
    tipo: CaixaMovimentacaoTipo;
    valor: number;
    descricao: string;
    idProfissional?: string | null;
  }) => void;
};

export default function CaixaSidebar({
  comandaSelecionada,
  configCaixa,
  pagamentos,
  formaPagamento,
  setFormaPagamento,
  valorPagamento,
  setValorPagamento,
  parcelas,
  setParcelas,
  taxaPercentual,
  setTaxaPercentual,
  observacaoPagamento,
  setObservacaoPagamento,
  totalPago,
  faltaReceber,
  troco,
  descontoInput,
  setDescontoInput,
  acrescimoInput,
  setAcrescimoInput,
  saving,
  podeEditarCaixa,
  podeGerenciarPagamentos,
  onSalvarResumo,
  onAdicionarPagamento,
  onRemoverPagamento,
  sessao,
  movimentacoes,
  schemaReady,
  schemaError,
  profissionais,
  podeOperarCaixa,
  onAbrirCaixa,
  onFecharCaixa,
  onLancamento,
}: Props) {
  const [tab, setTab] = useState<SidebarTab>("receber");
  const caixaAberto = schemaReady && sessao?.status === "aberto";

  return (
    <aside className="w-full min-h-0 xl:h-full xl:max-w-[456px] xl:min-w-[456px]">
      <div className="flex h-full min-h-0 flex-col rounded-[34px] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(250,251,255,0.96)_100%)] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.09)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Operacao do caixa
            </div>
            <h2 className="mt-2 text-[2rem] font-semibold text-slate-900">
              {comandaSelecionada ? `Comanda #${comandaSelecionada.numero}` : "Painel do caixa"}
            </h2>
            <p className="mt-1 max-w-[26rem] text-sm leading-6 text-zinc-500">
              Recebimento, resumo da venda e sessao do caixa em um painel fixo e mais facil de operar.
            </p>
          </div>

          <span
            className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase ${
              caixaAberto
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-zinc-200 bg-zinc-100 text-zinc-600"
            }`}
          >
            {caixaAberto ? "Caixa aberto" : "Caixa fechado"}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 rounded-[24px] border border-zinc-200/80 bg-zinc-50/85 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
          <SidebarTabButton
            active={tab === "receber"}
            icon={<CreditCard size={15} />}
            label="Receber"
            onClick={() => setTab("receber")}
          />
          <SidebarTabButton
            active={tab === "venda"}
            icon={<ReceiptText size={15} />}
            label="Venda"
            onClick={() => setTab("venda")}
          />
          <SidebarTabButton
            active={tab === "sessao"}
            icon={<WalletCards size={15} />}
            label="Sessao"
            onClick={() => setTab("sessao")}
          />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <MiniInfoCard label="Total pago" value={formatMoney(totalPago)} />
          <MiniInfoCard
            label="Falta receber"
            value={formatMoney(faltaReceber)}
            tone={faltaReceber > 0 ? "amber" : "emerald"}
          />
          <MiniInfoCard label="Troco" value={formatMoney(troco)} />
        </div>

        <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tab === "receber" ? (
            <CaixaPagamentos
              comandaSelecionada={comandaSelecionada}
              repassaTaxaCliente={Boolean(configCaixa?.repassa_taxa_cliente)}
              pagamentos={pagamentos}
              formaPagamento={formaPagamento}
              setFormaPagamento={setFormaPagamento}
              valorPagamento={valorPagamento}
              setValorPagamento={setValorPagamento}
              parcelas={parcelas}
              setParcelas={setParcelas}
              taxaPercentual={taxaPercentual}
              setTaxaPercentual={setTaxaPercentual}
              observacaoPagamento={observacaoPagamento}
              setObservacaoPagamento={setObservacaoPagamento}
              totalPago={totalPago}
              faltaReceber={faltaReceber}
              troco={troco}
              saving={saving || !podeGerenciarPagamentos}
              onAdicionarPagamento={onAdicionarPagamento}
              onRemoverPagamento={onRemoverPagamento}
              showRulesCard={false}
            />
          ) : null}

          {tab === "venda" ? (
            <div className="space-y-4">
              <CaixaResumo
                comandaSelecionada={comandaSelecionada}
                descontoInput={descontoInput}
                acrescimoInput={acrescimoInput}
                setDescontoInput={setDescontoInput}
                setAcrescimoInput={setAcrescimoInput}
                onSalvar={onSalvarResumo}
                saving={saving || !podeEditarCaixa}
              />

              <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="text-sm font-semibold text-zinc-900">
                  O que conferir antes de finalizar
                </div>
                <div className="mt-3 space-y-2 text-sm leading-6 text-zinc-500">
                  <p>Confirme se os itens da comanda estao certos.</p>
                  <p>Veja se desconto e acrescimo batem com a venda.</p>
                  <p>Feche a comanda somente quando a falta a receber estiver zerada.</p>
                </div>
              </div>
            </div>
          ) : null}

          {tab === "sessao" ? (
            <CaixaSessaoPanel
              sessao={sessao}
              movimentacoes={movimentacoes}
              schemaReady={schemaReady}
              schemaError={schemaError}
              profissionais={profissionais}
              saving={saving || !podeOperarCaixa}
              onAbrirCaixa={onAbrirCaixa}
              onFecharCaixa={onFecharCaixa}
              onLancamento={onLancamento}
            />
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function SidebarTabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-[18px] px-3 py-3 text-sm font-semibold transition ${
        active
          ? "bg-zinc-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]"
          : "bg-transparent text-zinc-600 hover:bg-white hover:text-zinc-900"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function MiniInfoCard({
  label,
  value,
  tone = "zinc",
}: {
  label: string;
  value: string;
  tone?: "amber" | "emerald" | "zinc";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : "border-zinc-200 bg-white text-zinc-900";

  return (
    <div className={`rounded-[22px] border px-3 py-3 ${toneClass}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-current/60">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold">{value}</div>
    </div>
  );
}

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
