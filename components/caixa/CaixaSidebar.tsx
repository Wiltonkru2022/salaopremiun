"use client";

import { useState } from "react";
import CaixaPagamentos from "@/components/caixa/CaixaPagamentos";
import CaixaResumo from "@/components/caixa/CaixaResumo";
import CaixaSessaoPanel from "@/components/caixa/CaixaSessaoPanel";
import AppModal from "@/components/ui/AppModal";
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
import { formatCurrency, getJoinedName } from "@/components/caixa/utils";

type Props = {
  comandaSelecionada: ComandaDetalhe | null;
  pagamentosOpen: boolean;
  setPagamentosOpen: (value: boolean) => void;
  sessaoOpen: boolean;
  setSessaoOpen: (value: boolean) => void;
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
  totalCreditoGerado: number;
  faltaReceber: number;
  troco: number;
  creditoClienteDisponivel: number;
  descontoInput: string;
  setDescontoInput: (value: string) => void;
  acrescimoInput: string;
  setAcrescimoInput: (value: string) => void;
  saving: boolean;
  podeEditarCaixa: boolean;
  podeGerenciarPagamentos: boolean;
  onSalvarResumo: () => void;
  onAdicionarPagamento: (options?: {
    destinoExcedente?: "troco" | "credito_cliente";
  }) => Promise<void> | void;
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
  showPanel?: boolean;
};

export default function CaixaSidebar({
  comandaSelecionada,
  pagamentosOpen,
  setPagamentosOpen,
  sessaoOpen,
  setSessaoOpen,
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
  totalCreditoGerado,
  faltaReceber,
  troco,
  creditoClienteDisponivel,
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
  showPanel = true,
}: Props) {
  const [ajustesOpen, setAjustesOpen] = useState(false);
  const caixaAberto = schemaReady && sessao?.status === "aberto";
  const totalComanda = Number(comandaSelecionada?.total || 0);

  return (
    <>
      {showPanel ? (
        <aside className="w-full min-h-0">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_rgba(148,163,184,0.12)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Operacao
                </div>
                <div className="mt-1 text-2xl font-bold tracking-[-0.03em] text-slate-950">
                  Caixa
                </div>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  caixaAberto
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-zinc-200 bg-zinc-100 text-zinc-600"
                }`}
              >
                {caixaAberto ? "Aberto" : "Fechado"}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <SidebarInfo
                label="Cliente"
                value={
                  comandaSelecionada
                    ? getJoinedName(comandaSelecionada.clientes, "Sem cliente")
                    : "Selecione uma venda"
                }
              />
              <SidebarInfo
                label="Total da venda"
                value={comandaSelecionada ? formatCurrency(totalComanda) : "R$ 0,00"}
              />
              <SidebarInfo label="Total pago" value={formatCurrency(totalPago)} />
              <SidebarInfo label="Falta receber" value={formatCurrency(faltaReceber)} />
            </div>

            <button
              type="button"
              onClick={() => setAjustesOpen(true)}
              disabled={!comandaSelecionada || saving || !podeEditarCaixa}
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Acrescimo / desconto
            </button>
          </div>
        </aside>
      ) : null}

      <AppModal
        open={pagamentosOpen}
        onClose={() => setPagamentosOpen(false)}
        closeDisabled={saving}
        title={comandaSelecionada ? `Pagamento da comanda #${comandaSelecionada.numero}` : "Pagamento"}
        maxWidthClassName="max-w-[520px]"
        panelClassName="max-h-[calc(100dvh-2rem)]"
        headerClassName="px-5 py-4 sm:px-6 sm:py-5"
        bodyClassName="bg-white px-5 py-5 sm:px-6 sm:py-5"
      >
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
          totalCreditoGerado={totalCreditoGerado}
          faltaReceber={faltaReceber}
          troco={troco}
          creditoClienteDisponivel={creditoClienteDisponivel}
          saving={saving || !podeGerenciarPagamentos}
          onAdicionarPagamento={onAdicionarPagamento}
          onRemoverPagamento={onRemoverPagamento}
          onCancelar={() => setPagamentosOpen(false)}
        />
      </AppModal>

      <AppModal
        open={ajustesOpen}
        onClose={() => setAjustesOpen(false)}
        closeDisabled={saving}
        title="Acrescimo / desconto"
        description="Ajuste a comanda sem misturar com o fluxo de pagamento."
        eyebrow="Resumo financeiro"
        maxWidthClassName="max-w-3xl"
        panelClassName="max-h-[calc(100dvh-2rem)]"
        bodyClassName="bg-[#f7f8fb]"
      >
        <CaixaResumo
          comandaSelecionada={comandaSelecionada}
          descontoInput={descontoInput}
          acrescimoInput={acrescimoInput}
          setDescontoInput={setDescontoInput}
          setAcrescimoInput={setAcrescimoInput}
          onSalvar={onSalvarResumo}
          saving={saving || !podeEditarCaixa}
        />
      </AppModal>

      <AppModal
        open={sessaoOpen}
        onClose={() => setSessaoOpen(false)}
        closeDisabled={saving}
        title="Sessao do caixa"
        description="Abra, feche e movimente o caixa em uma area separada."
        eyebrow="Operacao da sessao"
        maxWidthClassName="max-w-6xl"
        panelClassName="max-h-[calc(100dvh-2rem)]"
        bodyClassName="bg-[#f7f8fb]"
      >
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
      </AppModal>
    </>
  );
}

function SidebarInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}
