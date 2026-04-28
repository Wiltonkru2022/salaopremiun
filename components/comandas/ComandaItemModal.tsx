"use client";

import { useEffect, useMemo, useState } from "react";
import AppModal from "@/components/ui/AppModal";
import {
  criarPreviewComissaoManual,
  criarPreviewComissaoProduto,
  criarPreviewComissaoServico,
} from "@/lib/comissoes/regrasServico";
import { formatMoneyInput, parseMoneyToNumber } from "@/lib/utils/comanda";

type Profissional = {
  id: string;
  nome: string;
  tipo_profissional?: string | null;
  assistentes_ids?: string[];
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
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (payload: ComandaItemModalPayload) => Promise<void>;
  profissionais: Profissional[];
  servicos: Servico[];
  produtos: Produto[];
};

export default function ComandaItemModal({
  open,
  onClose,
  onSave,
  profissionais,
  servicos,
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
  const [observacoes, setObservacoes] = useState("");

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

  if (!open) return null;

  async function handleSave() {
    try {
      setSaving(true);

      const quantidadeNumero = Number(quantidade || 1);
      const valorUnitarioNumero = parseMoneyToNumber(valorUnitario);

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
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-zinc-700">Tipo</label>
            <select
              value={tipoItem}
              onChange={(e) => setTipoItem(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3"
            >
              <option value="servico">Servico</option>
              <option value="produto">Produto</option>
              <option value="extra">Extra</option>
            </select>
          </div>

          {tipoItem === "servico" ? (
            <>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-zinc-700">Servico</label>
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

              <div>
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
              value={valorUnitario}
              onChange={(e) => setValorUnitario(formatMoneyInput(e.target.value))}
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
