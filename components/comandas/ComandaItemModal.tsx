"use client";

import { useEffect, useMemo, useState } from "react";
import AppModal from "@/components/ui/AppModal";
import {
  criarPreviewComissaoManual,
  criarPreviewComissaoProduto,
  criarPreviewComissaoServico,
} from "@/lib/comissoes/regrasServico";
import {
  allocateComboUnitPrices,
  normalizeComboComponents,
} from "@/lib/servicos/combo-utils";
import { parseMoneyToNumber } from "@/lib/utils/comanda";

type Profissional = {
  id: string;
  nome: string;
  tipo_profissional?: string | null;
  assistentes_ids?: string[];
};

type ProfissionalServicoVinculo = {
  id_servico: string;
  id_profissional: string;
};

type Servico = {
  id: string;
  nome: string;
  preco_padrao?: number | null;
  custo_produto?: number | null;
  comissao_percentual_padrao?: number | null;
  comissao_assistente_percentual?: number | null;
  base_calculo?: string | null;
  desconta_taxa_maquininha?: boolean | null;
  eh_combo?: boolean | null;
  combo_resumo?: string | null;
};

type ComboItem = {
  id_servico_combo: string;
  id_servico_item: string;
  ordem?: number | null;
  preco_base?: number | null;
  percentual_rateio?: number | null;
};

type Produto = {
  id: string;
  nome: string;
  preco_venda?: number | null;
  custo_real?: number | null;
  comissao_revenda_percentual?: number | null;
};

export type ComandaItemModalPayload = {
  tipo_item: string;
  quantidade: number;
  valor_unitario: number;
  observacoes?: string | null;
  id_servico?: string | null;
  id_produto?: string | null;
  id_agendamento?: string | null;
  descricao?: string | null;
  custo_total?: number | null;
  id_profissional?: string | null;
  id_assistente?: string | null;
  comissao_percentual_aplicada?: number | null;
  comissao_assistente_percentual_aplicada?: number | null;
  base_calculo_aplicada?: string | null;
  desconta_taxa_maquininha_aplicada?: boolean | null;
  origem?: string | null;
  combo_resumo?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (
    payload: ComandaItemModalPayload | ComandaItemModalPayload[]
  ) => Promise<void>;
  profissionais: Profissional[];
  servicos: Servico[];
  comboItens: ComboItem[];
  profissionalServicos: ProfissionalServicoVinculo[];
  produtos: Produto[];
};

export default function ComandaItemModal({
  open,
  onClose,
  onSave,
  profissionais,
  servicos,
  comboItens,
  profissionalServicos,
  produtos,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [tipoItem, setTipoItem] = useState("servico");
  const [idServico, setIdServico] = useState("");
  const [idProduto, setIdProduto] = useState("");
  const [descricao, setDescricao] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [valorUnitario, setValorUnitario] = useState("");
  const [idProfissional, setIdProfissional] = useState("");
  const [idAssistente, setIdAssistente] = useState("");
  const [profissionaisCombo, setProfissionaisCombo] = useState<Record<string, string>>({});
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState("");

  const servicoSelecionado = useMemo(
    () => servicos.find((s) => s.id === idServico),
    [servicos, idServico]
  );

  const produtoSelecionado = useMemo(
    () => produtos.find((p) => p.id === idProduto),
    [produtos, idProduto]
  );

  const profissionaisOperacionais = useMemo(
    () =>
      profissionais.filter(
        (profissional) =>
          String(profissional.tipo_profissional || "profissional").toLowerCase() !== "assistente"
      ),
    [profissionais]
  );

  const comboItensSelecionados = useMemo(() => {
    if (!servicoSelecionado?.eh_combo) return [];

    return comboItens
      .filter((item) => item.id_servico_combo === servicoSelecionado.id)
      .map((item) => {
        const servico = servicos.find((base) => base.id === item.id_servico_item);
        if (!servico) return null;

        return { ...item, servico };
      })
      .filter((item): item is ComboItem & { servico: Servico } => Boolean(item))
      .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));
  }, [comboItens, servicoSelecionado, servicos]);

  const comboComponentes = useMemo(
    () =>
      normalizeComboComponents(
        comboItensSelecionados.map((item) => ({
          id: item.servico.id,
          nome: item.servico.nome,
          ordem: item.ordem,
          preco_base: item.preco_base ?? item.servico.preco_padrao ?? 0,
          percentual_rateio: item.percentual_rateio,
        }))
      ),
    [comboItensSelecionados]
  );

  const valoresComboRateados = useMemo(() => {
    const valorCombo =
      parseMoneyToNumber(valorUnitario) ||
      Number(servicoSelecionado?.preco_padrao || 0);

    return allocateComboUnitPrices(valorCombo, comboComponentes);
  }, [comboComponentes, servicoSelecionado?.preco_padrao, valorUnitario]);

  function profissionaisDoServico(idServico: string) {
    const vinculados = new Set(
      profissionalServicos
        .filter((vinculo) => vinculo.id_servico === idServico)
        .map((vinculo) => vinculo.id_profissional)
    );

    return profissionaisOperacionais.filter((profissional) =>
      vinculados.has(profissional.id)
    );
  }

  const assistentesDoProfissional = useMemo(() => {
    if (!idProfissional) return [];

    const profissional = profissionais.find((item) => item.id === idProfissional);
    const idsAssistentes = new Set(profissional?.assistentes_ids || []);

    return profissionais.filter(
      (item) =>
        String(item.tipo_profissional || "").toLowerCase() === "assistente" &&
        idsAssistentes.has(item.id)
    );
  }, [idProfissional, profissionais]);

  useEffect(() => {
    if (!idAssistente) return;

    const assistenteLiberado = assistentesDoProfissional.some(
      (item) => item.id === idAssistente
    );

    if (!assistenteLiberado) {
      setIdAssistente("");
    }
  }, [assistentesDoProfissional, idAssistente]);

  useEffect(() => {
    if (open) {
      setErro("");
    }
  }, [open]);

  useEffect(() => {
    setProfissionaisCombo({});
  }, [idServico]);

  if (!open) return null;

  function normalizeMoneyDraft(value: string) {
    return String(value || "").replace(/[^\d.,]/g, "");
  }

  function formatMoneyDraft(value: string) {
    const parsed = parseMoneyToNumber(value);
    if (!parsed) return "";

    return parsed.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  async function handleSave() {
    try {
      setSaving(true);
      setErro("");

      const quantidadeNumero = Number(quantidade || 1);
      const valorUnitarioNumero = parseMoneyToNumber(valorUnitario);

      if (tipoItem === "servico" && !idServico) {
        throw new Error("Selecione um serviço antes de adicionar.");
      }

      if (
        tipoItem === "servico" &&
        servicoSelecionado?.eh_combo &&
        comboItensSelecionados.length > 0
      ) {
        const payloads = comboItensSelecionados.map((item, index) => {
          const idProfissionalItem = profissionaisCombo[item.servico.id] || "";
          if (!idProfissionalItem) {
            throw new Error(`Selecione o profissional de ${item.servico.nome}.`);
          }

          return {
            tipo_item: "servico",
            quantidade: 1,
            valor_unitario: valoresComboRateados[index] || 0,
            id_servico: item.servico.id,
            descricao: `${servicoSelecionado.nome} • ${item.servico.nome}`,
            custo_total: Number(item.servico.custo_produto || 0),
            id_profissional: idProfissionalItem,
            id_assistente: null,
            observacoes: observacoes || null,
            origem: "combo",
            combo_resumo: servicoSelecionado.nome,
            ...criarPreviewComissaoServico(item.servico),
          } satisfies ComandaItemModalPayload;
        });

        await onSave(payloads);
        onClose();
        return;
      }

      if (tipoItem === "produto" && !idProduto) {
        throw new Error("Selecione um produto antes de adicionar.");
      }

      if (tipoItem === "extra" && !String(descricao || "").trim()) {
        throw new Error("Informe a descrição do item manual.");
      }

      let payload: ComandaItemModalPayload = {
        tipo_item: tipoItem,
        quantidade: quantidadeNumero,
        valor_unitario: valorUnitarioNumero,
        observacoes: observacoes || null,
      };

      if (tipoItem === "servico") {
        const preview = criarPreviewComissaoServico(servicoSelecionado);
        payload = {
          ...payload,
          id_servico: idServico,
          descricao: servicoSelecionado?.nome || descricao,
          custo_total: Number(servicoSelecionado?.custo_produto || 0),
          id_profissional: idProfissional || null,
          id_assistente: idAssistente || null,
          origem: servicoSelecionado?.eh_combo ? "combo" : "manual",
          combo_resumo: servicoSelecionado?.combo_resumo || null,
          ...preview,
        };
      }

      if (tipoItem === "produto") {
        const preview = criarPreviewComissaoProduto(
          produtoSelecionado?.comissao_revenda_percentual
        );
        payload = {
          ...payload,
          id_produto: idProduto,
          descricao: produtoSelecionado?.nome || descricao,
          custo_total: Number(produtoSelecionado?.custo_real || 0) * quantidadeNumero,
          id_profissional: idProfissional || null,
          ...preview,
        };
      }

      if (tipoItem === "extra") {
        const preview = criarPreviewComissaoManual();
        payload = {
          ...payload,
          descricao,
          custo_total: 0,
          id_profissional: null,
          id_assistente: null,
          ...preview,
        };
      }

      await onSave(payload);
      onClose();
    } catch (error) {
      setErro(
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível adicionar o item."
      );
    } finally {
      setSaving(false);
    }
  }

  function preencherAutomaticoServico(id: string) {
    setIdServico(id);
    const servico = servicos.find((s) => s.id === id);
    if (!servico) return;
    setDescricao(servico.nome);
    setValorUnitario(
      Number(servico.preco_padrao || 0).toFixed(2).replace(".", ",")
    );
  }

  function preencherAutomaticoProduto(id: string) {
    setIdProduto(id);
    const produto = produtos.find((p) => p.id === id);
    if (!produto) return;
    setDescricao(produto.nome);
    setValorUnitario(
      Number(produto.preco_venda || 0).toFixed(2).replace(".", ",")
    );
  }

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Adicionar item na comanda"
      description="Preencha os dados do item e vincule o profissional quando fizer sentido."
      maxWidthClassName="max-w-3xl"
      zIndexClassName="z-[100]"
      closeDisabled={saving}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-2xl border border-zinc-300 px-4 py-3 font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
          >
            Fechar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-2xl bg-zinc-900 px-5 py-3 font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Adicionar item"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {erro ? (
            <div className="md:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {erro}
            </div>
          ) : null}

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-zinc-700">Tipo</label>
            <select
              value={tipoItem}
              onChange={(e) => setTipoItem(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3"
            >
              <option value="servico">Serviço</option>
              <option value="produto">Produto</option>
              <option value="extra">Extra</option>
            </select>
          </div>

          {tipoItem === "servico" ? (
            <>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-zinc-700">Serviço</label>
                <select
                  value={idServico}
                  onChange={(e) => preencherAutomaticoServico(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3"
                >
                  <option value="">Selecione</option>
                  {servicos.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.eh_combo ? `${s.nome} (combo)` : s.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className={servicoSelecionado?.eh_combo ? "hidden" : ""}>
                <label className="mb-1 block text-sm font-semibold text-zinc-700">Profissional</label>
                <select
                  value={idProfissional}
                  onChange={(e) => {
                    setIdProfissional(e.target.value);
                    setIdAssistente("");
                  }}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3"
                >
                  <option value="">Selecione</option>
                  {profissionaisOperacionais.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className={servicoSelecionado?.eh_combo ? "hidden" : ""}>
                <label className="mb-1 block text-sm font-semibold text-zinc-700">Assistente</label>
                <select
                  value={idAssistente}
                  onChange={(e) => setIdAssistente(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3"
                >
                  <option value="">Selecione</option>
                  {assistentesDoProfissional.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>

              {servicoSelecionado?.eh_combo && comboItensSelecionados.length > 0 ? (
                <div className="md:col-span-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-sm font-bold text-zinc-900">
                    Servicos do combo
                  </div>
                  <div className="mt-1 text-sm text-zinc-500">
                    Selecione o profissional de cada servico. O valor fica rateado pelo combo.
                  </div>

                  <div className="mt-4 space-y-3">
                    {comboItensSelecionados.map((item, index) => {
                      const profissionaisDisponiveis = profissionaisDoServico(item.servico.id);

                      return (
                        <div
                          key={item.servico.id}
                          className="rounded-2xl border border-zinc-200 bg-white p-3"
                        >
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                              <div className="text-sm font-semibold text-zinc-900">
                                {item.servico.nome}
                              </div>
                              <div className="mt-1 text-xs text-zinc-500">
                                Valor no combo: R$ {Number(valoresComboRateados[index] || 0).toFixed(2)}
                              </div>
                            </div>

                            <select
                              value={profissionaisCombo[item.servico.id] || ""}
                              onChange={(e) =>
                                setProfissionaisCombo((current) => ({
                                  ...current,
                                  [item.servico.id]: e.target.value,
                                }))
                              }
                              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 md:w-64"
                            >
                              <option value="">Profissional</option>
                              {profissionaisDisponiveis.map((profissional) => (
                                <option key={profissional.id} value={profissional.id}>
                                  {profissional.nome}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {tipoItem === "produto" ? (
            <>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-zinc-700">Produto</label>
                <select
                  value={idProduto}
                  onChange={(e) => preencherAutomaticoProduto(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3"
                >
                  <option value="">Selecione</option>
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-zinc-700">Profissional</label>
                <select
                  value={idProfissional}
                  onChange={(e) => {
                    setIdProfissional(e.target.value);
                    setIdAssistente("");
                  }}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3"
                >
                  <option value="">Selecione</option>
                  {profissionaisOperacionais.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : null}

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-zinc-700">Descrição</label>
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-700">Quantidade</label>
            <input
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-700">Valor unitário</label>
            <input
              inputMode="decimal"
              value={valorUnitario}
              onBlur={() => setValorUnitario((current) => formatMoneyDraft(current))}
              onChange={(e) => setValorUnitario(normalizeMoneyDraft(e.target.value))}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-zinc-700">Observações</label>
            <textarea
              rows={3}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3"
            />
          </div>
      </div>
    </AppModal>
  );
}
