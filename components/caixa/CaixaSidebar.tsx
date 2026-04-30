"use client";

import { type ReactNode, useEffect, useState } from "react";
import { ReceiptText, WalletCards } from "lucide-react";
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
  comandaCarregandoId: string | null;
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
  comandaCarregandoId,
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
  const [painelAtivo, setPainelAtivo] = useState<"operacao" | "comanda">(
    "operacao"
  );
  const caixaAberto = schemaReady && sessao?.status === "aberto";
  const totalComanda = Number(comandaSelecionada?.total || 0);
  const carregandoComanda = comandaCarregandoId === comandaSelecionada?.id;

  useEffect(() => {
    if (comandaSelecionada) {
      setPainelAtivo("comanda");
    }
  }, [comandaSelecionada]);

  return (
    <>
      <aside className="w-full min-h-0">
        <div className="flex h-full min-h-0 flex-col rounded-[34px] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(250,251,255,0.96)_100%)] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.09)]">
        <div className="shrink-0 rounded-[24px] border border-zinc-200 bg-zinc-50 p-1">
          <div className="grid grid-cols-2 gap-1">
            <ToggleButton
              active={painelAtivo === "operacao"}
              label="Operacao"
              onClick={() => setPainelAtivo("operacao")}
            />
            <ToggleButton
              active={painelAtivo === "comanda"}
              label="Comanda em foco"
              onClick={() => setPainelAtivo("comanda")}
            />
          </div>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="space-y-4">
            {painelAtivo === "operacao" ? (
              <>
                <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                        Operacao do caixa
                      </div>
                      <h2 className="mt-1 text-[1.55rem] font-semibold leading-none text-slate-900">
                        Operacao
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-zinc-500">
                        Pagamento, sessao e fluxo rapido da venda.
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold uppercase ${
                        caixaAberto
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-zinc-200 bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {caixaAberto ? "Caixa aberto" : "Caixa fechado"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3">
                    <ActionButton
                      icon={<WalletCards size={16} />}
                      label="Sessao do caixa"
                      description="Abrir, fechar e lancar movimentos em foco."
                      onClick={() => setSessaoOpen(true)}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <MiniInfoCard label="Total pago" value={formatMoney(totalPago)} />
                    <MiniInfoCard
                      label="Falta receber"
                      value={formatMoney(faltaReceber)}
                      tone={faltaReceber > 0 ? "amber" : "emerald"}
                    />
                    <MiniInfoCard label="Troco" value={formatMoney(troco)} />
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <MiniInfoCard
                      label="Credito gerado"
                      value={formatMoney(totalCreditoGerado)}
                      tone={totalCreditoGerado > 0 ? "sky" : "zinc"}
                    />
                    <MiniInfoCard
                      label="Credito da cliente"
                      value={formatMoney(creditoClienteDisponivel)}
                      tone={creditoClienteDisponivel > 0 ? "emerald" : "zinc"}
                    />
                  </div>
                </div>

                <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <ReceiptText size={16} className="text-zinc-700" />
                    <div className="text-sm font-semibold text-zinc-900">
                      Fluxo rapido da venda
                    </div>
                  </div>
                  <div className="mt-3 space-y-3 text-sm leading-6 text-zinc-500">
                    <QuickTip
                      title="1. Confira a comanda"
                      description="Itens, profissional, desconto e acrescimo precisam bater antes de receber."
                    />
                    <QuickTip
                      title="2. Receba no modal"
                      description="Use o botao Pagamento no topo da comanda para receber sem sair da venda."
                    />
                    <QuickTip
                      title="3. Finalize quando zerar"
                      description="Feche a comanda somente quando a falta a receber estiver em zero."
                    />
                  </div>
                </div>
              </>
            ) : null}

            {painelAtivo === "comanda" ? (
              <>
                <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                        Comanda em foco
                      </div>
                      <div className="mt-1 text-[1.35rem] font-semibold leading-tight text-zinc-900">
                        {comandaSelecionada
                          ? `#${comandaSelecionada.numero}`
                          : "Nenhuma selecionada"}
                      </div>
                      <div className="mt-2 text-sm text-zinc-500">
                        {comandaSelecionada
                          ? carregandoComanda
                            ? "Atualizando cliente, total e saldo da venda."
                            : "Cliente, total e saldo da venda em leitura rapida."
                          : "Selecione uma comanda na triagem para operar aqui."}
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold uppercase ${
                        caixaAberto
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-zinc-200 bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {caixaAberto ? "Sessao aberta" : "Sessao fechada"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <SidebarInfo
                      label="Cliente"
                      value={
                        comandaSelecionada
                          ? getJoinedName(comandaSelecionada.clientes, "Sem cliente")
                          : "Selecione uma venda"
                      }
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <SidebarInfo
                        label="Total da venda"
                        value={comandaSelecionada ? formatCurrency(totalComanda) : "R$ 0,00"}
                      />
                      <SidebarInfo
                        label="Credito da cliente"
                        value={formatMoney(creditoClienteDisponivel)}
                      />
                    </div>
                  </div>
                </div>

                <CaixaResumo
                  comandaSelecionada={comandaSelecionada}
                  descontoInput={descontoInput}
                  acrescimoInput={acrescimoInput}
                  setDescontoInput={setDescontoInput}
                  setAcrescimoInput={setAcrescimoInput}
                  onSalvar={onSalvarResumo}
                  saving={saving || !podeEditarCaixa}
                />
              </>
            ) : null}
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
        eyebrow="Operacao de pagamento"
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
          showRulesCard
        />
      </AppModal>

      <AppModal
        open={sessaoOpen}
        onClose={() => setSessaoOpen(false)}
        closeDisabled={saving}
        title="Sessao do caixa"
        description="Abra, feche e movimente o caixa em uma area dedicada, com leitura mais limpa."
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

function ToggleButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[18px] px-3 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-zinc-950 text-white shadow-sm"
          : "bg-transparent text-zinc-600 hover:bg-white hover:text-zinc-900"
      }`}
    >
      <span className="line-clamp-1 block">{label}</span>
    </button>
  );
}

function ActionButton({
  icon,
  label,
  description,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[24px] border border-zinc-200 bg-white px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-zinc-700">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-zinc-900">{label}</div>
          <div className="mt-1 break-words text-xs leading-5 text-zinc-500">{description}</div>
        </div>
      </div>
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
    <div className={`rounded-[22px] border px-3 py-3 ${toneClass}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-current/60">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-bold leading-5">{value}</div>
    </div>
  );
}

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function QuickTip({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <div className="text-sm font-semibold text-zinc-900">{title}</div>
      <div className="mt-1 text-xs leading-5 text-zinc-500">{description}</div>
    </div>
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
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
        {label}
      </div>
      <div className="mt-1.5 break-words text-sm font-semibold leading-5 text-zinc-900">
        {value}
      </div>
    </div>
  );
}
