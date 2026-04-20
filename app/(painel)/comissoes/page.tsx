"use client";

import { type ReactNode } from "react";
import ConfirmActionModal from "@/components/ui/ConfirmActionModal";
import { ComissaoHelpPanel } from "@/components/comissoes/ComissaoHelpPanel";
import { useComissoesPage } from "@/components/comissoes/useComissoesPage";
import {
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  Layers3,
  Printer,
  Search,
  Sparkles,
  User2,
  WalletCards,
} from "lucide-react";

function formatCurrency(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatPercent(value: number | null | undefined) {
  return `${Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("pt-BR");
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function origemMeta(origem: string | null | undefined) {
  if (origem === "profissional_servico") {
    return {
      badgeClass: "border-violet-200 bg-violet-50 text-violet-700",
      description: "Excecao do profissional no servico.",
      label: "Excecao do profissional",
    };
  }
  if (origem === "servico_padrao") {
    return {
      badgeClass: "border-sky-200 bg-sky-50 text-sky-700",
      description: "Percentual herdado do servico.",
      label: "Padrao do servico",
    };
  }
  if (origem === "profissional_padrao") {
    return {
      badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
      description: "Percentual herdado do cadastro antigo.",
      label: "Padrao antigo do profissional",
    };
  }
  if (origem === "assistente") {
    return {
      badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
      description: "Lancamento destinado ao assistente.",
      label: "Assistente",
    };
  }
  if (origem === "manual") {
    return {
      badgeClass: "border-zinc-200 bg-zinc-100 text-zinc-700",
      description: "Lancamento criado manualmente.",
      label: "Lancamento manual",
    };
  }
  return {
    badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
    description: "Nao encontrou uma regra clara.",
    label: "Sem regra definida",
  };
}

export default function ComissoesPage() {
  const {
    loading,
    saving,
    erro,
    msg,
    permissoes,
    acessoCarregado,
    podeGerenciar,
    busca,
    setBusca,
    status,
    setStatus,
    tipoDestinatario,
    setTipoDestinatario,
    profissionalId,
    setProfissionalId,
    dataInicial,
    setDataInicial,
    dataFinal,
    setDataFinal,
    profissionais,
    rows,
    resumo,
    confirmacaoComissao,
    setConfirmacaoComissao,
    carregarComissoes,
    marcarComoPago,
    marcarFiltradasComoPagas,
    apurarRateio,
    confirmarAcao,
    totalPendentesCount,
    ticketMedio,
    maiorLancamento,
    resumoPorTipo,
    resumoProfissionais,
    getTipoDestinatario,
    getValorLancamento,
    getStatusComissaoMeta,
    normalizeStatusComissao,
  } = useComissoesPage();

  function imprimirRateio() {
    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(
      `<html><body><h1>Rateio de Comissoes</h1><p>Periodo: ${formatDate(dataInicial)} ate ${formatDate(dataFinal)}</p><p>Total: ${formatCurrency(resumo.total)}</p></body></html>`
    );
    win.document.close();
    win.focus();
    win.print();
  }

  if (loading || !acessoCarregado) {
    return <div className="p-6">Carregando comissoes...</div>;
  }

  if (permissoes && !permissoes.comissoes_ver) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          Voce nao tem permissao para acessar Comissoes.
        </div>
      </div>
    );
  }

  return (
    <>
      <ConfirmActionModal
        open={Boolean(confirmacaoComissao)}
        title={
          confirmacaoComissao?.acao === "cancelar"
            ? "Cancelar lancamento"
            : "Marcar comissoes como pagas"
        }
        description={
          confirmacaoComissao?.acao === "cancelar"
            ? "Este lancamento deixara de entrar no rateio ativo."
            : `${confirmacaoComissao?.ids.length || 0} lancamento(s) filtrado(s) serao marcados como pagos.`
        }
        confirmLabel={
          confirmacaoComissao?.acao === "cancelar"
            ? "Cancelar lancamento"
            : "Marcar como pago"
        }
        tone={confirmacaoComissao?.acao === "cancelar" ? "danger" : "default"}
        loading={saving}
        onClose={() => setConfirmacaoComissao(null)}
        onConfirm={() => {
          void confirmarAcao();
        }}
      />

      <div className="bg-white">
        <div className="mx-auto max-w-[1800px] space-y-5">
          <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 bg-white px-6 py-6 text-zinc-950">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                    Painel financeiro
                  </div>
                  <h1 className="mt-2 text-3xl font-bold">Comissoes</h1>
                  <p className="mt-2 text-sm text-zinc-500">
                    Veja o total do periodo, quem lidera o rateio e qual regra
                    gerou cada valor.
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right">
                  <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                    Lancamentos filtrados
                  </div>
                  <div className="mt-1 text-2xl font-bold">{rows.length}</div>
                </div>
              </div>
            </div>
            <div className="grid gap-3 px-4 py-4 md:grid-cols-2 xl:grid-cols-7">
              <ResumoCard
                title="Total"
                value={formatCurrency(resumo.total)}
                icon={<BadgeDollarSign size={16} />}
                tone="zinc"
              />
              <ResumoCard
                title="Profissionais"
                value={formatCurrency(resumoPorTipo.profissional)}
                icon={<User2 size={16} />}
                tone="sky"
              />
              <ResumoCard
                title="Assistentes"
                value={formatCurrency(resumoPorTipo.assistente)}
                icon={<Layers3 size={16} />}
                tone="emerald"
              />
              <ResumoCard
                title="Pendente"
                value={formatCurrency(resumo.pendente)}
                icon={<CalendarDays size={16} />}
                tone="amber"
              />
              <ResumoCard
                title="Pago"
                value={formatCurrency(resumo.pago)}
                icon={<CheckCircle2 size={16} />}
                tone="emerald"
              />
              <ResumoCard
                title="Ticket medio"
                value={formatCurrency(ticketMedio)}
                icon={<WalletCards size={16} />}
                tone="sky"
              />
              <ResumoCard
                title="Maior lancamento"
                value={formatCurrency(
                  maiorLancamento ? getValorLancamento(maiorLancamento) : 0
                )}
                icon={<Sparkles size={16} />}
                tone="violet"
              />
            </div>
          </div>

          <ComissaoHelpPanel
            eyebrow="Leitura rapida"
            title="Como este valor foi definido"
            description="A origem mostra qual regra entrou no calculo e evita adivinhacao na hora de conferir o rateio."
            steps={[
              {
                title: "Padrao do servico",
                description:
                  "Esse deve ser o caminho mais comum para a comissao.",
              },
              {
                title: "Excecao do profissional",
                description:
                  "Quando um vinculo foge do padrao, a tela aponta isso.",
              },
              {
                title: "Taxa da maquininha",
                description:
                  "So entra na conta se a configuracao permitir.",
              },
            ]}
          />

          {erro ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {erro}
            </div>
          ) : null}
          {msg ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {msg}
            </div>
          ) : null}

          <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_190px_190px_240px_180px_180px_auto]">
              <Field label="Buscar">
                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Profissional, descricao ou origem"
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-11 py-3 text-sm outline-none transition focus:border-zinc-900 focus:bg-white"
                  />
                </div>
              </Field>
              <Field label="Status">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-zinc-900 focus:bg-white"
                >
                  <option value="todos">Todos</option>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </Field>
              <Field label="Tipo">
                <select
                  value={tipoDestinatario}
                  onChange={(e) => setTipoDestinatario(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-zinc-900 focus:bg-white"
                >
                  <option value="todos">Todos</option>
                  <option value="profissional">Profissional</option>
                  <option value="assistente">Assistente</option>
                </select>
              </Field>
              <Field label="Profissional">
                <select
                  value={profissionalId}
                  onChange={(e) => setProfissionalId(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-zinc-900 focus:bg-white"
                >
                  <option value="">Todos</option>
                  {profissionais.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Data inicial">
                <input
                  type="date"
                  value={dataInicial}
                  onChange={(e) => setDataInicial(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-zinc-900 focus:bg-white"
                />
              </Field>
              <Field label="Data final">
                <input
                  type="date"
                  value={dataFinal}
                  onChange={(e) => setDataFinal(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-zinc-900 focus:bg-white"
                />
              </Field>
              <Field label="Aplicar">
                <button
                  onClick={() => void carregarComissoes()}
                  className="w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95"
                >
                  Atualizar
                </button>
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={apurarRateio}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
              >
                Apurar rateio
              </button>
              <button
                onClick={imprimirRateio}
                className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
              >
                <Printer size={16} />
                Imprimir rateio
              </button>
              {podeGerenciar ? (
                <button
                  onClick={marcarFiltradasComoPagas}
                  disabled={saving || totalPendentesCount === 0}
                  className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-50"
                >
                  Marcar filtradas como pagas
                </button>
              ) : null}
            </div>
          </div>

          <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Visao por pessoa
                </div>
                <div className="mt-1 text-xl font-bold text-zinc-950">
                  Profissionais e assistentes no rateio
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                <Layers3 size={16} />
                {resumoProfissionais.length} pessoa(s)
              </div>
            </div>
            {resumoProfissionais.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500">
                Nenhum profissional entrou no periodo filtrado.
              </div>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {resumoProfissionais.slice(0, 4).map((item) => {
                  const statusPredominante = getStatusComissaoMeta(
                    item.statusPredominante
                  );
                  return (
                    <div
                      key={item.id}
                      className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-sm font-bold text-zinc-700 ring-1 ring-zinc-200">
                            {getInitials(item.nome)}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-900">
                              {item.nome}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {item.quantidade} lancamento(s)
                            </div>
                          </div>
                        </div>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusPredominante.badgeClass}`}
                        >
                          {statusPredominante.label}
                        </span>
                      </div>
                      <div className="mt-4 text-2xl font-bold text-zinc-950">
                        {formatCurrency(item.total)}
                      </div>
                      <div className="mt-3 text-sm text-zinc-500">
                        Pendente: {formatCurrency(item.pendente)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 px-5 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Leitura analitica
              </div>
              <div className="mt-1 text-xl font-bold text-zinc-950">
                Lancamentos detalhados
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[1450px] w-full">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-[0.14em] text-zinc-500">
                    <th className="px-5 py-4">Pessoa</th>
                    <th className="px-5 py-4">Descricao</th>
                    <th className="px-5 py-4">Competencia</th>
                    <th className="px-5 py-4">Base</th>
                    <th className="px-5 py-4">% Aplicada</th>
                    <th className="px-5 py-4">Origem</th>
                    <th className="px-5 py-4">Comissao</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Pago em</th>
                    <th className="px-5 py-4 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-5 py-10 text-center text-sm text-zinc-500"
                      >
                        Nenhuma comissao encontrada com os filtros atuais.
                      </td>
                    </tr>
                  ) : (
                    rows.map((item) => {
                      const nome = item.profissionais?.nome || "Profissional";
                      const origem = origemMeta(item.origem_percentual);
                      const statusInfo = getStatusComissaoMeta(item.status);
                      return (
                        <tr
                          key={item.id}
                          className="border-b border-zinc-100 align-top"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-700">
                                {getInitials(nome) || <User2 size={16} />}
                              </div>
                              <div>
                                <div className="font-semibold text-zinc-900">
                                  {nome}
                                </div>
                                <div className="text-xs text-zinc-500">
                                  {getTipoDestinatario(item) === "assistente"
                                    ? "Assistente"
                                    : "Profissional"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="text-sm font-medium text-zinc-900">
                              {item.descricao || "-"}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500">
                              {item.observacoes ||
                                "Sem observacoes adicionais."}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-zinc-700">
                            {formatDate(item.competencia_data)}
                          </td>
                          <td className="px-5 py-4 text-sm font-medium text-zinc-800">
                            {formatCurrency(item.valor_base)}
                          </td>
                          <td className="px-5 py-4 text-sm font-medium text-zinc-800">
                            {formatPercent(item.percentual_aplicado)}
                          </td>
                          <td className="px-5 py-4">
                            <div
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${origem.badgeClass}`}
                            >
                              {origem.label}
                            </div>
                            <div className="mt-2 text-xs text-zinc-500">
                              {origem.description}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="text-sm font-bold text-zinc-900">
                              {formatCurrency(getValorLancamento(item))}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500">
                              Base {formatCurrency(item.valor_base)}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusInfo.badgeClass}`}
                            >
                              {statusInfo.label}
                            </span>
                            <div className="mt-2 text-xs text-zinc-500">
                              {statusInfo.description}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-zinc-700">
                            {formatDateTime(item.pago_em)}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              {podeGerenciar ? (
                                <>
                                  {normalizeStatusComissao(item.status) ===
                                  "pendente" ? (
                                    <button
                                      onClick={() => void marcarComoPago(item.id)}
                                      disabled={saving}
                                      className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-white transition hover:opacity-95 disabled:opacity-50"
                                    >
                                      Marcar pago
                                    </button>
                                  ) : null}
                                  {normalizeStatusComissao(item.status) !==
                                  "cancelado" ? (
                                    <button
                                      onClick={() =>
                                        setConfirmacaoComissao({
                                          acao: "cancelar",
                                          ids: [item.id],
                                        })
                                      }
                                      disabled={saving}
                                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                                    >
                                      Cancelar
                                    </button>
                                  ) : null}
                                </>
                              ) : (
                                <span className="text-xs font-medium text-zinc-400">
                                  Somente leitura
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ResumoCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  tone: "amber" | "emerald" | "sky" | "violet" | "zinc";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : tone === "sky"
          ? "border-sky-200 bg-sky-50 text-sky-900"
          : tone === "violet"
            ? "border-violet-200 bg-violet-50 text-violet-900"
            : "border-zinc-200 bg-zinc-50 text-zinc-900";

  return (
    <div className={`rounded-2xl border px-4 py-4 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium">{title}</div>
        <div>{icon}</div>
      </div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-zinc-700">
        {label}
      </label>
      {children}
    </div>
  );
}
