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
}: Props) {
  const [ajustesOpen, setAjustesOpen] = useState(false);
  const caixaAberto = schemaReady && sessao?.status === "aberto";
  const totalComanda = Number(comandaSelecionada?.total || 0);
  const podeAjustarComanda =
    Boolean(comandaSelecionada) &&
    comandaSelecionada?.status !== "fechada" &&
    comandaSelecionada?.status !== "cancelada" &&
    podeEditarCaixa;
  const statusVenda = comandaSelecionada
    ? formatStatusVenda(comandaSelecionada.status)
    : "Sem venda";
  const statusVendaTone = getStatusVendaTone(comandaSelecionada?.status);

  return (
    <>
      <aside className="w-full min-h-0">
        <div className="flex h-full min-h-0 flex-col rounded-[24px] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(250,251,255,0.96)_100%)] p-2.5 shadow-[0_24px_80px_rgba(15,23,42,0.09)]">
        <div className="min-h-0 flex-1 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="space-y-2">
            <div className="rounded-[20px] border border-zinc-200 bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                    Operação do caixa
                  </div>
                  <h2 className="mt-0.5 text-[1.35rem] font-semibold leading-none text-slate-900">
                    Operação
                  </h2>
                </div>

                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${
                    caixaAberto
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-zinc-200 bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {caixaAberto ? "Caixa aberto" : "Caixa fechado"}
                </span>
              </div>

              <div className="mt-2 grid gap-2">
                <SidebarInfo
                  label="Cliente"
                  value={
                    comandaSelecionada
                      ? getJoinedName(comandaSelecionada.clientes, "Sem cliente")
                      : "Selecione uma venda"
                  }
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <SidebarInfo
                    label="Total da venda"
                    value={comandaSelecionada ? formatCurrency(totalComanda) : "R$ 0,00"}
                  />
                  <SidebarInfo
                    label="Status da venda"
                    value={statusVenda}
                    tone={statusVendaTone}
                  />
                </div>
              </div>

              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <MiniInfoCard label="Total pago" value={formatMoney(totalPago)} />
                <MiniInfoCard
                  label="Falta receber"
                  value={formatMoney(faltaReceber)}
                  tone={faltaReceber > 0 ? "amber" : "emerald"}
                />
                <MiniInfoCard label="Troco" value={formatMoney(troco)} />
              </div>

              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <MiniInfoCard
                  label="Crédito gerado"
                  value={formatMoney(totalCreditoGerado)}
                  tone={totalCreditoGerado > 0 ? "sky" : "zinc"}
                />
                <MiniInfoCard
                  label="Crédito da cliente"
                  value={formatMoney(creditoClienteDisponivel)}
                  tone={creditoClienteDisponivel > 0 ? "emerald" : "zinc"}
                />
              </div>

              <div className="mt-2 rounded-[16px] border border-zinc-200 bg-zinc-50 p-2.5">
                <div className="text-[8.5px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  Resumo financeiro
                </div>

                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <MiniInfoCard
                    label="Subtotal"
                    value={
                      comandaSelecionada
                        ? formatCurrency(comandaSelecionada.subtotal)
                        : "R$ 0,00"
                    }
                  />
                  <MiniInfoCard
                    label="Desconto"
                    value={
                      comandaSelecionada
                        ? formatCurrency(comandaSelecionada.desconto)
                        : "R$ 0,00"
                    }
                    tone={
                      Number(comandaSelecionada?.desconto || 0) > 0 ? "amber" : "zinc"
                    }
                  />
                  <MiniInfoCard
                    label="Acréscimo"
                    value={
                      comandaSelecionada
                        ? formatCurrency(comandaSelecionada.acrescimo)
                        : "R$ 0,00"
                    }
                    tone={
                      Number(comandaSelecionada?.acrescimo || 0) > 0 ? "sky" : "zinc"
                    }
                  />
                  <MiniInfoCard
                    label="Total"
                    value={comandaSelecionada ? formatCurrency(totalComanda) : "R$ 0,00"}
                    tone={comandaSelecionada ? "emerald" : "zinc"}
                  />
                </div>

                {comandaSelecionada?.cupom_aplicado ? (
                  <div className="mt-2 rounded-[14px] border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs text-emerald-950">
                    <div className="font-bold">Cupom aplicado</div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate">
                        {comandaSelecionada.cupom_aplicado.nome ||
                          comandaSelecionada.cupom_aplicado.codigo ||
                          "Campanha"}
                      </span>
                      <span className="shrink-0 font-bold text-emerald-800">
                        -{" "}
                        {formatCurrency(
                          Number(comandaSelecionada.cupom_aplicado.valor_desconto || 0),
                        )}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-3 border-t border-zinc-200 pt-3">
                <button
                  type="button"
                  onClick={() => setAjustesOpen(true)}
                  disabled={!podeAjustarComanda || saving}
                  className="w-full rounded-[14px] border border-zinc-300 bg-white px-3 py-2.5 text-xs font-bold text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  Acréscimo / desconto
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </aside>

      <AppModal
        open={pagamentosOpen}
        onClose={() => setPagamentosOpen(false)}
        closeDisabled={saving}
        title={comandaSelecionada ? `Pagamento da comanda #${comandaSelecionada.numero}` : "Pagamento"}
        description="Lance recebimentos, acompanhe a taxa e confirme o fechamento sem poluir a tela principal."
        eyebrow="Operação de pagamento"
        maxWidthClassName="max-w-5xl"
        panelClassName="max-h-[calc(100dvh-2rem)]"
        bodyClassName="bg-[#f7f8fb]"
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
        />
      </AppModal>

      <AppModal
        open={ajustesOpen}
        onClose={() => setAjustesOpen(false)}
        closeDisabled={saving}
        title="Acréscimo / desconto"
        description="Ajuste o desconto e o acréscimo da comanda selecionada em uma tela separada do pagamento."
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
        title="Sessão do caixa"
        description="Abra, feche e movimente o caixa em uma área dedicada, com leitura mais limpa."
        eyebrow="Operação da sessão"
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

function MiniInfoCard({
  label,
  value,
  tone = "zinc",
}: {
  label: string;
  value: string;
  tone?: "amber" | "emerald" | "sky" | "zinc";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : tone === "sky"
          ? "border-sky-200 bg-sky-50 text-sky-900"
        : "border-zinc-200 bg-white text-zinc-900";

  return (
    <div className={`rounded-[14px] border px-2 py-2 ${toneClass}`}>
      <div className="text-[8.5px] font-semibold uppercase tracking-[0.12em] text-current/60">
        {label}
      </div>
      <div className="mt-0.5 break-words text-xs font-bold leading-4">{value}</div>
    </div>
  );
}

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatStatusVenda(status?: string | null) {
  if (!status) return "Sem venda";

  if (status === "aberta") return "Em atendimento";
  if (status === "fechada") return "Fechada";
  if (status === "cancelada") return "Cancelada";

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusVendaTone(status?: string | null) {
  if (status === "fechada") return "emerald";
  if (status === "cancelada") return "rose";
  if (status === "aberta") return "sky";
  return "zinc";
}


function SidebarInfo({
  label,
  value,
  tone = "zinc",
}: {
  label: string;
  value: string;
  tone?: "emerald" | "rose" | "sky" | "zinc";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "rose"
        ? "border-rose-200 bg-rose-50"
        : tone === "sky"
          ? "border-sky-200 bg-sky-50"
          : "border-zinc-200 bg-zinc-50";

  return (
    <div className={`rounded-[14px] border px-2.5 py-2 ${toneClass}`}>
      <div className="text-[8.5px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
        {label}
      </div>
      <div className="mt-0.5 break-words text-xs font-semibold leading-4 text-zinc-900">
        {value}
      </div>
    </div>
  );
}
